import os
import tempfile

_tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp.name}"
os.environ["ADMIN_EMAILS"] = "admin@example.com"
os.environ["OPENAI_API_KEY"] = ""

import jwt  # noqa: E402
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import ai  # noqa: E402
from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.routes.mentor import get_ai_client  # noqa: E402
from app.security import get_verifier  # noqa: E402


class FakeVerifier:
    """Token format 'uid|email'. Anything else is invalid."""
    def verify(self, token: str) -> dict:
        if "|" not in token:
            raise jwt.InvalidTokenError("bad")
        uid, email = token.split("|", 1)
        return {"sub": uid, "email": email}


class FakeAI:
    def __init__(self):
        self.text = '{"score": 82, "strengths": ["clear"], "gaps": ["no dates"], "next_steps": ["add owners"]}'
        self.tokens_in, self.tokens_out = 1000, 300
        self.calls = []
        self.flag = False
        self.moderated = []

    def complete(self, *, model, instructions, user_input, max_output_tokens, user_id, json_schema=None):
        self.calls.append({"model": model, "instructions": instructions, "input": user_input, "schema": json_schema})
        return ai.Completion(self.text, self.tokens_in, self.tokens_out)

    def moderate(self, text, *, model):
        self.moderated.append(text)
        return self.flag


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def fake_ai():
    return FakeAI()


@pytest.fixture
def client(fake_ai):
    app.dependency_overrides[get_verifier] = lambda: FakeVerifier()
    app.dependency_overrides[get_ai_client] = lambda: fake_ai
    yield TestClient(app)
    app.dependency_overrides.clear()


def auth(uid="u1", email="u1@example.com"):
    return {"Authorization": f"Bearer {uid}|{email}"}
