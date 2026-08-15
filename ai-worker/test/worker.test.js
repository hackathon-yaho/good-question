import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest } from "../src/index.js";

const env = {
  OPENAI_API_KEY: "test-openai-key",
  AI_INTERNAL_TOKEN: "test-internal-token-1234",
  OPENAI_MODEL: "gpt-5-mini",
  OPENAI_REASONING_EFFORT: "minimal",
};

function analyzePayload(childUtterance = "창피해서 계속 참았던 것 같아요.") {
  return {
    sceneContext: "며느리는 몸이 힘들지만 가족에게 말하지 못하고 있다.",
    goal: "며느리의 입장을 이해하고 솔직하게 말할 용기를 준다.",
    previousCharacterMessage: "내 방귀를 이상하게 생각하지 않을까?",
    childUtterance,
    targetElements: ["PERSPECTIVE", "EMOTION"],
    elementCriteria: {
      PERSPECTIVE: "며느리의 입장에서 상황을 헤아린 경우",
      EMOTION: "감정어가 직접 나타난 경우",
    },
  };
}

function respondPayload() {
  return {
    characterName: "며느리",
    characterPersona: "조심스럽고 걱정이 많은 말투",
    sceneContext: "가족에게 사실을 말할지 걱정하고 있다.",
    previousCharacterMessage: "가족들이 나를 이상하게 생각하지 않을까?",
    childUtterance: "아프면 솔직하게 말하는 게 좋아요.",
    analysis: { childIntent: "OPINION", mainPoint: "솔직하게 말하라는 의견" },
    responseMode: "GUIDED",
    reactionKey: "disagreement",
    guidanceTarget: "REASON",
    remainingWorry: "왜 꼭 말해야 하는지 나는 아직 잘 모르겠어.",
  };
}

function request(path, body, headers = {}) {
  return new Request(`https://goodquestion-ai.example${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function openAiResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("health is public and exposes the deployed prompt versions", async () => {
  const response = await handleRequest(request("/health"), env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    model: "gpt-5-mini",
    promptVersions: { analyze: "analyze_v3", respond: "respond_v8" },
  });
});

test("analyze requires the shared internal token", async () => {
  const response = await handleRequest(request("/analyze", analyzePayload()), env);

  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "UNAUTHORIZED");
});

test("known low-engagement utterances skip the OpenAI call", async () => {
  let called = false;
  const response = await handleRequest(
    request("/analyze", analyzePayload("닥쳐!!!"), { "X-Internal-Token": env.AI_INTERNAL_TOKEN }),
    env,
    { openaiFetch: async () => { called = true; throw new Error("must not run"); } },
  );

  assert.equal(response.status, 200);
  assert.equal(called, false);
  assert.deepEqual(await response.json(), {
    childIntent: "SHORT_RESPONSE",
    mainPoint: null,
    detectedElements: [],
    utteranceValidity: "SHORT",
  });
});

test("analyze preserves request ID and filters hallucinated or duplicate evidence", async () => {
  const response = await handleRequest(
    request("/analyze", analyzePayload(), {
      "X-Internal-Token": env.AI_INTERNAL_TOKEN,
      "X-Request-Id": "backend-request-1",
    }),
    env,
    {
      openaiFetch: async (_url, options) => {
        const payload = JSON.parse(options.body);
        assert.equal(payload.model, "gpt-5-mini");
        assert.equal(payload.store, false);
        assert.equal(payload.max_output_tokens, 200);
        assert.equal(payload.reasoning.effort, "minimal");
        assert.equal(payload.text.format.type, "json_schema");
        assert.equal(payload.text.format.strict, true);
        assert.equal(payload.text.format.schema.type, "object");
        return openAiResponse({
          status: "completed",
          output_text: JSON.stringify({
            childIntent: "PERSPECTIVE",
            mainPoint: "창피해서 참는다",
            detectedElements: [
              { type: "PERSPECTIVE", evidence: "창피해서" },
              { type: "PERSPECTIVE", evidence: "계속 참았던" },
              { type: "EMOTION", evidence: "부끄러워서" },
            ],
            utteranceValidity: "VALID",
          }),
        });
      },
    },
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Request-Id"), "backend-request-1");
  assert.deepEqual((await response.json()).detectedElements, [
    { type: "PERSPECTIVE", evidence: "창피해서" },
  ]);
});

test("GUIDED requires both guidance fields and never calls OpenAI when invalid", async () => {
  const payload = respondPayload();
  payload.remainingWorry = null;
  const response = await handleRequest(
    request("/respond", payload, { "X-Internal-Token": env.AI_INTERNAL_TOKEN }),
    env,
    { openaiFetch: async () => { throw new Error("must not run"); } },
  );

  assert.equal(response.status, 422);
  assert.equal((await response.json()).code, "INVALID_REQUEST");
});

test("NORMAL accepts omitted optional guidance fields like the current FastAPI contract", async () => {
  const payload = respondPayload();
  payload.responseMode = "NORMAL";
  delete payload.guidanceTarget;
  delete payload.remainingWorry;
  const response = await handleRequest(
    request("/respond", payload, { "X-Internal-Token": env.AI_INTERNAL_TOKEN }),
    env,
    {
      openaiFetch: async () => openAiResponse({
        status: "completed",
        output_text: JSON.stringify({ text: "네 말도 맞지만 아직 조금 걱정이 남아.", characterState: "WORRIED" }),
      }),
    },
  );

  assert.equal(response.status, 200);
});

test("respond sends the current schema and rejects unsafe output before retrying", async () => {
  let calls = 0;
  const response = await handleRequest(
    request("/respond", respondPayload(), { "X-Internal-Token": env.AI_INTERNAL_TOKEN }),
    env,
    {
      openaiFetch: async (_url, options) => {
        calls += 1;
        const payload = JSON.parse(options.body);
        assert.equal(payload.max_output_tokens, 80);
        assert.equal(payload.store, false);
        if (calls === 1) {
          return openAiResponse({
            status: "completed",
            output_text: JSON.stringify({ text: "잘했어!", characterState: "HAPPY" }),
          });
        }
        return openAiResponse({
          status: "completed",
          output_text: JSON.stringify({ text: "가족들이 놀랄까 봐 아직 말할 용기가 안 나.", characterState: "WORRIED" }),
        });
      },
      sleep: async () => {},
    },
  );

  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.deepEqual(await response.json(), {
    text: "가족들이 놀랄까 봐 아직 말할 용기가 안 나.",
    characterState: "WORRIED",
  });
});

test("three request timeouts are returned as a stable 504", async () => {
  const response = await handleRequest(
    request("/analyze", analyzePayload(), { "X-Internal-Token": env.AI_INTERNAL_TOKEN }),
    env,
    {
      openaiFetch: async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      },
      sleep: async () => {},
    },
  );

  assert.equal(response.status, 504);
  assert.equal((await response.json()).code, "MODEL_TIMEOUT");
});
