import re
from enum import StrEnum
from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300)]
ContextText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=4_000),
]
ChildText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1_000)]
EvidenceText = Annotated[str, StringConstraints(min_length=1, max_length=300)]
CharacterLine = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=44),
]
MainPoint = Annotated[
    str | None,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=300),
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ThinkingElement(StrEnum):
    DECISION = "DECISION"
    REASON = "REASON"
    PERSPECTIVE = "PERSPECTIVE"
    SOLUTION = "SOLUTION"
    RESULT = "RESULT"
    EMOTION = "EMOTION"
    EMPATHY = "EMPATHY"
    REQUEST = "REQUEST"


class ChildIntent(StrEnum):
    QUESTION = "QUESTION"
    OPINION = "OPINION"
    REASONING = "REASONING"
    SOLUTION = "SOLUTION"
    DECISION = "DECISION"
    PERSPECTIVE = "PERSPECTIVE"
    EMOTION = "EMOTION"
    REQUEST = "REQUEST"
    CHALLENGE = "CHALLENGE"
    PLAYFUL = "PLAYFUL"
    OFF_TOPIC = "OFF_TOPIC"
    SHORT_RESPONSE = "SHORT_RESPONSE"
    UNCLEAR = "UNCLEAR"


class UtteranceValidity(StrEnum):
    VALID = "VALID"
    SHORT = "SHORT"
    UNCLEAR = "UNCLEAR"
    OFF_TOPIC = "OFF_TOPIC"
    PLAYFUL = "PLAYFUL"


class ResponseMode(StrEnum):
    NORMAL = "NORMAL"
    GUIDED = "GUIDED"


class CharacterState(StrEnum):
    NEUTRAL = "NEUTRAL"
    HAPPY = "HAPPY"
    WORRIED = "WORRIED"
    SURPRISED = "SURPRISED"
    MOVED = "MOVED"


class ReactionKey(StrEnum):
    playfulUtterance = "playfulUtterance"
    questionFromChild = "questionFromChild"
    proposalFromChild = "proposalFromChild"
    unclearUtterance = "unclearUtterance"
    empathyFromChild = "empathyFromChild"
    disagreement = "disagreement"
    directResponse = "directResponse"


class AnalyzeRequest(StrictModel):
    sceneContext: ContextText
    goal: ContextText
    previousCharacterMessage: Annotated[
        str | None,
        StringConstraints(strip_whitespace=True, max_length=1_000),
    ]
    childUtterance: ChildText
    targetElements: list[ThinkingElement] = Field(min_length=1, max_length=8)
    elementCriteria: dict[ThinkingElement, ShortText]

    @model_validator(mode="after")
    def criteria_must_cover_targets(self) -> "AnalyzeRequest":
        target_set = set(self.targetElements)
        criteria_set = set(self.elementCriteria)
        missing = target_set - criteria_set
        extra = criteria_set - target_set
        if missing:
            raise ValueError("elementCriteria must define every targetElements item")
        if extra:
            raise ValueError("elementCriteria cannot contain non-target elements")
        if len(target_set) != len(self.targetElements):
            raise ValueError("targetElements cannot contain duplicates")
        return self


class DetectedElement(StrictModel):
    type: ThinkingElement
    evidence: EvidenceText


class AnalyzeResponse(StrictModel):
    childIntent: ChildIntent
    mainPoint: MainPoint
    detectedElements: list[DetectedElement] = Field(max_length=8)
    utteranceValidity: UtteranceValidity


class ResponseAnalysis(StrictModel):
    childIntent: ChildIntent
    mainPoint: MainPoint


class RespondRequest(StrictModel):
    characterName: ShortText
    characterPersona: ShortText
    sceneContext: ContextText
    previousCharacterMessage: ShortText
    childUtterance: ChildText
    analysis: ResponseAnalysis
    responseMode: ResponseMode
    reactionKey: ReactionKey
    guidanceTarget: ThinkingElement | None = None
    remainingWorry: Annotated[
        str | None,
        StringConstraints(strip_whitespace=True, max_length=300),
    ] = None

    @model_validator(mode="after")
    def guided_requires_material(self) -> "RespondRequest":
        if self.responseMode is ResponseMode.GUIDED:
            if self.guidanceTarget is None or not self.remainingWorry:
                raise ValueError("GUIDED requires guidanceTarget and remainingWorry")
        elif self.guidanceTarget is not None and not self.remainingWorry:
            raise ValueError("guidanceTarget requires remainingWorry")
        return self


class RespondResponse(StrictModel):
    text: CharacterLine
    characterState: CharacterState

    @field_validator("text")
    @classmethod
    def must_be_one_line_and_sentence(cls, value: str) -> str:
        if "\n" in value or "\r" in value:
            raise ValueError("character response must be one line")
        if len(re.findall(r"[.!?。]", value)) > 1:
            raise ValueError("character response must be one sentence")
        return value


class HealthResponse(StrictModel):
    status: str
    model: str
    promptVersions: dict[str, str]
