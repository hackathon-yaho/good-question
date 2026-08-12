from goodquestion_ai.prompts import ANALYZE_DEVELOPER_PROMPT, RESPOND_DEVELOPER_PROMPT


def test_analyze_prompt_contains_low_information_guards() -> None:
    assert "연속 문자열" in ANALYZE_DEVELOPER_PROMPT
    assert "추론해 추가하지 않는다" in ANALYZE_DEVELOPER_PROMPT
    assert "mainPoint는 반드시 null" in ANALYZE_DEVELOPER_PROMPT


def test_respond_prompt_contains_child_ux_guards() -> None:
    assert "44자" in RESPOND_DEVELOPER_PROMPT
    assert "평가 표현" in RESPOND_DEVELOPER_PROMPT
    assert "NORMAL에서는 장면을 끝내거나" in RESPOND_DEVELOPER_PROMPT
    assert "학습지 질문" in RESPOND_DEVELOPER_PROMPT
