"""Every rich block in every lesson must be well formed, so a typo cannot break a live lesson."""
import re

from app.content import days, lesson_body

KINDS = {"flow", "cards", "stats", "checklist", "quiz", "accordion", "tip", "note", "warn", "key"}
FENCE = re.compile(r"```(\w+)\n(.*?)```", re.S)


def blocks(day: int):
    return FENCE.findall(lesson_body(day) or "")


def test_all_blocks_use_known_kinds_and_are_non_empty():
    for n in days():
        for kind, src in blocks(n):
            assert kind in KINDS, f"day {n}: unknown block {kind}"
            assert src.strip(), f"day {n}: empty {kind} block"


def test_quizzes_have_one_correct_answer():
    for n in days():
        for kind, src in blocks(n):
            if kind != "quiz":
                continue
            ls = [line.strip() for line in src.splitlines() if line.strip()]
            assert any(line.startswith("?") for line in ls), f"day {n}: quiz has no question"
            opts = [line for line in ls if line[0] in "+-"]
            assert len(opts) >= 2, f"day {n}: quiz needs two options"
            assert sum(o.startswith("+") for o in opts) == 1, f"day {n}: quiz needs exactly one correct option"


def test_cards_and_flow_lines_are_pipe_separated():
    for n in days():
        for kind, src in blocks(n):
            if kind in {"cards", "flow", "stats", "accordion"}:
                for line in filter(None, (x.strip() for x in src.splitlines())):
                    assert "|" in line, f"day {n}: {kind} line missing pipe: {line}"


def test_lessons_one_to_ten_have_rich_content():
    for n in range(1, 11):
        assert len(blocks(n)) >= 3, f"day {n} should use at least three rich blocks"
        assert "—" not in (lesson_body(n) or ""), f"day {n}: no em dashes"
