import pytest
from pydantic import ValidationError

from goodquestion_ai.schemas import AnalyzeRequest, RespondRequest, RespondResponse


def test_analyze_requires_exact_criteria_key_set() -> None:
    with pytest.raises(ValidationError):
        AnalyzeRequest.model_validate(
            {
                "sceneContext": "장면",
                "goal": "목표",
                "previousCharacterMessage": None,
                "childUtterance": "아이 말",
                "targetElements": ["REASON"],
                "elementCriteria": {"REASON": "이유 기준", "EMOTION": "감정 기준"},
            }
        )


def test_main_point_can_be_null_for_low_information_utterance() -> None:
    result = RespondRequest.model_validate(
        {
            "characterName": "며느리",
            "characterPersona": "조심스러운 말투",
            "sceneContext": "장면",
            "previousCharacterMessage": "걱정돼.",
            "childUtterance": "네.",
            "analysis": {"childIntent": "SHORT_RESPONSE", "mainPoint": None},
            "responseMode": "NORMAL",
            "reactionKey": "unclearUtterance",
        }
    )

    assert result.analysis.mainPoint is None


def test_respond_rejects_analysis_fields_owned_by_backend() -> None:
    with pytest.raises(ValidationError):
        RespondRequest.model_validate(
            {
                "characterName": "며느리",
                "characterPersona": "조심스러운 말투",
                "sceneContext": "장면",
                "previousCharacterMessage": "걱정돼.",
                "childUtterance": "괜찮아요.",
                "analysis": {
                    "childIntent": "OPINION",
                    "mainPoint": "괜찮다는 의견",
                    "detectedElements": [],
                },
                "responseMode": "NORMAL",
                "reactionKey": "directResponse",
            }
        )


def test_character_line_is_limited_to_100_characters() -> None:
    result = RespondResponse(text="가" * 99 + ".", characterState="NEUTRAL")

    assert len(result.text) == 100
    with pytest.raises(ValidationError):
        RespondResponse(text="가" * 100 + ".", characterState="NEUTRAL")


@pytest.mark.parametrize("text", ["첫 문장. 둘째 문장.", "첫 줄\n둘째 줄"])
def test_character_line_is_exactly_one_sentence_and_line(text: str) -> None:
    with pytest.raises(ValidationError):
        RespondResponse(text=text, characterState="NEUTRAL")


@pytest.mark.parametrize("text", ["문장 중간에서 끝난 응답", "가" * 44])
def test_character_line_requires_sentence_ending_punctuation(text: str) -> None:
    with pytest.raises(ValidationError):
        RespondResponse(text=text, characterState="NEUTRAL")


def test_response_requires_one_of_the_five_character_states() -> None:
    result = RespondResponse(text="네 말을 들으니 마음이 놓여.", characterState="MOVED")

    assert result.characterState.value == "MOVED"
    with pytest.raises(ValidationError):
        RespondResponse(text="그랬구나.", characterState="ANGRY")
