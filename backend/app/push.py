"""Browser push (Web Push with VAPID). The endpoint a browser hands us is a URL we later POST to, so only the
well known push services are accepted: anything else would let a member make this server call any address."""
import json
import logging
from urllib.parse import urlparse

from app.config import Settings

log = logging.getLogger("pmforge.push")

ALLOWED_SUFFIXES = (
    ".googleapis.com",          # Chrome, Edge, Android (fcm.googleapis.com)
    ".push.services.mozilla.com",  # Firefox
    ".push.apple.com",          # Safari and iPhone home-screen apps (web.push.apple.com)
    ".notify.windows.com",      # older Edge and Windows
)


class PushGone(Exception):
    """The device removed its permission or the subscription expired. Forget it."""


class PushError(Exception):
    pass


def enabled(s: Settings) -> bool:
    return bool(s.vapid_public_key and s.vapid_private_key and s.vapid_subject)


def endpoint_ok(endpoint: str) -> bool:
    u = urlparse(endpoint)
    host = (u.hostname or "").lower()
    return u.scheme == "https" and not u.username and u.port in (None, 443) and any(
        host.endswith(x) for x in ALLOWED_SUFFIXES)


def send_push(s: Settings, *, endpoint: str, p256dh: str, auth: str, title: str, body: str, url: str) -> None:
    from pywebpush import WebPushException, webpush  # imported here so the API starts even without the library
    if not endpoint_ok(endpoint):
        raise PushGone("endpoint not allowed")
    try:
        webpush(
            subscription_info={"endpoint": endpoint, "keys": {"p256dh": p256dh, "auth": auth}},
            data=json.dumps({"title": title[:80], "body": body[:160], "url": url}),
            vapid_private_key=s.vapid_private_key,
            vapid_claims={"sub": s.vapid_subject},
            ttl=86400,
            timeout=10,
        )
    except WebPushException as exc:
        code = getattr(getattr(exc, "response", None), "status_code", None)
        if code in (404, 410):
            raise PushGone(str(code)) from exc
        raise PushError(f"push service answered {code}") from exc
    except Exception as exc:  # network errors, bad keys
        raise PushError(type(exc).__name__) from exc
