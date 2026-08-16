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

function reportPayload() {
  return {
    storyTitle: "방귀 뀌는 며느리",
    utterances: [
      { index: 0, text: "며느리가 창피해서 그랬을 것 같아요.", sceneLabel: "장면 2", detectedTypes: ["PERSPECTIVE", "EMPATHY"] },
      { index: 1, text: "며느리가 속상했을 것 같아요.", sceneLabel: "장면 3", detectedTypes: ["EMOTION"] },
      { index: 2, text: "시아버지가 먼저 미안하다고 말해 주세요.", sceneLabel: "장면 4", detectedTypes: ["REQUEST"] },
      { index: 3, text: "방귀 바람이 세니까 배가 떨어질 수 있어요.", sceneLabel: "장면 7", detectedTypes: ["DECISION", "REASON"] },
      { index: 4, text: "안전한 곳에 내리면 모두 다치지 않아요.", sceneLabel: "장면 8", detectedTypes: ["RESULT", "SOLUTION"] },
    ],
    competencyHints: [
      { name: "관점과 공감", matched: true },
      { name: "감정 표현", matched: true },
      { name: "상호작용", matched: true },
      { name: "생각과 이유", matched: true },
      { name: "결과와 해결", matched: true },
    ],
  };
}

function reportOutput() {
  return {
    competencies: [
      { name: "관점과 공감", feature: "인물의 마음을 헤아려 생각을 이어 갔어요.", evidenceIndex: 0, strength: "다른 사람 마음을 떠올린 점이 돋보여요.", next: "등장인물 마음을 한 번 더 물어봐 주세요." },
      { name: "감정 표현", feature: "인물의 속상한 마음을 말로 살폈어요.", evidenceIndex: 1, strength: "며느리 마음을 짚어 준 점이 좋아요.", next: "그 마음이 왜 생겼는지 함께 이야기해 보세요." },
      { name: "상호작용", feature: "상대에게 건넬 말을 분명하게 떠올렸어요.", evidenceIndex: 2, strength: "누구에게 무엇을 말할지 또렷하게 생각했어요.", next: "다른 말로도 마음을 전해 볼지 물어봐 주세요." },
      { name: "생각과 이유", feature: "상황과 까닭을 이어서 설명해 보았어요.", evidenceIndex: 3, strength: "생각의 이유를 함께 말하려 한 점이 돋보여요.", next: "그 생각 뒤에 어떤 일이 생길지 함께 물어봐 주세요." },
      { name: "결과와 해결", feature: "안전한 방법과 그 뒤 모습을 함께 떠올렸어요.", evidenceIndex: 4, strength: "모두를 생각하며 방법을 찾으려 한 점이 좋아요.", next: "다른 안전한 방법도 있을지 함께 이야기해 보세요." },
    ],
    representativeIndex: 3,
    representativeReason: "상황의 까닭과 이어질 일을 자연스럽게 연결해 말했어요.",
    storyQuestions: ["방귀 뀌는 며느리에서 가장 기억에 남는 마음은 무엇이야?", "그 장면에서 다른 방법을 고른다면 어떻게 하고 싶어?"],
    dailyQuestions: ["친구 마음이 궁금했던 적에는 어떤 말을 건넸어?", "안전한 방법을 함께 찾았던 적이 있어?"],
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
    promptVersions: { analyze: "analyze_v3", respond: "respond_v8", report: "report_v1" },
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

test("report requires the shared internal token", async () => {
  const response = await handleRequest(request("/report", reportPayload()), env);

  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "UNAUTHORIZED");
});

test("report sends one structured request and returns backend-safe index references", async () => {
  const response = await handleRequest(
    request("/report", reportPayload(), { "X-Internal-Token": env.AI_INTERNAL_TOKEN }),
    env,
    {
      openaiFetch: async (_url, options) => {
        const payload = JSON.parse(options.body);
        assert.equal(payload.max_output_tokens, 900);
        assert.equal(payload.store, false);
        assert.equal(payload.text.format.type, "json_schema");
        assert.equal(payload.text.format.name, "goodquestion_report");
        assert.equal(payload.text.format.schema.type, "object");
        return openAiResponse({ status: "completed", output_text: JSON.stringify(reportOutput()) });
      },
    },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), reportOutput());
});

test("report retries when a card conflicts with the backend matched hint", async () => {
  const payload = reportPayload();
  payload.competencyHints[1].matched = false;
  const first = reportOutput();
  first.competencies[1].evidenceIndex = 1;
  const second = reportOutput();
  second.competencies[1].evidenceIndex = null;
  second.competencies[1].feature = "이번 이야기에서는 마음을 더 나누어 볼 수 있어요.";
  second.competencies[1].strength = "이야기에 자기 생각을 보태려 한 시간이 소중해요.";

  let calls = 0;
  const response = await handleRequest(
    request("/report", payload, { "X-Internal-Token": env.AI_INTERNAL_TOKEN }),
    env,
    {
      openaiFetch: async () => {
        calls += 1;
        return openAiResponse({ status: "completed", output_text: JSON.stringify(calls === 1 ? first : second) });
      },
      sleep: async () => {},
    },
  );

  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.equal((await response.json()).competencies[1].evidenceIndex, null);
});

test("report retries instead of returning a deficit statement to a guardian", async () => {
  const first = reportOutput();
  first.competencies[1].feature = "감정을 말한 내용은 없어요.";
  const second = reportOutput();
  let calls = 0;
  const response = await handleRequest(
    request("/report", reportPayload(), { "X-Internal-Token": env.AI_INTERNAL_TOKEN }),
    env,
    {
      openaiFetch: async () => {
        calls += 1;
        return openAiResponse({ status: "completed", output_text: JSON.stringify(calls === 1 ? first : second) });
      },
      sleep: async () => {},
    },
  );

  assert.equal(response.status, 200);
  assert.equal(calls, 2);
  assert.equal((await response.json()).competencies[1].feature, second.competencies[1].feature);
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
