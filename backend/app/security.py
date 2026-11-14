"""Authentication and authorization.

Tokens are JWTs issued by Better Auth and verified here against its JWKS.
The API uses Bearer tokens only (no cookies), so classic CSRF does not apply
to API routes. Roles and ownership are always read from the database, never
from the token.
"""
import logging
from functools import lru_cache
from typing import Protocol

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db import get_db
from app.models import User

log = logging.getLogger("pmforge.security")
_bearer = HTTPBearer(auto_error=False)


class Verifier(Protocol):
    def verify(self, token: str) -> dict: ...


class JwksVerifier:
    def __init__(self, settings: Settings):
        self._s = settings
        self._client = jwt.PyJWKClient(settings.jwks_url, cache_keys=True) if settings.jwks_url else None

    def verify(self, token: str) -> dict:
        if self._client is None:
            raise jwt.InvalidTokenError("JWKS is not configured")
        key = self._client.get_signing_key_from_jwt(token).key
        opts = {"require": ["exp", "sub"], "verify_aud": bool(self._s.jwt_audience)}
        return jwt.decode(
            token,
            key,
            algorithms=[a.strip() for a in self._s.jwt_algorithms.split(",")],
            audience=self._s.jwt_audience or None,
            issuer=self._s.jwt_issuer or None,
            options=opts,
        )


@lru_cache
def get_verifier() -> Verifier:
    return JwksVerifier(get_settings())


def _unauthorized() -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or missing credentials",
                         headers={"WWW-Authenticate": "Bearer"})


def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    verifier: Verifier = Depends(get_verifier),
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> User:
    if creds is None:
        raise _unauthorized()
    try:
        claims = verifier.verify(creds.credentials)
    except jwt.PyJWTError:
        raise _unauthorized() from None
    except Exception:  # JWKS fetch failures must fail closed
        log.exception("Token verification error")
        raise _unauthorized() from None

    uid = str(claims["sub"])[:64]
    email = str(claims.get("email", ""))[:320]
    user = db.get(User, uid)
    if user is None:
        user = User(id=uid, email=email)
        db.add(user)
    if email:
        user.email = email
    if email.lower() in settings.admin_list:
        user.role = "admin"
    db.commit()
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin role required")
    return user
