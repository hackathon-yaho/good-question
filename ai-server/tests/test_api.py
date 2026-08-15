from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from httpx import ASGITransport, AsyncClient

from goodquestion_ai.config import Settings
from goodquestion_ai.errors import ModelTimeoutError, ModelUpstreamError
from goodquestion_ai.main import create_app
from goodquestion_ai.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ChildIntent,
    RespondRequest,
    RespondResponse,
    UtteranceValidity,
)

TOKEN = "test-internal-token-1234"


def analyze_payload() -> dict[str, Any]:
    return {
        "sceneContext": "며느리는 몸이 힘들지만 가족에게 말하지 못하고 있다.",
        "goal": "며느리의 입장을 이해하고 솔직하게 말할 용기를 준다.",
        "previousCharacterMessage": "내 방귀를 이상하게 생각하지 않을까?",
        "childUtterance": "창피해서 계속 참았던 것 같아요.",
        "targetElements": ["PERSPECTIVE", "EMOTION"],
        "elementCriteria": {
            "PERSPECTIVE": "며느리의 입장에서 상황을 헤아린 경우",
            "EMOTION": "감정어가 직접 나타난 경우",
        },
    }


def respond_payload() -> dict[str, Any]:
    return {
        "characterName": "며느리",
        "characterPersona": "조심스럽고 걱정이 많은 말투",
        "sceneContext": "가족에게 사실을 말할지 걱정하고 있다.",
        "previousCharacterMessage": "가족들이 나를 이상하게 생각하지 않을까?",
        "childUtterance": "아프면 솔직하게 말하는 게 좋아요.",
        "analysis": {"childIntent": "OPINION", "mainPoint": "솔직하게 말하라는 의견"},
        "responseMode": "GUIDED",
        "reactionKey": "disagreement",
        "guidanceTarget": "REASON",
        "remainingWorry": "왜 꼭 말해야 하는지 나는 아직 잘 모르겠어.",
    }


class FakeService:
    async def analyze(self, request: AnalyzeRequest, request_id: str) -> AnalyzeResponse:
        return AnalyzeResponse(
            childIntent=ChildIntent.PERSPECTIVE,
            mainPoint="며느리가 창피해서 참았다",
            detectedElements=[
                {"type": "PERSPECTIVE", "evidence": "창피해서 계속 참았던 것 같아요"}
            ],
            utteranceValidity=UtteranceValidity.VALID,
        )

    async def respond(self, request: RespondRequest, request_id: str) -> RespondResponse:
        return RespondResponse(
            text="그런데 왜 꼭 말해야 하는지 아직 모르겠어.",
            characterState="WORRIED",
        )


class TimeoutService(FakeService):
    async def analyze(self, request: AnalyzeRequest, request_id: str) -> AnalyzeResponse:
        raise ModelTimeoutError


class UpstreamService(FakeService):
    async def analyze(self, request: AnalyzeRequest, request_id: str) -> AnalyzeResponse:
        raise ModelUpstreamError


@asynccontextmanager
async def make_client(service: Any | None = None) -> AsyncIterator[AsyncClient]:
    settings = Settings(openai_api_key="test-openai-key", internal_token=TOKEN)
    app = create_app(settings=settings, service=service or FakeService())
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            yield client


async def test_health_is_public_and_exposes_prompt_versions() -> None:
    async with make_client() as client:
        response = await client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "model": "gpt-5-mini",
        "promptVersions": {"analyze": "analyze_v3", "respond": "respond_v8"},
    }


async def test_analyze_requires_internal_token() -> None:
    async with make_client() as client:
        response = await client.post("/analyze", json=analyze_payload())

    assert response.status_code == 401
    assert response.json()["code"] == "UNAUTHORIZED"


async def test_analyze_contract_and_request_id_round_trip() -> None:
    async with make_client() as client:
        response = await client.post(
            "/analyze",
            headers={"X-Internal-Token": TOKEN, "X-Request-Id": "backend-request-1"},
            json=analyze_payload(),
        )

    assert response.status_code == 200
    assert response.headers["X-Request-Id"] == "backend-request-1"
    assert response.json()["detectedElements"][0]["type"] == "PERSPECTIVE"


async def test_validation_error_does_not_echo_child_utterance() -> None:
    payload = analyze_payload()
    payload["childUtterance"] = "민감한 아이 발화 원문"
    del payload["elementCriteria"]["EMOTION"]

    async with make_client() as client:
        response = await client.post("/analyze", headers={"X-Internal-Token": TOKEN}, json=payload)

    assert response.status_code == 422
    assert response.json()["code"] == "INVALID_REQUEST"
    assert "민감한 아이 발화 원문" not in response.text


async def test_guided_response_requires_guidance_material() -> None:
    payload = respond_payload()
    payload["remainingWorry"] = None

    async with make_client() as client:
        response = await client.post("/respond", headers={"X-Internal-Token": TOKEN}, json=payload)

    assert response.status_code == 422


async def test_closing_is_rejected_by_ai_contract() -> None:
    payload = respond_payload()
    payload["responseMode"] = "CLOSING"

    async with make_client() as client:
        response = await client.post("/respond", headers={"X-Internal-Token": TOKEN}, json=payload)

    assert response.status_code == 422


async def test_model_timeout_is_stable_504_error() -> None:
    async with make_client(TimeoutService()) as client:
        response = await client.post(
            "/analyze",
            headers={"X-Internal-Token": TOKEN},
            json=analyze_payload(),
        )

    assert response.status_code == 504
    assert response.json()["code"] == "MODEL_TIMEOUT"
    assert response.json()["requestId"] == response.headers["X-Request-Id"]


async def test_model_upstream_failure_is_stable_502_error() -> None:
    async with make_client(UpstreamService()) as client:
        response = await client.post(
            "/analyze",
            headers={"X-Internal-Token": TOKEN},
            json=analyze_payload(),
        )

    assert response.status_code == 502
    assert response.json()["code"] == "MODEL_UPSTREAM_ERROR"
    assert response.json()["requestId"] == response.headers["X-Request-Id"]
