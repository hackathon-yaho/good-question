import asyncio
import json
import logging
import re
from typing import Any, TypeVar

from openai import APITimeoutError, AsyncOpenAI
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
        )
        if self._is_safe_character_line(result.text):
            return result
        logger.warning("model_unsafe_response operation=respond request_id=%s", request_id)
        raise ModelUpstreamError

    async def _parse(
        self,
        *,
        prompt: str,
        payload: dict[str, Any],
        response_model: type[T],
        max_output_tokens: int,
        operation: str,
        request_id: str,
    ) -> T:
        reasoning: Reasoning = {"effort": self._settings.openai_reasoning_effort}
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
                timeout=self._settings.openai_timeout_seconds,
            )
        except (TimeoutError, APITimeoutError) as exc:
            logger.warning("model_timeout operation=%s request_id=%s", operation, request_id)
            raise ModelTimeoutError from exc
        except Exception as exc:
            logger.warning(
                "model_upstream_error operation=%s request_id=%s error_type=%s",
                operation,
                request_id,
                type(exc).__name__,
            )
            raise ModelUpstreamError from exc

        parsed = getattr(response, "output_parsed", None)
        if parsed is None:
            logger.warning("model_empty_output operation=%s request_id=%s", operation, request_id)
            raise ModelUpstreamError

        try:
            result = (
                parsed
                if isinstance(parsed, response_model)
                else response_model.model_validate(parsed)
            )
        except ValidationError as exc:
            logger.warning(
                "model_invalid_output operation=%s request_id=%s error_type=%s",
                operation,
                request_id,
                type(exc).__name__,
            )
            raise ModelUpstreamError from exc

        logger.info(
            "model_completed operation=%s request_id=%s model=%s",
            operation,
            request_id,
            self._settings.openai_model,
        )
        return result

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
    def _is_safe_character_line(text: str) -> bool:
        return not any(
            re.search(pattern, text, flags=re.IGNORECASE)
            for pattern in FORBIDDEN_RESPONSE_PATTERNS
        )
