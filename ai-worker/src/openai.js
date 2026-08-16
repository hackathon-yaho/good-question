import { ContractError } from "./validation.js";

export class ModelTimeoutError extends Error {
  constructor(reason = "TOTAL_TIMEOUT") {
    super(reason);
    this.reason = reason;
  }
}

export class ModelUpstreamError extends Error {
  constructor(reason = "OPENAI_UNKNOWN") {
    super(reason);
    this.reason = reason;
  }
}

class NonRetryableModelError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

// A dialogue attempt may use up to 10 seconds. Ten attempts plus bounded
// backoff fit inside this Worker deadline; the backend waits 105 seconds.
export const DIALOGUE_RETRY_POLICY = Object.freeze({
  maxAttempts: 10,
  totalTimeoutMs: 102_000,
  attemptTimeoutMs: 10_000,
});

function retryBackoffMs(attempt) {
  // Fast transient failures (429/5xx/invalid model JSON) should be retried
  // promptly, but never in a tight loop.
  return Math.min(attempt * 50, 250);
}

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
    throw new ModelUpstreamError("MODEL_OUTPUT_MISSING");
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
  throw new ModelUpstreamError("MODEL_OUTPUT_TEXT_MISSING");
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

function retryReason(error, timedOut) {
  if (timedOut) return "ATTEMPT_TIMEOUT";
  if (error instanceof ContractError) return "MODEL_OUTPUT_CONTRACT";
  if (error instanceof SyntaxError) return "MODEL_OUTPUT_JSON";
  if (error instanceof ModelUpstreamError) return error.reason;
  return "OPENAI_NETWORK";
}

function withAttemptReasons(error, reasons) {
  error.attemptReasons = [...reasons];
  return error;
}

function totalTimeout(reasons) {
  return withAttemptReasons(new ModelTimeoutError(), [...reasons, "TOTAL_TIMEOUT"]);
}

/**
 * Calls the Responses API without SDK retries. The caller owns the total
 * deadline; this function keeps all attempts and their backoff inside it.
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
  totalTimeoutMs = DIALOGUE_RETRY_POLICY.totalTimeoutMs,
  attemptTimeoutMs = DIALOGUE_RETRY_POLICY.attemptTimeoutMs,
  maxAttempts = DIALOGUE_RETRY_POLICY.maxAttempts,
}) {
  const deadline = now() + totalTimeoutMs;
  let lastError = null;
  const attemptReasons = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const remaining = deadline - now();
    if (remaining <= 0) {
      throw totalTimeout(attemptReasons);
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
          throw new ModelUpstreamError(`OPENAI_STATUS_${response.status}`);
        }
        throw new NonRetryableModelError(`OPENAI_STATUS_${response.status}`);
      }
      const responsePayload = await response.json();
      if (responsePayload.status && responsePayload.status !== "completed") {
        throw new ModelUpstreamError(`OPENAI_NOT_COMPLETED_${responsePayload.status}`);
      }
      const output = validate(JSON.parse(modelOutputText(responsePayload)));
      return output;
    } catch (error) {
      const timedOut = error?.name === "AbortError";
      if (error instanceof NonRetryableModelError) {
        throw withAttemptReasons(new ModelUpstreamError(error.reason), [...attemptReasons, error.reason]);
      }
      const retryable = timedOut || error instanceof ContractError || error instanceof SyntaxError || error instanceof ModelUpstreamError;
      if (!retryable) {
        attemptReasons.push("OPENAI_NETWORK");
        throw withAttemptReasons(new ModelUpstreamError("OPENAI_NETWORK"), attemptReasons);
      }
      const reason = retryReason(error, timedOut);
      attemptReasons.push(reason);
      lastError = withAttemptReasons(
        timedOut ? new ModelTimeoutError(reason) : new ModelUpstreamError(reason),
        attemptReasons,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (attempt === maxAttempts) {
      throw lastError ?? new ModelUpstreamError();
    }
    const backoff = Math.min(retryBackoffMs(attempt), Math.max(0, deadline - now()));
    if (backoff <= 0) {
      throw totalTimeout(attemptReasons);
    }
    await sleep(backoff);
  }

  throw totalTimeout(attemptReasons);
}
