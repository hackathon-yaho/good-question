from goodquestion_ai.prompts import ANALYZE_DEVELOPER_PROMPT, RESPOND_DEVELOPER_PROMPT


def test_analyze_prompt_contains_low_information_guards() -> None:
    assert "연속 문자열" in ANALYZE_DEVELOPER_PROMPT
    assert "추론해 추가하지 않는다" in ANALYZE_DEVELOPER_PROMPT
    assert "mainPoint는 반드시 null" in ANALYZE_DEVELOPER_PROMPT


def test_respond_prompt_contains_child_ux_guards() -> None:
    assert "100자" in RESPOND_DEVELOPER_PROMPT
    assert "32~36자" in RESPOND_DEVELOPER_PROMPT
    assert "반드시 마침표" in RESPOND_DEVELOPER_PROMPT
    assert "평가 표현" in RESPOND_DEVELOPER_PROMPT
    assert "NORMAL에서는 장면을 끝내거나" in RESPOND_DEVELOPER_PROMPT
    assert "학습지·채점식" in RESPOND_DEVELOPER_PROMPT
    assert "remainingWorry의 핵심 대상·상황" in RESPOND_DEVELOPER_PROMPT
    assert "장면 질문 하나" in RESPOND_DEVELOPER_PROMPT
    assert "무응답·꾸짖음·욕설 되풀이" in RESPOND_DEVELOPER_PROMPT
    assert "이장·시아버지의" in RESPOND_DEVELOPER_PROMPT
    assert "characterState" in RESPOND_DEVELOPER_PROMPT
