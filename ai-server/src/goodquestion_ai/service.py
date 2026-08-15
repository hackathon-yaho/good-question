import asyncio
import json
import logging
import re
from collections.abc import Callable
from typing import Any, TypeVar

from openai import (
    APIConnectionError,
    APITimeoutError,
    AsyncOpenAI,
    InternalServerError,
    RateLimitError,
)
from openai.types.shared_params import Reasoning
from pydantic import BaseModel, ValidationError

from .config import Settings
from .errors import ModelTimeoutError, ModelUpstreamError
from .prompts import ANALYZE_DEVELOPER_PROMPT, RESPOND_DEVELOPER_PROMPT
from .schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ChildIntent,
    RespondRequest,
    RespondResponse,
    UtteranceValidity,
)

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

FORBIDDEN_RESPONSE_PATTERNS = (
    r"잘했",
    r"정답",
    r"훌륭",
    r"해결 방법을 말해",
    r"이유를 말해",
    r"그럼 그렇게 할게",
    r"이제 알겠어",
)

LOW_INFORMATION_INTENTS = {
    UtteranceValidity.SHORT: ChildIntent.SHORT_RESPONSE,
    UtteranceValidity.UNCLEAR: ChildIntent.UNCLEAR,
    UtteranceValidity.OFF_TOPIC: ChildIntent.OFF_TOPIC,
    UtteranceValidity.PLAYFUL: ChildIntent.PLAYFUL,
}

# Meaningless single-phrase refusal or hostility must never be left to model
# variance: these messages cannot satisfy a scene criterion and should not
# consume a meaningful dialogue turn in the backend.
LOW_ENGAGEMENT_UTTERANCES = frozenset(
    {
        "싫어",
        "싫어요",
        "말하기싫어",
        "말하기싫어요",
        "하기싫어",
        "하기싫어요",
        "몰라",
        "모르겠어",
        "닥쳐",
        "닥쳐라",
        "시끄러워",
        "꺼져",
    }
)

# The product decision is a 10-second deadline, including the initial request,
# with at most three total attempts.  The SDK must not add hidden retries.
MAX_MODEL_ATTEMPTS = 3
ATTEMPT_TIMEOUT_SECONDS = 3.0
RETRY_BACKOFF_SECONDS = (0.1, 0.2)


class _RetryableModelOutputError(Exception):
    """A completed model request whose structured output cannot be used."""


class OpenAIService:
    """Stateless OpenAI Responses client for analysis and character dialogue only."""

    def __init__(self, settings: Settings, client: Any | None = None) -> None:
        self._settings = settings
        self._client = client or AsyncOpenAI(
            api_key=settings.openai_api_key.get_secret_value(),
            timeout=settings.openai_timeout_seconds,
            max_retries=0,
        )

    async def analyze(self, request: AnalyzeRequest, request_id: str) -> AnalyzeResponse:
        known_low_engagement = self._known_low_engagement_analysis(request.childUtterance)
        if known_low_engagement is not None:
            logger.info("known_low_engagement operation=analyze request_id=%s", request_id)
            return known_low_engagement

        result = await self._parse(
            prompt=ANALYZE_DEVELOPER_PROMPT,
            payload=request.model_dump(mode="json"),
            response_model=AnalyzeResponse,
            max_output_tokens=self._settings.analyze_max_output_tokens,
            operation="analyze",
            request_id=request_id,
        )
        return self._filter_analysis(result, request)

    async def respond(self, request: RespondRequest, request_id: str) -> RespondResponse:
        result = await self._parse(
            prompt=RESPOND_DEVELOPER_PROMPT,
            payload=request.model_dump(mode="json"),
            response_model=RespondResponse,
            max_output_tokens=self._settings.respond_max_output_tokens,
            operation="respond",
            request_id=request_id,
            result_is_acceptable=lambda result: self._is_safe_character_line(result.text),
        )
        return result

    async def _parse(
        self,
        *,
        prompt: str,
        payload: dict[str, Any],
        response_model: type[T],
        max_output_tokens: int,
        operation: str,
        request_id: str,
        result_is_acceptable: Callable[[T], bool] | None = None,
    ) -> T:
        reasoning: Reasoning = {"effort": self._settings.openai_reasoning_effort}
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self._settings.openai_timeout_seconds
        last_error: ModelTimeoutError | ModelUpstreamError | None = None
        last_cause: Exception | None = None

        for attempt in range(1, MAX_MODEL_ATTEMPTS + 1):
            remaining = deadline - loop.time()
            if remaining <= 0:
                raise ModelTimeoutError from last_error

            try:
                response = await asyncio.wait_for(
                    self._client.responses.parse(
                        model=self._settings.openai_model,
                        instructions=prompt,
                        input=json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                        text_format=response_model,
                        max_output_tokens=max_output_tokens,
                        reasoning=reasoning,
                        store=False,
                    ),
                    timeout=min(ATTEMPT_TIMEOUT_SECONDS, remaining),
                )
                parsed = getattr(response, "output_parsed", None)
                if parsed is None:
                    raise _RetryableModelOutputError("empty_output")
                result = (
                    parsed
                    if isinstance(parsed, response_model)
                    else response_model.model_validate(parsed)
                )
                if result_is_acceptable is not None and not result_is_acceptable(result):
                    raise _RetryableModelOutputError("unsafe_output")
            except (TimeoutError, APITimeoutError) as exc:
                last_error = ModelTimeoutError()
                last_cause = exc
                error_kind = "timeout"
            except (
                APIConnectionError,
                InternalServerError,
                RateLimitError,
                ValidationError,
                _RetryableModelOutputError,
            ) as exc:
                last_error = ModelUpstreamError()
                last_cause = exc
                error_kind = "upstream"
            except Exception as exc:
                logger.warning(
                    "model_non_retryable_error operation=%s request_id=%s error_type=%s",
                    operation,
                    request_id,
                    type(exc).__name__,
                )
                raise ModelUpstreamError from exc
            else:
                logger.info(
                    "model_completed operation=%s request_id=%s model=%s attempt=%s",
                    operation,
                    request_id,
                    self._settings.openai_model,
                    attempt,
                )
                return result

            if attempt == MAX_MODEL_ATTEMPTS:
                logger.warning(
                    "model_failed operation=%s request_id=%s error_kind=%s attempts=%s",
                    operation,
                    request_id,
                    error_kind,
                    attempt,
                )
                raise last_error from last_cause

            delay = min(RETRY_BACKOFF_SECONDS[attempt - 1], max(0.0, deadline - loop.time()))
            if delay <= 0:
                raise ModelTimeoutError from last_cause
            logger.warning(
                "model_retry operation=%s request_id=%s error_kind=%s next_attempt=%s",
                operation,
                request_id,
                error_kind,
                attempt + 1,
            )
            await asyncio.sleep(delay)

        raise ModelTimeoutError

    @staticmethod
    def _filter_analysis(result: AnalyzeResponse, request: AnalyzeRequest) -> AnalyzeResponse:
        """Reject non-verbatim or low-information analysis before the backend sees it."""
        if result.utteranceValidity is not UtteranceValidity.VALID:
            return result.model_copy(
                update={
                    "childIntent": LOW_INFORMATION_INTENTS[result.utteranceValidity],
                    "mainPoint": None,
                    "detectedElements": [],
                }
            )

        allowed = set(request.targetElements)
        seen = set()
        filtered = []
        for item in result.detectedElements:
            if item.type not in allowed or item.type in seen:
                continue
            if item.evidence not in request.childUtterance:
                continue
            seen.add(item.type)
            filtered.append(item)
        return result.model_copy(update={"detectedElements": filtered})

    @staticmethod
    def _known_low_engagement_analysis(child_utterance: str) -> AnalyzeResponse | None:
        normalized = re.sub(r"[\s\W_]+", "", child_utterance)
        if normalized not in LOW_ENGAGEMENT_UTTERANCES:
            return None
        return AnalyzeResponse(
            childIntent=ChildIntent.SHORT_RESPONSE,
            mainPoint=None,
            detectedElements=[],
            utteranceValidity=UtteranceValidity.SHORT,
        )

    @staticmethod
    def _is_safe_character_line(text: str) -> bool:
        return not any(
            re.search(pattern, text, flags=re.IGNORECASE)
            for pattern in FORBIDDEN_RESPONSE_PATTERNS
        )
