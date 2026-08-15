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
