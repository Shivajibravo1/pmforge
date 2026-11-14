"""Every rich block in every lesson must be well formed, so a typo cannot break a live lesson."""
import re

from app.content import days, lesson_body

KINDS = {"chat", "decision", "timeline", "rag", "arch", "ai", "quote", "journal", "flow", "cards", "stats", "checklist", "quiz", "accordion", "tip", "note", "warn", "key"}
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
            if kind in {"cards", "flow", "stats", "accordion", "quote"}:
                for line in filter(None, (x.strip() for x in src.splitlines())):
                    assert "|" in line, f"day {n}: {kind} line missing pipe: {line}"


def test_lessons_one_to_ten_have_rich_content():
    for n in range(1, 11):
        assert len(blocks(n)) >= 3, f"day {n} should use at least three rich blocks"
        assert "—" not in (lesson_body(n) or ""), f"day {n}: no em dashes"


def test_each_lesson_has_several_screens_and_no_em_dash_in_titles():
    for n in range(1, 11):
        body = lesson_body(n) or ""
        screens = [line for line in body.splitlines() if line.startswith("## ")]
        assert 6 <= len(screens) <= 12, f"day {n}: {len(screens)} screens, expected 6 to 12"


def test_every_lesson_has_an_ai_lens_or_ai_cards_and_risk_highlights():
    for n in range(1, 11):
        body = lesson_body(n) or ""
        assert "```ai" in body, f"day {n}: add an AI lens block"
    # at least the foundations lessons carry 'what goes wrong' on cards (4th field)
    for n in (1, 2, 3, 4, 8, 9, 10):
        cards = [src for kind, src in blocks(n) if kind == "cards"]
        risky = [line for src in cards for line in src.splitlines() if line.count("|") >= 3]
        assert risky, f"day {n}: cards should state what goes wrong"


def test_story_blocks_are_well_formed():
    for n in days():
        for kind, src in blocks(n):
            ls = [x.strip() for x in src.splitlines() if x.strip()]
            if kind == "chat":
                body = [x for x in ls if not x.startswith("#")]
                assert body, f"day {n}: chat has no messages"
                for x in body:
                    assert x.count("|") >= 2, f"day {n}: chat line needs Name | role | message: {x}"
            elif kind in {"timeline", "rag"}:
                for x in ls:
                    assert "|" in x, f"day {n}: {kind} line missing pipe: {x}"
                if kind == "rag":
                    for x in ls:
                        assert x.split("|")[1].strip().upper()[:1] in "RAG", f"day {n}: bad RAG status: {x}"
            elif kind == "decision":
                assert sum(x.startswith("?") for x in ls) == 1, f"day {n}: decision needs one situation"
                opts = [x for x in ls if x[0] in "+-"]
                assert len(opts) >= 2 and sum(o.startswith("+") for o in opts) == 1, f"day {n}: decision needs exactly one best option"
                assert all("|" in o for o in opts), f"day {n}: each decision option needs a consequence"
                assert any(x.startswith("=") for x in ls), f"day {n}: decision needs a senior PM take"
