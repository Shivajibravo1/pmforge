"""Every rich block in every lesson must be well formed, so a typo cannot break a live lesson."""
import re

from app.content import days, get_day, lesson_body

KINDS = {"chat", "decision", "timeline", "rag", "arch", "ai", "quote", "journal", "flow", "cards", "stats", "checklist", "quiz", "accordion", "tip", "note", "warn", "key", "ref", "mindmap", "flashcards", "incident", "answer"}
FENCE = re.compile(r"```(\w+)\n(.*?)```", re.S)


def written() -> list[int]:
    """Every lesson that has a body file. The standards apply to all of them."""
    return [n for n in sorted(days()) if lesson_body(n)]


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
    for n in written():
        assert len(blocks(n)) >= 3, f"day {n} should use at least three rich blocks"
        assert "—" not in (lesson_body(n) or ""), f"day {n}: no em dashes"


def test_each_lesson_has_several_screens_and_no_em_dash_in_titles():
    for n in written():
        body = lesson_body(n) or ""
        screens = [line for line in body.splitlines() if line.startswith("## ")]
        assert 6 <= len(screens) <= 12, f"day {n}: {len(screens)} screens, expected 6 to 12"


def test_every_lesson_has_an_ai_lens_or_ai_cards_and_risk_highlights():
    for n in written():
        body = lesson_body(n) or ""
        assert "```ai" in body, f"day {n}: add an AI lens block"
    # at least the foundations lessons carry 'what goes wrong' on cards (4th field)
    for n in [x for x in written() if get_day(x)["type"] == "C"]:
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


def test_lessons_one_to_ten_are_immersive():
    """Storytelling standard: a scene, a decision with consequences, and enough depth."""
    for n in written():
        kinds = [k for k, _ in blocks(n)]
        words = len((lesson_body(n) or "").split())
        assert "chat" in kinds, f"day {n}: open with a chat scene"
        assert words >= (350 if get_day(n)["type"] == "R" else 700), f"day {n}: only {words} words, expected a fuller lesson"
        assert "decision" in kinds, f"day {n}: add a decision with consequences"
        first = (lesson_body(n) or "").split("\n## ")[0] + "\n## "
        assert "```chat" in first or "```chat" in (lesson_body(n) or "").split("\n## ")[1], f"day {n}: hook within first screen"


def test_lesson_shape_matches_lesson_type():
    """Concept lessons end with a journal. Artifact lessons end with a task and have no journal."""
    for n in written():
        body = lesson_body(n) or ""
        kind = get_day(n)["type"]
        if kind in {"B", "S", "K", "P", "A"}:
            assert "## Your task" in body, f"day {n}: artifact lessons need a Your task section"
            assert "```journal" not in body, f"day {n}: artifact lessons must not have a journal"
        elif kind == "C":
            assert "```journal" in body, f"day {n}: concept lessons need a journal"


REF_SOURCES = {"PMI", "ITIL", "NIST", "CIS", "OWASP", "ISO", "Scrum", "Agile", "DORA", "SAFe", "PRINCE2", "COBIT",
               "Azure", "AWS", "SRE", "EU", "IIBA", "Kanban", "ISTQB", "FinOps", "CISA", "AICPA", "India", "MITRE", "FIRST", "Prosci", "DAMA"}


def test_reference_cards_cite_known_sources_by_name_only():
    """Reference rows are `Source | where to look | how to use it`. Names and topics only: no links, no quotes."""
    for n in written():
        for kind, src in blocks(n):
            if kind != "ref":
                continue
            for line in filter(None, (x.strip() for x in src.splitlines())):
                cells = [c.strip() for c in line.split("|")]
                assert len(cells) == 3 and all(cells), f"day {n}: ref line needs 3 filled fields: {line}"
                assert cells[0] in REF_SOURCES, f"day {n}: unknown reference source {cells[0]}"
                assert len(cells[2]) >= 25, f"day {n}: say how to use it: {line}"
                assert "http" not in line and "www." not in line, f"day {n}: no links in references"
                assert "\u2014" not in line and "\u2013" not in line, f"day {n}: no em or en dashes"
                assert '"' not in line and "\u201c" not in line, f"day {n}: do not quote sources"


def test_every_lesson_has_a_reference_card():
    """Standing requirement: each lesson carries framework references and interview tips."""
    for n in written():
        assert any(k == "ref" for k, _ in blocks(n)), f"day {n}: add a ref block with PMI, ITIL, NIST, CIS, OWASP or ISO pointers"


PILOT_KIT_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 30,  31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 48, 49, 50, 51, 52, 53, 55, 56, 57, 58, 60, 61, 62, 63, 64, 65, 66, 67, 69, 70, 71, 72, 73, 74, 76, 77, 78, 79, 80, 47, 54, 68, 75, 91, 92, 98, 108, 114]


def _lines(src: str) -> list[str]:
    return [x.strip() for x in src.splitlines() if x.strip()]


def test_modern_kit_blocks_are_well_formed():
    for n in written():
        for kind, src in blocks(n):
            ls = _lines(src)
            if kind == "mindmap":
                assert ls[0].startswith("# "), f"day {n}: mindmap needs a centre line"
                assert len(ls) >= 4, f"day {n}: mindmap needs three or more branches"
                for row in ls[1:]:
                    name, _, kids = row.partition("|")
                    assert name.strip() and len([k for k in kids.split(",") if k.strip()]) >= 2, f"day {n}: mindmap branch: {row}"
            if kind == "flashcards":
                assert len(ls) >= 3, f"day {n}: flashcards need three or more cards"
                assert all(row.count("|") >= 1 and all(c.strip() for c in row.split("|", 1)) for row in ls), f"day {n}: flashcard needs Front | Back"
            if kind == "incident":
                assert ls[0].startswith("# "), f"day {n}: incident needs a title"
                title = ls[0].lower()
                assert "illustrative" in title or title.startswith("# real case"), f"day {n}: label the incident illustrative or real case"
                labels = [row.split("|")[0].strip().lower() for row in ls[1:]]
                for need in ("what happened", "impact", "root cause", "resolution"):
                    assert need in labels, f"day {n}: incident needs a {need} row"
                assert any(x.startswith(("pm move", "lesson")) for x in labels), f"day {n}: incident needs a PM move or Lesson row"
            if kind == "answer":
                assert sum(row.startswith("?") for row in ls) == 1, f"day {n}: answer needs one question"
                assert sum(row.startswith("+") for row in ls) == 1, f"day {n}: answer needs one strong answer"
                assert any(row.startswith("-") and "|" in row for row in ls), f"day {n}: answer needs a weak answer with why"
                assert any(row.startswith("=") for row in ls), f"day {n}: answer needs a tailoring tip"


def test_pilot_lessons_carry_the_modern_team_kit():
    for n in PILOT_KIT_DAYS:
        kinds = {k for k, _ in blocks(n)}
        missing = {"mindmap", "flashcards", "incident", "answer"} - kinds
        assert not missing, f"day {n}: add {sorted(missing)}"


AI_LENS_LABELS = ["Shift", "Example (illustrative)", "Use AI to", "Keep human", "Risk", "Control", "Interview line"]


def test_every_ai_lens_is_structured_and_substantial():
    for n in written():
        lens = [src for kind, src in blocks(n) if kind == "ai"]
        assert lens, f"day {n}: missing ai lens"
        rows = _lines(lens[0])
        assert [r.split("|")[0].strip() for r in rows] == AI_LENS_LABELS, f"day {n}: ai lens rows"
        assert all(len(r.split("|", 1)[1].split()) >= 6 for r in rows), f"day {n}: ai lens row too thin"
        assert len(lens[0].split()) >= 100, f"day {n}: ai lens too short"
