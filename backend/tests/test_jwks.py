"""JwksVerifier with a static key set: verifies tokens without any network call."""
import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from app.config import Settings
from app.security import JwksVerifier

ISS, AUD = "https://example.test", "pmforge-api"


def _make(kid: str = "k1"):
    priv = Ed25519PrivateKey.generate()
    jwk = json.loads(jwt.algorithms.OKPAlgorithm.to_jwk(priv.public_key()))
    jwk.update({"kid": kid, "alg": "EdDSA"})
    return priv, json.dumps({"keys": [jwk]})


def _token(priv, kid="k1", **over):
    claims = {"sub": "u1", "email": "a@b.test", "iss": ISS, "aud": AUD, "exp": int(time.time()) + 600} | over
    return jwt.encode(claims, priv, algorithm="EdDSA", headers={"kid": kid})


def _verifier(jwks_json: str) -> JwksVerifier:
    return JwksVerifier(Settings(jwks_json=jwks_json, jwt_issuer=ISS, jwt_audience=AUD, jwks_url=""))


def test_valid_token_verifies_without_network():
    priv, doc = _make()
    assert _verifier(doc).verify(_token(priv))["sub"] == "u1"


def test_wrong_issuer_audience_and_expired_are_rejected():
    priv, doc = _make()
    v = _verifier(doc)
    for bad in ({"iss": "https://evil.test"}, {"aud": "other"}, {"exp": int(time.time()) - 5}):
        with pytest.raises(jwt.PyJWTError):
            v.verify(_token(priv, **bad))


def test_token_signed_by_unknown_key_is_rejected():
    _, doc = _make()
    attacker, _ = _make()
    with pytest.raises(jwt.PyJWTError):
        _verifier(doc).verify(_token(attacker))


def test_unknown_kid_without_fallback_is_rejected():
    priv, doc = _make("k1")
    with pytest.raises(jwt.PyJWTError):
        _verifier(doc).verify(_token(priv, kid="other"))


def test_invalid_jwks_json_fails_closed():
    priv, _ = _make()
    with pytest.raises(jwt.PyJWTError):
        _verifier("not json").verify(_token(priv))
