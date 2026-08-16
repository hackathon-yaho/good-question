import {
  ANALYZE_DEVELOPER_PROMPT,
  ANALYZE_PROMPT_VERSION,
  REPORT_DEVELOPER_PROMPT,
  REPORT_PROMPT_VERSION,
  RESPOND_DEVELOPER_PROMPT,
  RESPOND_PROMPT_VERSION,
} from "./constants.js";
import { ModelTimeoutError, ModelUpstreamError, requestStructuredOutput } from "./openai.js";
import {
  ContractError,
  filterAnalysis,
  knownLowEngagementAnalysis,
  validateAnalyzeRequest,
  validateAnalyzeResponse,
  validateReportRequest,
  validateReportResponse,
  validateRespondRequest,
  validateRespondResponse,
} from "./validation.js";

function json(body, status = 200, requestId) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  if (requestId) {
    headers.set("X-Request-Id", requestId);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function requestIdFor(request) {
  const incoming = request.headers.get("X-Request-Id")?.trim();
  return incoming ? incoming.slice(0, 128) : crypto.randomUUID();
}

function logFailure(operation, code, requestId, reason) {
  // Keep operational logs useful without retaining children’s utterances or any secret.
  const event = { event: "ai_worker_failure", operation, code, requestId };
  if (reason) {
    event.reason = reason;
  }
  console.warn(JSON.stringify(event));
}

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function unauthorized(requestId) {
  return json(
    {
      code: "UNAUTHORIZED",
      message: "유효한 내부 호출 토큰이 필요합니다.",
      requestId,
    },
    401,
    requestId,
  );
}

function invalidRequest(error, requestId) {
  return json(
    {
      code: "INVALID_REQUEST",
      message: "요청 형식이 AI 계약과 맞지 않습니다.",
      requestId,
      errors: [{ location: error.location ?? "body", message: error.message, type: "contract_error" }],
    },
    422,
    requestId,
  );
}

function modelFailure(error, requestId) {
  if (error instanceof ModelTimeoutError) {
    return json(
      { code: "MODEL_TIMEOUT", message: "모델 응답 제한 시간을 초과했습니다.", requestId },
      504,
      requestId,
    );
  }
  return json(
    { code: "MODEL_UPSTREAM_ERROR", message: "모델 응답을 생성하지 못했습니다.", requestId },
    502,
    requestId,
  );
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new ContractError("body", "JSON 요청 본문이 필요합니다.");
  }
}

export async function handleRequest(request, env, dependencies = {}) {
  const requestId = requestIdFor(request);
  const url = new URL(request.url);
  const operation = url.pathname.slice(1);

  if (request.method === "GET" && url.pathname === "/health") {
    return json(
      {
        status: "ok",
        model: env.OPENAI_MODEL || "gpt-5-mini",
        promptVersions: {
          analyze: ANALYZE_PROMPT_VERSION,
          respond: RESPOND_PROMPT_VERSION,
          report: REPORT_PROMPT_VERSION,
        },
      },
      200,
      requestId,
    );
  }
  if (request.method !== "POST" || !["/analyze", "/respond", "/report"].includes(url.pathname)) {
    return json({ code: "NOT_FOUND", message: "요청 경로를 찾을 수 없습니다.", requestId }, 404, requestId);
  }
  if (!constantTimeEqual(request.headers.get("X-Internal-Token"), env.AI_INTERNAL_TOKEN)) {
    logFailure(operation, "UNAUTHORIZED", requestId);
    return unauthorized(requestId);
  }

  try {
    const raw = await readJson(request);
    if (url.pathname === "/analyze") {
      const body = validateAnalyzeRequest(raw);
      const known = knownLowEngagementAnalysis(body.childUtterance);
      if (known) {
        return json(known, 200, requestId);
      }
      const result = await requestStructuredOutput({
        env,
        operation: "analyze",
        prompt: ANALYZE_DEVELOPER_PROMPT,
        payload: body,
        maxOutputTokens: 200,
        validate: validateAnalyzeResponse,
        fetcher: dependencies.openaiFetch ?? fetch,
        now: dependencies.now,
        sleep: dependencies.sleep,
      });
      return json(filterAnalysis(result, body), 200, requestId);
    }

    if (url.pathname === "/respond") {
      const body = validateRespondRequest(raw);
      const result = await requestStructuredOutput({
        env,
        operation: "respond",
        prompt: RESPOND_DEVELOPER_PROMPT,
        payload: body,
        maxOutputTokens: 80,
        validate: validateRespondResponse,
        fetcher: dependencies.openaiFetch ?? fetch,
        now: dependencies.now,
        sleep: dependencies.sleep,
      });
      return json(result, 200, requestId);
    }

    const body = validateReportRequest(raw);
    const result = await requestStructuredOutput({
      env,
      operation: "report",
      prompt: REPORT_DEVELOPER_PROMPT,
      payload: body,
      maxOutputTokens: 900,
      totalTimeoutMs: 60_000,
      attemptTimeoutMs: 19_000,
      validate: (output) => validateReportResponse(output, body),
      fetcher: dependencies.openaiFetch ?? fetch,
      now: dependencies.now,
      sleep: dependencies.sleep,
    });
    return json(result, 200, requestId);
  } catch (error) {
    if (error instanceof ContractError) {
      logFailure(operation, "INVALID_REQUEST", requestId);
      return invalidRequest(error, requestId);
    }
    if (error instanceof ModelTimeoutError || error instanceof ModelUpstreamError) {
      const reason = Array.isArray(error.attemptReasons) ? error.attemptReasons.join("|") : error.reason;
      logFailure(operation, error instanceof ModelTimeoutError ? "MODEL_TIMEOUT" : "MODEL_UPSTREAM_ERROR", requestId, reason);
      return modelFailure(error, requestId);
    }
    logFailure(operation, "MODEL_UNEXPECTED_ERROR", requestId);
    return modelFailure(new ModelUpstreamError(), requestId);
  }
}

export default {
  fetch(request, env, ctx) {
    return handleRequest(request, env);
  },
};
