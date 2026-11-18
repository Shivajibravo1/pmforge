"""Sends email through the Resend HTTP API. Failures raise EmailError; the caller decides what to do."""
import base64
import logging

import httpx

from app.config import Settings

log = logging.getLogger("pmforge.email")
RESEND_URL = "https://api.resend.com/emails"


class EmailError(Exception):
    pass


def send_email(settings: Settings, *, to: str, subject: str, text: str, html: str,
               unsubscribe_url: str, idempotency_key: str, attachments: list[dict] | None = None) -> None:
    """attachments: [{"filename": str, "content": bytes}]. Sent to Resend as base64."""
    if not settings.resend_api_key or not settings.email_from:
        raise EmailError("email is not configured")
    try:
        r = httpx.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {settings.resend_api_key}", "Idempotency-Key": idempotency_key[:256]},
            json={
                "from": settings.email_from, "to": [to], "subject": subject, "text": text, "html": html,
                **({"attachments": [{"filename": a["filename"], "content": base64.b64encode(a["content"]).decode()}
                                    for a in attachments]} if attachments else {}),
                # One-click unsubscribe for mail apps (RFC 8058) alongside the link in the body.
                "headers": {"List-Unsubscribe": f"<{unsubscribe_url}>",
                            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"},
            },
            timeout=15,
        )
    except httpx.HTTPError as exc:
        raise EmailError(f"request failed: {type(exc).__name__}") from exc
    if r.status_code >= 300:
        log.warning("Resend returned %s", r.status_code)  # the body can echo the address, so it is not logged
        raise EmailError(f"provider returned {r.status_code}")
