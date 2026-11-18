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
    pdf = q.get("pdf_title")
    if pdf:
        text += ["", f"Download the PDF \"{pdf}\": {q['resources_url']}"]
    text += ["", f"Open the lesson: {lesson_url}", "",
             "You get this email because you opted in at PMForge. Unsubscribe any time:", unsubscribe_url]
    e = html.escape
    tip_html = "".join(f"<li>{e(t)}</li>" for t in tips)
    body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111">'
        '<p style="margin:0 0 8px;font-size:13px;color:#555">Today\'s interview question</p>'
        f'<p style="margin:0 0 16px;font-size:18px;line-height:1.4;font-weight:bold">{e(q["question"])}</p>'
        '<p style="margin:0 0 16px;line-height:1.5">Say your answer out loud for two minutes before you read on.</p>'
        + (f'<p style="margin:0 0 16px"><img src="{e(q["image_url"])}" alt="{e(q.get("image_alt", ""))}" width="520" '
           'style="display:block;max-width:100%;height:auto;border:0"></p>' if q.get("image_url") else "")
        + (
            '<p style="margin:0 0 4px;font-weight:bold">A strong answer:</p>'
            f'<ul style="margin:0 0 16px;padding-left:20px;line-height:1.5">{tip_html}</ul>' if tips else ""
        )
        + (f'<p style="margin:0 0 16px"><a href="{e(q["resources_url"])}">Download the PDF: {e(pdf)}</a></p>'
           if pdf else "")
        + f'<p style="margin:0 0 24px"><a href="{e(lesson_url)}">Open the lesson</a></p>'
        '<p style="margin:0;font-size:12px;color:#666">You get this email because you opted in at PMForge. '
        f'<a href="{e(unsubscribe_url)}">Unsubscribe</a></p></div>'
    )
    return subject, "\n".join(text), body


def compose_campaign(subject: str, blocks: list[dict], *, images: dict[str, tuple[str, str]],
                     pdf_name: str | None, unsubscribe_url: str) -> tuple[str, str, str]:
    """Build an admin-written email. `images` maps resource id to (public url, alt text). Text is escaped;
    a paragraph is separated by a blank line, and lines starting with '- ' become a bullet list."""
    e = html.escape
    text_parts: list[str] = []
    html_parts: list[str] = []
    for b in blocks:
        if b.get("type") == "image" and b.get("resource_id") in images:
            url, alt = images[b["resource_id"]]
            html_parts.append(f'<p style="margin:0 0 16px"><img src="{e(url)}" alt="{e(alt)}" width="520" '
                              'style="display:block;max-width:100%;height:auto;border:0"></p>')
            text_parts.append(f"[Image: {alt}]")
        elif b.get("type") == "text":
            for para in re.split(r"\n\s*\n", str(b.get("text", "")).strip()):
                lines = [ln.strip() for ln in para.splitlines() if ln.strip()]
                if not lines:
                    continue
                text_parts.append("\n".join(lines))
                if all(ln.startswith("- ") for ln in lines):
                    items = "".join(f"<li>{e(ln[2:])}</li>" for ln in lines)
                    html_parts.append(f'<ul style="margin:0 0 16px;padding-left:20px;line-height:1.5">{items}</ul>')
                else:
                    inner = "<br>".join(e(x) for x in lines)
                    html_parts.append(f'<p style="margin:0 0 16px;line-height:1.5">{inner}</p>')
    if pdf_name:
        text_parts.append(f"A PDF is attached: {pdf_name}")
        html_parts.append(f'<p style="margin:0 0 16px;font-size:13px;color:#555">A PDF is attached: {e(pdf_name)}</p>')
    text_parts.append("You get this email because you opted in at PMForge. Unsubscribe any time:\n" + unsubscribe_url)
    body = (
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111">'
        + "".join(html_parts)
        + f'<p style="margin:24px 0 0;font-size:12px;color:#666">You get this email because you opted in at PMForge. '
        f'<a href="{e(unsubscribe_url)}">Unsubscribe</a></p></div>'
    )
    return subject, "\n\n".join(text_parts), body
