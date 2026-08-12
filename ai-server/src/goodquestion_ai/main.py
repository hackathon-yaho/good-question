import logging
import secrets
import time
import uuid
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager
from typing import Annotated, Any

import uvicorn
from fastapi import Depends, FastAPI, Header, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .config import Settings, get_settings
from .errors import ModelTimeoutError, ModelUpstreamError
from .prompts import ANALYZE_PROMPT_VERSION, RESPOND_PROMPT_VERSION
from .schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    HealthResponse,
    RespondRequest,
    RespondResponse,
)
from .service import OpenAIService

logger = logging.getLogger(__name__)


def _request_id(request: Request) -> str:
    return str(getattr(request.state, "request_id", "unknown"))


def create_app(
    settings: Settings | None = None,
    service: OpenAIService | Any | None = None,
) -> FastAPI:
    resolved_settings = settings or get_settings()
    logging.basicConfig(
        level=resolved_settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):  # type: ignore[no-untyped-def]
        app.state.ai_service = service or OpenAIService(resolved_settings)
        yield

    app = FastAPI(title="GoodQuestion AI", version="0.1.0", lifespan=lifespan)

    @app.middleware("http")
    async def request_context(
        request: Request,
        call_next: Callable[[Request], Awaitable[Any]],
    ) -> Any:
        incoming = request.headers.get("X-Request-Id", "").strip()
        request.state.request_id = incoming[:128] if incoming else str(uuid.uuid4())
        started = time.perf_counter()
        response = await call_next(request)
        response.headers["X-Request-Id"] = request.state.request_id
        logger.info(
            "request_completed request_id=%s method=%s path=%s status=%s duration_ms=%d",
            request.state.request_id,
            request.method,
            request.url.path,
            response.status_code,
            round((time.perf_counter() - started) * 1_000),
        )
        return response

    async def verify_internal_token(
        x_internal_token: Annotated[str | None, Header(alias="X-Internal-Token")] = None,
    ) -> None:
        expected = resolved_settings.internal_token.get_secret_value()
        if x_internal_token is None or not secrets.compare_digest(x_internal_token, expected):
            raise UnauthorizedError

    @app.exception_handler(UnauthorizedError)
    async def unauthorized_handler(request: Request, _exc: UnauthorizedError) -> JSONResponse:
        return JSONResponse(
            status_code=401,
            content={
                "code": "UNAUTHORIZED",
                "message": "유효한 내부 호출 토큰이 필요합니다.",
                "requestId": _request_id(request),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {
                "location": ".".join(str(part) for part in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "code": "INVALID_REQUEST",
                "message": "요청 형식이 AI 계약과 맞지 않습니다.",
                "requestId": _request_id(request),
                "errors": errors,
            },
        )

    @app.exception_handler(ModelTimeoutError)
    async def timeout_handler(request: Request, _exc: ModelTimeoutError) -> JSONResponse:
        return JSONResponse(
            status_code=504,
            content={
                "code": "MODEL_TIMEOUT",
                "message": "모델 응답 제한 시간을 초과했습니다.",
                "requestId": _request_id(request),
            },
        )

    @app.exception_handler(ModelUpstreamError)
    async def upstream_handler(request: Request, _exc: ModelUpstreamError) -> JSONResponse:
        return JSONResponse(
            status_code=502,
            content={
                "code": "MODEL_UPSTREAM_ERROR",
                "message": "모델 응답을 생성하지 못했습니다.",
                "requestId": _request_id(request),
            },
        )

    @app.get("/health", response_model=HealthResponse)
    async def health() -> HealthResponse:
        return HealthResponse(
            status="ok",
            model=resolved_settings.openai_model,
            promptVersions={"analyze": ANALYZE_PROMPT_VERSION, "respond": RESPOND_PROMPT_VERSION},
        )

    @app.post(
        "/analyze",
        response_model=AnalyzeResponse,
        dependencies=[Depends(verify_internal_token)],
    )
    async def analyze(request: Request, body: AnalyzeRequest) -> AnalyzeResponse:
        ai_service: OpenAIService = request.app.state.ai_service
        return await ai_service.analyze(body, _request_id(request))

    @app.post(
        "/respond",
        response_model=RespondResponse,
        dependencies=[Depends(verify_internal_token)],
    )
    async def respond(request: Request, body: RespondRequest) -> RespondResponse:
        ai_service: OpenAIService = request.app.state.ai_service
        return await ai_service.respond(body, _request_id(request))

    return app


class UnauthorizedError(Exception):
    pass


app = create_app()


def run() -> None:
    uvicorn.run("goodquestion_ai.main:app", host="0.0.0.0", port=8000)
