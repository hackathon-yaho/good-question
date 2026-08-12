import argparse
import asyncio
import json
import os
import re
import sys
import uuid
from pathlib import Path
from typing import Any

from goodquestion_ai.config import get_settings
from goodquestion_ai.errors import AIServiceError
from goodquestion_ai.schemas import AnalyzeRequest, RespondRequest
from goodquestion_ai.service import FORBIDDEN_RESPONSE_PATTERNS, OpenAIService


def load_cases() -> dict[str, list[dict[str, Any]]]:
    path = Path(__file__).with_name("cases.json")
    return json.loads(path.read_text(encoding="utf-8"))


async def evaluate(limit: int | None) -> int:
    os.environ.setdefault("AI_INTERNAL_TOKEN", "evaluation-only-internal-token-1234")
    cases = load_cases()
    service = OpenAIService(get_settings())
    failures: list[str] = []
    analyze_cases = cases["analyze"][:limit]
    respond_cases = cases["respond"][:limit]

    for case in analyze_cases:
        try:
            request = AnalyzeRequest.model_validate(case["request"])
            result = await service.analyze(request, f"eval-{uuid.uuid4()}")
        except AIServiceError as exc:
            failures.append(f"{case['id']}: service_error={type(exc).__name__}")
            continue
        detected = {element.type.value for element in result.detectedElements}
        expected = set(case["include"])
        forbidden = set(case["exclude"])
        if not expected.issubset(detected):
            failures.append(f"{case['id']}: missing {sorted(expected - detected)}")
        if detected & forbidden:
            failures.append(f"{case['id']}: forbidden {sorted(detected & forbidden)}")
        if result.utteranceValidity.value != case["validity"]:
            failures.append(f"{case['id']}: validity={result.utteranceValidity.value}")
        if result.utteranceValidity.value != "VALID" and (result.mainPoint is not None or detected):
            failures.append(f"{case['id']}: low-information result was not empty")
        if any(
            element.evidence not in case["request"]["childUtterance"]
            for element in result.detectedElements
        ):
            failures.append(f"{case['id']}: non-verbatim evidence")

    for case in respond_cases:
        try:
            request = RespondRequest.model_validate(case["request"])
            result = await service.respond(request, f"eval-{uuid.uuid4()}")
        except AIServiceError as exc:
            failures.append(f"{case['id']}: service_error={type(exc).__name__}")
            continue
        text = result.text
        if any(
            re.search(pattern, text, flags=re.IGNORECASE)
            for pattern in FORBIDDEN_RESPONSE_PATTERNS
        ):
            failures.append(f"{case['id']}: forbidden response={text!r}")
        if len(re.findall(r"[.!?。]", text)) > 1 or len(text) > 44:
            failures.append(f"{case['id']}: invalid line={text!r}")

    total = len(analyze_cases) + len(respond_cases)
    print(f"{total} cases, {len(failures)} failures")
    for failure in failures:
        print(f"FAIL {failure}")
    return 1 if failures else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run paid live quality checks intentionally."
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Required acknowledgement before API calls.",
    )
    parser.add_argument("--limit", type=int, default=None, help="Maximum cases per category.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    if not args.live:
        raise SystemExit("Live API calls are disabled. Re-run with --live and an explicit --limit.")
    if args.limit is None or args.limit < 1:
        raise SystemExit("Set --limit to a positive number to cap paid evaluation calls.")
    sys.exit(asyncio.run(evaluate(args.limit)))
