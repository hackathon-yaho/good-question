import json
from pathlib import Path
from typing import Any

from goodquestion_ai.schemas import AnalyzeRequest, RespondRequest


def load_cases() -> dict[str, list[dict[str, Any]]]:
    path = Path(__file__).parents[1] / "evals" / "cases.json"
    return json.loads(path.read_text(encoding="utf-8"))


def test_live_eval_dataset_matches_public_contracts() -> None:
    cases = load_cases()

    assert len(cases["analyze"]) >= 10
    assert len(cases["respond"]) >= 6

    for case in cases["analyze"]:
        request = AnalyzeRequest.model_validate(case["request"])
        target_values = {element.value for element in request.targetElements}
        assert set(case["include"]).issubset(target_values)
        assert set(case["exclude"]).issubset(target_values)

    for case in cases["respond"]:
        RespondRequest.model_validate(case["request"])
