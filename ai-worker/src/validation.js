import {
  CHARACTER_STATES,
  CHILD_INTENTS,
  FORBIDDEN_RESPONSE_PATTERNS,
  LOW_ENGAGEMENT_UTTERANCES,
  LOW_INFORMATION_INTENTS,
  REACTION_KEYS,
  RESPONSE_MODES,
  THINKING_ELEMENTS,
  UTTERANCE_VALIDITIES,
} from "./constants.js";

const thinkingElementSet = new Set(THINKING_ELEMENTS);
const childIntentSet = new Set(CHILD_INTENTS);
const validitySet = new Set(UTTERANCE_VALIDITIES);
const characterStateSet = new Set(CHARACTER_STATES);
const responseModeSet = new Set(RESPONSE_MODES);
const reactionKeySet = new Set(REACTION_KEYS);
const reportCompetencyNames = ["관점과 공감", "감정 표현", "상호작용", "생각과 이유", "결과와 해결"];
const reportCompetencyNameSet = new Set(reportCompetencyNames);
const reportEvidenceTypes = {
  "관점과 공감": new Set(["PERSPECTIVE", "EMPATHY"]),
  "감정 표현": new Set(["EMOTION"]),
  "상호작용": new Set(["REQUEST"]),
  "생각과 이유": new Set(["DECISION", "REASON"]),
  "결과와 해결": new Set(["RESULT", "SOLUTION"]),
};
const reportInternalCodePattern = /(?:DECISION|REASON|PERSPECTIVE|SOLUTION|RESULT|EMOTION|EMPATHY|REQUEST)/;
const reportDeficitPattern = /(?:부족하|못\s*하|낮[은다]|문제가\s*있|확인되지\s*않|보이지\s*않|나오지\s*않|없(?:어요|었(?:어요)?|습니다)|적게\s*나왔|대신)/;

export class ContractError extends Error {
  constructor(location, message) {
    super(message);
    this.location = location;
  }
}

function objectAt(value, location) {
  if (value === null || Array.isArray(value) || typeof value !== "object") {
    throw new ContractError(location, "object가 필요합니다.");
  }
  return value;
}

function exactKeys(value, required, location, optional = []) {
  const object = objectAt(value, location);
  for (const key of required) {
    if (!(key in object)) {
      throw new ContractError(`${location}.${key}`, "필수 필드입니다.");
    }
  }
  const allowed = new Set([...required, ...optional]);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      throw new ContractError(`${location}.${key}`, "허용되지 않은 필드입니다.");
    }
  }
  return object;
}

function stringAt(value, location, { min = 1, max, nullable = false } = {}) {
  if (nullable && value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ContractError(location, nullable ? "문자열 또는 null이 필요합니다." : "문자열이 필요합니다.");
  }
  const normalized = value.trim();
  if (normalized.length < min || (max !== undefined && normalized.length > max)) {
    throw new ContractError(location, "문자열 길이가 계약 범위를 벗어났습니다.");
  }
  return normalized;
}

function enumAt(value, allowed, location) {
  if (typeof value !== "string" || !allowed.has(value)) {
    throw new ContractError(location, "허용되지 않은 열거값입니다.");
  }
  return value;
}

function nullableMainPoint(value, location) {
  return stringAt(value, location, { min: 1, max: 300, nullable: true });
}

function integerAt(value, location, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, nullable = false } = {}) {
  if (nullable && value === null) {
    return null;
  }
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ContractError(location, nullable ? "정수 또는 null이 필요합니다." : "정수가 필요합니다.");
  }
  return value;
}

function stringArrayAt(value, location, { min = 0, max = 8, itemMax = 300 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) {
    throw new ContractError(location, `${min}~${max}개의 문자열 배열이 필요합니다.`);
  }
  return value.map((item, index) => stringAt(item, `${location}.${index}`, { min: 1, max: itemMax }));
}

function reportTextAt(value, location, { min = 1, max = 160, question = false } = {}) {
  const text = stringAt(value, location, { min, max });
  if (/\r|\n/.test(text)) {
    throw new ContractError(location, "줄바꿈 없는 한두 문장이어야 합니다.");
  }
  if (reportInternalCodePattern.test(text)) {
    throw new ContractError(location, "내부 사고 요소 코드를 노출할 수 없습니다.");
  }
  if (reportDeficitPattern.test(text)) {
    throw new ContractError(location, "아이를 단정하는 결핍 표현을 쓸 수 없습니다.");
  }
  if (question && !text.endsWith("?")) {
    throw new ContractError(location, "자연스러운 질문은 물음표로 끝나야 합니다.");
  }
  return text;
}

function validateAnalysis(value, location) {
  const analysis = exactKeys(value, ["childIntent", "mainPoint"], location);
  return {
    childIntent: enumAt(analysis.childIntent, childIntentSet, `${location}.childIntent`),
    mainPoint: nullableMainPoint(analysis.mainPoint, `${location}.mainPoint`),
  };
}

export function validateAnalyzeRequest(value) {
  const body = exactKeys(
    value,
    [
      "sceneContext",
      "goal",
      "previousCharacterMessage",
      "childUtterance",
      "targetElements",
      "elementCriteria",
    ],
    "body",
  );
  if (!Array.isArray(body.targetElements) || body.targetElements.length < 1 || body.targetElements.length > 8) {
    throw new ContractError("body.targetElements", "1~8개의 사고 요소 배열이 필요합니다.");
  }
  const targetElements = body.targetElements.map((item, index) =>
    enumAt(item, thinkingElementSet, `body.targetElements.${index}`),
  );
  if (new Set(targetElements).size !== targetElements.length) {
    throw new ContractError("body.targetElements", "사고 요소는 중복될 수 없습니다.");
  }

  const criteria = objectAt(body.elementCriteria, "body.elementCriteria");
  const criteriaKeys = Object.keys(criteria);
  const targetSet = new Set(targetElements);
  if (criteriaKeys.length !== targetSet.size || criteriaKeys.some((key) => !targetSet.has(key))) {
    throw new ContractError("body.elementCriteria", "targetElements와 정확히 같은 요소 기준이 필요합니다.");
  }
  const elementCriteria = {};
  for (const key of targetElements) {
    elementCriteria[key] = stringAt(criteria[key], `body.elementCriteria.${key}`, { min: 1, max: 300 });
  }

  return {
    sceneContext: stringAt(body.sceneContext, "body.sceneContext", { min: 1, max: 4000 }),
    goal: stringAt(body.goal, "body.goal", { min: 1, max: 4000 }),
    previousCharacterMessage: stringAt(body.previousCharacterMessage, "body.previousCharacterMessage", {
      min: 0,
      max: 1000,
      nullable: true,
    }),
    childUtterance: stringAt(body.childUtterance, "body.childUtterance", { min: 1, max: 1000 }),
    targetElements,
    elementCriteria,
  };
}

export function validateRespondRequest(value) {
  const body = exactKeys(
    value,
    [
      "characterName",
      "characterPersona",
      "sceneContext",
      "previousCharacterMessage",
      "childUtterance",
      "analysis",
      "responseMode",
      "reactionKey",
    ],
    "body",
    ["guidanceTarget", "remainingWorry"],
  );
  const responseMode = enumAt(body.responseMode, responseModeSet, "body.responseMode");
  const guidanceTarget = body.guidanceTarget === undefined || body.guidanceTarget === null
    ? null
    : enumAt(body.guidanceTarget, thinkingElementSet, "body.guidanceTarget");
  const remainingWorry = body.remainingWorry === undefined ? null : stringAt(body.remainingWorry, "body.remainingWorry", {
    min: 1,
    max: 300,
    nullable: true,
  });
  if (responseMode === "GUIDED" && (guidanceTarget === null || remainingWorry === null)) {
    throw new ContractError("body", "GUIDED에는 guidanceTarget과 remainingWorry가 필요합니다.");
  }
  if (guidanceTarget !== null && remainingWorry === null) {
    throw new ContractError("body.remainingWorry", "guidanceTarget에는 remainingWorry가 필요합니다.");
  }

  return {
    characterName: stringAt(body.characterName, "body.characterName", { min: 1, max: 300 }),
    characterPersona: stringAt(body.characterPersona, "body.characterPersona", { min: 1, max: 300 }),
    sceneContext: stringAt(body.sceneContext, "body.sceneContext", { min: 1, max: 4000 }),
    previousCharacterMessage: stringAt(body.previousCharacterMessage, "body.previousCharacterMessage", {
      min: 1,
      max: 300,
    }),
    childUtterance: stringAt(body.childUtterance, "body.childUtterance", { min: 1, max: 1000 }),
    analysis: validateAnalysis(body.analysis, "body.analysis"),
    responseMode,
    reactionKey: enumAt(body.reactionKey, reactionKeySet, "body.reactionKey"),
    guidanceTarget,
    remainingWorry,
  };
}

export function validateReportRequest(value) {
  const body = exactKeys(value, ["storyTitle", "utterances", "competencyHints"], "body");
  if (!Array.isArray(body.utterances) || body.utterances.length < 1 || body.utterances.length > 60) {
    throw new ContractError("body.utterances", "1~60개의 아이 발화 배열이 필요합니다.");
  }
  const utterances = body.utterances.map((item, position) => {
    const utterance = exactKeys(item, ["index", "text", "sceneLabel", "detectedTypes"], `body.utterances.${position}`);
    const index = integerAt(utterance.index, `body.utterances.${position}.index`, { min: 0, max: 59 });
    if (index !== position) {
      throw new ContractError(`body.utterances.${position}.index`, "0부터 순서대로 이어지는 인덱스가 필요합니다.");
    }
    const detectedTypes = stringArrayAt(utterance.detectedTypes, `body.utterances.${position}.detectedTypes`, { min: 0, max: 8, itemMax: 20 })
      .map((type, typeIndex) => enumAt(type, thinkingElementSet, `body.utterances.${position}.detectedTypes.${typeIndex}`));
    if (new Set(detectedTypes).size !== detectedTypes.length) {
      throw new ContractError(`body.utterances.${position}.detectedTypes`, "사고 요소는 중복될 수 없습니다.");
    }
    return {
      index,
      text: stringAt(utterance.text, `body.utterances.${position}.text`, { min: 1, max: 1000 }),
      sceneLabel: stringAt(utterance.sceneLabel, `body.utterances.${position}.sceneLabel`, { min: 1, max: 80 }),
      detectedTypes,
    };
  });

  if (!Array.isArray(body.competencyHints) || body.competencyHints.length !== reportCompetencyNames.length) {
    throw new ContractError("body.competencyHints", "고정된 5개 역량 힌트가 필요합니다.");
  }
  const competencyHints = body.competencyHints.map((item, index) => {
    const hint = exactKeys(item, ["name", "matched"], `body.competencyHints.${index}`);
    const name = stringAt(hint.name, `body.competencyHints.${index}.name`, { min: 1, max: 40 });
    if (name !== reportCompetencyNames[index]) {
      throw new ContractError(`body.competencyHints.${index}.name`, "정해진 역량 이름과 순서가 필요합니다.");
    }
    if (typeof hint.matched !== "boolean") {
      throw new ContractError(`body.competencyHints.${index}.matched`, "boolean이 필요합니다.");
    }
    return { name, matched: hint.matched };
  });

  return {
    storyTitle: stringAt(body.storyTitle, "body.storyTitle", { min: 1, max: 200 }),
    utterances,
    competencyHints,
  };
}

export function validateAnalyzeResponse(value) {
  const body = exactKeys(value, ["childIntent", "mainPoint", "detectedElements", "utteranceValidity"], "output");
  if (!Array.isArray(body.detectedElements) || body.detectedElements.length > 8) {
    throw new ContractError("output.detectedElements", "최대 8개의 사고 요소 배열이 필요합니다.");
  }
  const detectedElements = body.detectedElements.map((item, index) => {
    const element = exactKeys(item, ["type", "evidence"], `output.detectedElements.${index}`);
    return {
      type: enumAt(element.type, thinkingElementSet, `output.detectedElements.${index}.type`),
      evidence: stringAt(element.evidence, `output.detectedElements.${index}.evidence`, { min: 1, max: 300 }),
    };
  });
  return {
    childIntent: enumAt(body.childIntent, childIntentSet, "output.childIntent"),
    mainPoint: nullableMainPoint(body.mainPoint, "output.mainPoint"),
    detectedElements,
    utteranceValidity: enumAt(body.utteranceValidity, validitySet, "output.utteranceValidity"),
  };
}

export function validateRespondResponse(value) {
  const body = exactKeys(value, ["text", "characterState"], "output");
  const text = stringAt(body.text, "output.text", { min: 1, max: 100 });
  if (/\r|\n/.test(text) || (text.match(/[.!?。]/g) ?? []).length > 1 || !/[.!?]$/.test(text)) {
    throw new ContractError("output.text", "한 문장 완결 대사가 필요합니다.");
  }
  if (FORBIDDEN_RESPONSE_PATTERNS.some((pattern) => pattern.test(text))) {
    throw new ContractError("output.text", "허용되지 않은 캐릭터 대사입니다.");
  }
  return {
    text,
    characterState: enumAt(body.characterState, characterStateSet, "output.characterState"),
  };
}

export function validateReportResponse(value, request) {
  const body = exactKeys(
    value,
    ["competencies", "representativeIndex", "representativeReason", "storyQuestions", "dailyQuestions"],
    "output",
  );
  if (!Array.isArray(body.competencies) || body.competencies.length !== reportCompetencyNames.length) {
    throw new ContractError("output.competencies", "역량 카드 5개가 필요합니다.");
  }
  const utteranceByIndex = new Map(request.utterances.map((utterance) => [utterance.index, utterance]));
  const competencyHintsByName = new Map(request.competencyHints.map((hint) => [hint.name, hint]));
  const competencies = body.competencies.map((item, position) => {
    const card = exactKeys(item, ["name", "feature", "evidenceIndex", "strength", "next"], `output.competencies.${position}`);
    const name = stringAt(card.name, `output.competencies.${position}.name`, { min: 1, max: 40 });
    if (name !== request.competencyHints[position].name || !reportCompetencyNameSet.has(name)) {
      throw new ContractError(`output.competencies.${position}.name`, "입력과 같은 역량 이름·순서가 필요합니다.");
    }
    const evidenceIndex = integerAt(card.evidenceIndex, `output.competencies.${position}.evidenceIndex`, {
      min: 0,
      max: request.utterances.length - 1,
      nullable: true,
    });
    const matched = competencyHintsByName.get(name).matched;
    if (matched !== (evidenceIndex !== null)) {
      throw new ContractError(`output.competencies.${position}.evidenceIndex`, "matched 여부와 근거 인덱스가 일치해야 합니다.");
    }
    if (evidenceIndex !== null) {
      const evidenceUtterance = utteranceByIndex.get(evidenceIndex);
      if (!evidenceUtterance || !evidenceUtterance.detectedTypes.some((type) => reportEvidenceTypes[name].has(type))) {
        throw new ContractError(`output.competencies.${position}.evidenceIndex`, "해당 역량과 맞는 검증된 발화를 가리켜야 합니다.");
      }
    }
    const feature = reportTextAt(card.feature, `output.competencies.${position}.feature`, { min: 8, max: 150 });
    const strength = reportTextAt(card.strength, `output.competencies.${position}.strength`, { min: 8, max: 150 });
    const next = reportTextAt(card.next, `output.competencies.${position}.next`, { min: 8, max: 160 });
    if ([feature, strength, next].some((text) => request.utterances.some((utterance) => utterance.text.length >= 6 && text.includes(utterance.text)))) {
      throw new ContractError(`output.competencies.${position}`, "아이 발화 원문은 인덱스로만 참조해야 합니다.");
    }
    return { name, feature, evidenceIndex, strength, next };
  });

  const representativeIndex = integerAt(body.representativeIndex, "output.representativeIndex", {
    min: 0,
    max: request.utterances.length - 1,
  });
  const representativeReason = reportTextAt(body.representativeReason, "output.representativeReason", { min: 8, max: 160 });
  if (request.utterances.some((utterance) => utterance.text.length >= 6 && representativeReason.includes(utterance.text))) {
    throw new ContractError("output.representativeReason", "아이 발화 원문은 인덱스로만 참조해야 합니다.");
  }
  const storyQuestions = stringArrayAt(body.storyQuestions, "output.storyQuestions", { min: 2, max: 2, itemMax: 160 })
    .map((question, index) => reportTextAt(question, `output.storyQuestions.${index}`, { min: 8, max: 160, question: true }));
  const dailyQuestions = stringArrayAt(body.dailyQuestions, "output.dailyQuestions", { min: 2, max: 2, itemMax: 160 })
    .map((question, index) => reportTextAt(question, `output.dailyQuestions.${index}`, { min: 8, max: 160, question: true }));
  if (new Set([...storyQuestions, ...dailyQuestions]).size !== 4) {
    throw new ContractError("output", "서로 다른 질문 4개가 필요합니다.");
  }

  return { competencies, representativeIndex, representativeReason, storyQuestions, dailyQuestions };
}

export function knownLowEngagementAnalysis(childUtterance) {
  const normalized = childUtterance.replace(/[\s\p{P}\p{S}_]+/gu, "");
  if (!LOW_ENGAGEMENT_UTTERANCES.has(normalized)) {
    return null;
  }
  return {
    childIntent: "SHORT_RESPONSE",
    mainPoint: null,
    detectedElements: [],
    utteranceValidity: "SHORT",
  };
}

export function filterAnalysis(result, request) {
  if (result.utteranceValidity !== "VALID") {
    return {
      childIntent: LOW_INFORMATION_INTENTS[result.utteranceValidity],
      mainPoint: null,
      detectedElements: [],
      utteranceValidity: result.utteranceValidity,
    };
  }
  const allowed = new Set(request.targetElements);
  const seen = new Set();
  return {
    ...result,
    detectedElements: result.detectedElements.filter((item) => {
      if (!allowed.has(item.type) || seen.has(item.type) || !request.childUtterance.includes(item.evidence)) {
        return false;
      }
      seen.add(item.type);
      return true;
    }),
  };
}
