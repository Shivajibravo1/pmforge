"""Daily interview questions. The bank is built from the interview answer blocks already in our lessons,
so no question is written or changed here. Rotation interleaves the four levels so consecutive days differ."""
import html
import re
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache

from app import content

_BLOCK = re.compile(r"```answer\n(.*?)```", re.S)

CONSENT_VERSION = "2026-11-18"
IST = timezone(timedelta(hours=5, minutes=30))  # send dates are India dates


def today_ist() -> date:
    return datetime.now(IST).date()


def consent_text(email: str) -> str:
    return (f"Send me one interview question a day by email at {email}. "
            "I can unsubscribe at any time from any email or from this page.")


@lru_cache
def bank() -> list[dict]:
    by_level: dict[int, list[dict]] = {}
    for day in sorted(content.days()):
        m = _BLOCK.search(content.lesson_body(day) or "")
        if not m:
            continue
        lines = [ln.strip() for ln in m.group(1).splitlines() if ln.strip()]
        q = next((ln[1:].strip() for ln in lines if ln.startswith("?")), "")
        if not q:
            continue
        tips = [ln[1:].strip() for ln in lines if ln.startswith("=")]
        d = content.get_day(day) or {}
        by_level.setdefault(d["level"], []).append(
            {"day": day, "level": d["level"], "title": d.get("title", ""), "question": q, "tips": tips})
    out: list[dict] = []
    queues = [by_level[k] for k in sorted(by_level)]
    i = 0
    while any(i < len(q) for q in queues):
        out.extend(q[i] for q in queues if i < len(q))
        i += 1
    return out


def question_for(index: int) -> dict:
    b = bank()
    return b[index % len(b)]


def compose(q: dict, *, lesson_url: str, unsubscribe_url: str) -> tuple[str, str, str]:
    """Returns (subject, plain text, html). All dynamic text is escaped in the HTML."""
    subject = "Your PMForge interview question for today"
    tips = q["tips"]
    text = ["Today's interview question", "", q["question"], "",
            "Say your answer out loud for two minutes before you read on."]
    if tips:
        text += ["", "A strong answer:"] + [f"- {t}" for t in tips]
    text += ["", f"Open the lesson: {lesson_url}", "",
             "You get this email because you opted in at PMForge. Unsubscribe any time:", unsubscribe_url]
    e = html.escape
    tip_html = "".join(f"<li>{e(t)}</li>" for t in tips)
    body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111">'
        '<p style="margin:0 0 8px;font-size:13px;color:#555">Today\'s interview question</p>'
        f'<p style="margin:0 0 16px;font-size:18px;line-height:1.4;font-weight:bold">{e(q["question"])}</p>'
        '<p style="margin:0 0 16px;line-height:1.5">Say your answer out loud for two minutes before you read on.</p>'
        + (
            '<p style="margin:0 0 4px;font-weight:bold">A strong answer:</p>'
            f'<ul style="margin:0 0 16px;padding-left:20px;line-height:1.5">{tip_html}</ul>' if tips else ""
        )
        + f'<p style="margin:0 0 24px"><a href="{e(lesson_url)}">Open the lesson</a></p>'
        '<p style="margin:0;font-size:12px;color:#666">You get this email because you opted in at PMForge. '
        f'<a href="{e(unsubscribe_url)}">Unsubscribe</a></p></div>'
    )
    return subject, "\n".join(text), body
