import { ContractError } from "./validation.js";

export class ModelTimeoutError extends Error {}
export class ModelUpstreamError extends Error {}
class NonRetryableModelError extends Error {}

const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [100, 200];

const analyzeSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    childIntent: { type: "string", enum: ["QUESTION", "OPINION", "REASONING", "SOLUTION", "DECISION", "PERSPECTIVE", "EMOTION", "REQUEST", "CHALLENGE", "PLAYFUL", "OFF_TOPIC", "SHORT_RESPONSE", "UNCLEAR"] },
    mainPoint: { anyOf: [{ type: "string" }, { type: "null" }] },
    detectedElements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: ["DECISION", "REASON", "PERSPECTIVE", "SOLUTION", "RESULT", "EMOTION", "EMPATHY", "REQUEST"] },
          evidence: { type: "string" },
        },
        required: ["type", "evidence"],
      },
    },
    utteranceValidity: { type: "string", enum: ["VALID", "SHORT", "UNCLEAR", "OFF_TOPIC", "PLAYFUL"] },
  },
  required: ["childIntent", "mainPoint", "detectedElements", "utteranceValidity"],
};

const respondSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string" },
    characterState: { type: "string", enum: ["NEUTRAL", "HAPPY", "WORRIED", "SURPRISED", "MOVED"] },
  },
  required: ["text", "characterState"],
};

const reportCardSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    feature: { type: "string" },
    evidenceIndex: { anyOf: [{ type: "integer" }, { type: "null" }] },
    strength: { type: "string" },
    next: { type: "string" },
  },
  required: ["name", "feature", "evidenceIndex", "strength", "next"],
};

const reportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    competencies: { type: "array", items: reportCardSchema },
    representativeIndex: { type: "integer" },
    representativeReason: { type: "string" },
    storyQuestions: { type: "array", items: { type: "string" } },
    dailyQuestions: { type: "array", items: { type: "string" } },
  },
  required: ["competencies", "representativeIndex", "representativeReason", "storyQuestions", "dailyQuestions"],
};

export function outputSchema(operation) {
  if (operation === "analyze") {
    return { type: "json_schema", name: "goodquestion_analyze", schema: analyzeSchema, strict: true };
  }
  if (operation === "respond") {
    return { type: "json_schema", name: "goodquestion_respond", schema: respondSchema, strict: true };
  }
  return { type: "json_schema", name: "goodquestion_report", schema: reportSchema, strict: true };
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function modelOutputText(payload) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }
  if (!Array.isArray(payload.output)) {
    throw new ModelUpstreamError("OpenAI 응답에 출력이 없습니다.");
  }
  for (const item of payload.output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }
    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }
  throw new ModelUpstreamError("OpenAI 응답에 텍스트가 없습니다.");
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

/**
 * Calls the Responses API without SDK retries. The caller owns the total
 * deadline; this function keeps all three attempts and their backoff inside it.
 */
export async function requestStructuredOutput({
  env,
  operation,
  prompt,
  payload,
  maxOutputTokens,
  validate,
  fetcher = fetch,
  now = Date.now,
  sleep = delay,
  totalTimeoutMs = 10_000,
  attemptTimeoutMs = 3_000,
}) {
  const deadline = now() + totalTimeoutMs;
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const remaining = deadline - now();
    if (remaining <= 0) {
      throw new ModelTimeoutError();
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(attemptTimeoutMs, remaining));
    try {
      const response = await fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-5-mini",
          instructions: prompt,
          input: JSON.stringify(payload),
          text: { format: outputSchema(operation) },
          max_output_tokens: maxOutputTokens,
          reasoning: { effort: env.OPENAI_REASONING_EFFORT || "minimal" },
          store: false,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (isRetryableStatus(response.status)) {
          throw new ModelUpstreamError("일시적인 OpenAI 오류입니다.");
        }
        throw new NonRetryableModelError("OpenAI 요청이 거절되었습니다.");
      }
      const responsePayload = await response.json();
      if (responsePayload.status && responsePayload.status !== "completed") {
        throw new ModelUpstreamError("OpenAI 응답이 완료되지 않았습니다.");
      }
      const output = validate(JSON.parse(modelOutputText(responsePayload)));
      return output;
    } catch (error) {
      const timedOut = error?.name === "AbortError";
      if (error instanceof NonRetryableModelError) {
        throw new ModelUpstreamError();
      }
      const retryable = timedOut || error instanceof ContractError || error instanceof SyntaxError || error instanceof ModelUpstreamError;
      if (!retryable) {
        throw new ModelUpstreamError();
      }
      lastError = timedOut ? new ModelTimeoutError() : new ModelUpstreamError();
    } finally {
      clearTimeout(timeout);
    }

    if (attempt === MAX_ATTEMPTS) {
      throw lastError ?? new ModelUpstreamError();
    }
    const backoff = Math.min(RETRY_BACKOFF_MS[attempt - 1], Math.max(0, deadline - now()));
    if (backoff <= 0) {
      throw new ModelTimeoutError();
    }
    await sleep(backoff);
  }

  throw new ModelTimeoutError();
}
