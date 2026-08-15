import json
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

import pytest

from goodquestion_ai.config import Settings
from goodquestion_ai.errors import ModelTimeoutError, ModelUpstreamError
from goodquestion_ai.schemas import AnalyzeRequest, AnalyzeResponse, RespondRequest, RespondResponse
from goodquestion_ai.service import OpenAIService


class FakeResponses:
    def __init__(self, output_text: str) -> None:
        self.output_text = output_text
        self.calls: list[dict[str, Any]] = []

    async def parse(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        return SimpleNamespace(output_parsed=json.loads(self.output_text))


class FakeOpenAI:
    def __init__(self, output_text: str) -> None:
        self.responses = FakeResponses(output_text)


class SequenceResponses:
    def __init__(self, outcomes: list[str | Exception]) -> None:
        self.outcomes = outcomes
        self.calls: list[dict[str, Any]] = []

    async def parse(self, **kwargs: Any) -> Any:
        self.calls.append(kwargs)
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return SimpleNamespace(output_parsed=json.loads(outcome))


class SequenceOpenAI:
    def __init__(self, outcomes: list[str | Exception]) -> None:
        self.responses = SequenceResponses(outcomes)


def settings() -> Settings:
    return Settings(openai_api_key="test-openai-key", internal_token="test-internal-token-1234")


def analyze_request() -> AnalyzeRequest:
    return AnalyzeRequest.model_validate(
        {
            "sceneContext": "며느리는 방귀를 참고 있다.",
            "goal": "입장을 이해시킨다.",
            "previousCharacterMessage": "말해도 될까?",
            "childUtterance": "창피해서 계속 참아야 할 것 같아.",
            "targetElements": ["PERSPECTIVE", "EMOTION"],
            "elementCriteria": {"PERSPECTIVE": "입장을 알아림", "EMOTION": "감정이 직접 있음"},
        }
    )


def respond_request() -> RespondRequest:
    return RespondRequest.model_validate(
        {
            "characterName": "며느리",
            "characterPersona": "조심스러운 말투",
            "sceneContext": "가족에게 말할지 걱정한다.",
            "previousCharacterMessage": "말해도 될까?",
            "childUtterance": "괜찮아요.",
            "analysis": {"childIntent": "OPINION", "mainPoint": "괜찮다는 의견"},
            "responseMode": "NORMAL",
            "reactionKey": "directResponse",
        }
    )


def test_client_disables_sdk_retries() -> None:
    with patch("goodquestion_ai.service.AsyncOpenAI") as client_constructor:
        OpenAIService(settings())

    assert client_constructor.call_args.kwargs == {
        "api_key": "test-openai-key",
        "timeout": 10.0,
        "max_retries": 0,
    }


async def test_analysis_filters_hallucinated_evidence_and_duplicate_types() -> None:
    parsed = {
        "childIntent": "PERSPECTIVE",
        "mainPoint": "창피해서 참는다",
        "detectedElements": [
            {"type": "PERSPECTIVE", "evidence": "창피해서"},
            {"type": "PERSPECTIVE", "evidence": "계속 참아야"},
            {"type": "EMOTION", "evidence": "부끄러워서"},
        ],
        "utteranceValidity": "VALID",
    }
    client = FakeOpenAI(AnalyzeResponse.model_validate(parsed).model_dump_json())
    service = OpenAIService(settings(), client=client)

    result = await service.analyze(analyze_request(), "request-1")

    assert [item.model_dump() for item in result.detectedElements] == [
        {"type": "PERSPECTIVE", "evidence": "창피해서"}
    ]


@pytest.mark.parametrize(
    ("validity", "expected_intent"),
    [
        ("SHORT", "SHORT_RESPONSE"),
        ("UNCLEAR", "UNCLEAR"),
        ("OFF_TOPIC", "OFF_TOPIC"),
        ("PLAYFUL", "PLAYFUL"),
    ],
)
async def test_analysis_forces_empty_result_for_low_information(
    validity: str,
    expected_intent: str,
) -> None:
    parsed = {
        "childIntent": "SHORT_RESPONSE",
        "mainPoint": "억지 요약",
        "detectedElements": [{"type": "PERSPECTIVE", "evidence": "창피해서"}],
        "utteranceValidity": validity,
    }
    client = FakeOpenAI(AnalyzeResponse.model_validate(parsed).model_dump_json())
    service = OpenAIService(settings(), client=client)

    result = await service.analyze(analyze_request(), "request-low")

    assert result.childIntent.value == expected_intent
    assert result.mainPoint is None
    assert result.detectedElements == []


async def test_model_call_uses_stateless_structured_output() -> None:
    parsed = {
        "childIntent": "PERSPECTIVE",
        "mainPoint": "창피해서 참는다",
        "detectedElements": [],
        "utteranceValidity": "VALID",
    }
    client = FakeOpenAI(AnalyzeResponse.model_validate(parsed).model_dump_json())
    service = OpenAIService(settings(), client=client)

    await service.analyze(analyze_request(), "request-2")

    call = client.responses.calls[0]
    assert call["model"] == "gpt-5-mini"
    assert call["store"] is False
    assert call["instructions"]
    assert call["max_output_tokens"] == 200
    assert call["reasoning"] == {"effort": "minimal"}
    assert call["text_format"] is AnalyzeResponse
    assert "previous_response_id" not in call
    assert "conversation" not in call


@pytest.mark.parametrize("line", ["잘했어!", "그럼 그렇게 할게.", "해결 방법을 말해 봐."])
async def test_response_rejects_unsafe_character_lines(line: str) -> None:
    client = FakeOpenAI(
        RespondResponse(text=line, characterState="NEUTRAL").model_dump_json()
    )
    service = OpenAIService(settings(), client=client)

    with pytest.raises(ModelUpstreamError):
        await service.respond(respond_request(), "request-unsafe")


async def test_response_rejects_incomplete_character_lines() -> None:
    client = FakeOpenAI(
        json.dumps({"text": "문장 중간에서 끝난 응답", "characterState": "NEUTRAL"})
    )
    service = OpenAIService(settings(), client=client)

    with pytest.raises(ModelUpstreamError):
        await service.respond(respond_request(), "request-incomplete")


async def test_retries_transient_model_failure_until_a_valid_response_arrives() -> None:
    parsed = {
        "childIntent": "PERSPECTIVE",
        "mainPoint": "창피해서 참는다",
        "detectedElements": [],
        "utteranceValidity": "VALID",
    }
    client = SequenceOpenAI(
        [
            TimeoutError(),
            TimeoutError(),
            AnalyzeResponse.model_validate(parsed).model_dump_json(),
        ]
    )
    service = OpenAIService(settings(), client=client)

    result = await service.analyze(analyze_request(), "request-retry-success")

    assert result.mainPoint == "창피해서 참는다"
    assert len(client.responses.calls) == 3


async def test_returns_timeout_only_after_three_total_attempts() -> None:
    client = SequenceOpenAI([TimeoutError(), TimeoutError(), TimeoutError()])
    service = OpenAIService(settings(), client=client)

    with pytest.raises(ModelTimeoutError):
        await service.analyze(analyze_request(), "request-retry-timeout")

    assert len(client.responses.calls) == 3
