"""Per-client request rate limit (OWASP API4 unrestricted resource consumption, API6 sensitive business flows).

In memory and per process: the API runs as one process, so a shared store is not needed. The client is the
Cloudflare-supplied address when present (Caddy removes that header unless the connection really came from
Cloudflare), otherwise the TCP peer. Health checks are never limited. Public routes get a lower ceiling because
they need no login.
"""
import time
from collections import deque

from starlette.types import ASGIApp, Receive, Scope, Send

WINDOW = 60.0
MAX_TRACKED = 50_000  # bounds memory if many addresses show up


class RateLimit:
    def __init__(self, app: ASGIApp, per_minute: int, public_per_minute: int):
        self.app = app
        self.per_minute = per_minute
        self.public_per_minute = public_per_minute
        self.hits: dict[tuple[str, bool], deque[float]] = {}

    @staticmethod
    def _client(scope: Scope) -> str:
        for k, v in scope["headers"]:
            if k == b"cf-connecting-ip":
                return v.decode("latin-1")[:64]
        peer = scope.get("client")
        return peer[0] if peer else "unknown"

    def _allowed(self, key: tuple[str, bool], limit: int, now: float) -> bool:
        q = self.hits.get(key)
        if q is None:
            if len(self.hits) >= MAX_TRACKED:
                self.hits = {k: v for k, v in self.hits.items() if v and now - v[-1] < WINDOW}
            q = self.hits[key] = deque()
        while q and now - q[0] >= WINDOW:
            q.popleft()
        if len(q) >= limit:
            return False
        q.append(now)
        return True

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] != "http" or self.per_minute <= 0 or scope["path"] == "/health":
            return await self.app(scope, receive, send)
        public = scope["path"].startswith("/public/")
        limit = self.public_per_minute if public else self.per_minute
        if self._allowed((self._client(scope), public), limit, time.monotonic()):
            return await self.app(scope, receive, send)
        body = b'{"detail":"rate_limited"}'
        await send({"type": "http.response.start", "status": 429,
                    "headers": [(b"content-type", b"application/json"), (b"retry-after", b"60"),
                                (b"content-length", str(len(body)).encode())]})
        await send({"type": "http.response.body", "body": body})
