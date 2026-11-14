"""Curriculum loader. Structure lives in curriculum.json, lesson bodies in lessons/day-NNN.md."""
import json
from functools import lru_cache
from pathlib import Path

_DIR = Path(__file__).parent / "content"

# XP per lesson type: C concept, B build, S simulation, K critique, P portfolio, A assessment, R buffer.
XP = {"C": 10, "B": 30, "S": 25, "K": 25, "P": 40, "A": 100, "R": 5}


@lru_cache
def curriculum() -> dict:
    return json.loads((_DIR / "curriculum.json").read_text(encoding="utf-8"))


@lru_cache
def days() -> dict[int, dict]:
    out: dict[int, dict] = {}
    for level in curriculum()["levels"]:
        for d in level["days"]:
            out[d["day"]] = {**d, "level": level["id"]}
    return out


def get_day(day: int) -> dict | None:
    return days().get(day)


def lesson_body(day: int) -> str | None:
    path = _DIR / "lessons" / f"day-{day:03d}.md"
    return path.read_text(encoding="utf-8") if path.exists() else None


def level_days(level: int) -> list[int]:
    return [n for n, d in days().items() if d["level"] == level]


def journal_prompt(day: int) -> str | None:
    """The learner-facing journal prompt of a lesson, read from our own content (never from the client)."""
    import re
    body = lesson_body(day) or ""
    m = re.search(r"```journal\n(.*?)```", body, re.S)
    return m.group(1).strip() if m else None
