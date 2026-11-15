"""The Alembic history must build exactly the schema the models describe."""
from pathlib import Path

import sqlalchemy as sa
from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext

import app.models  # noqa: F401
from app.db import Base

ROOT = Path(__file__).resolve().parent.parent


def cfg(url: str, monkeypatch) -> Config:
    monkeypatch.setenv("DATABASE_URL", url)
    from app.config import get_settings
    get_settings.cache_clear()
    c = Config(str(ROOT / "alembic.ini"))
    c.set_main_option("script_location", str(ROOT / "migrations"))
    return c


def test_upgrade_builds_the_model_schema_and_downgrade_removes_it(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'm.db'}"
    c = cfg(url, monkeypatch)
    command.upgrade(c, "head")
    engine = sa.create_engine(url)
    with engine.connect() as conn:
        assert compare_metadata(MigrationContext.configure(conn), Base.metadata) == []
    command.downgrade(c, "base")
    assert set(sa.inspect(engine).get_table_names()) <= {"alembic_version"}


def test_database_created_before_alembic_is_left_untouched(tmp_path, monkeypatch):
    url = f"sqlite:///{tmp_path / 'old.db'}"
    engine = sa.create_engine(url)
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(sa.text("insert into users (id, email, role, tier, portfolio_public, created_at) "
                             "values ('u1', 'a@b.c', 'learner', 'free', 0, '2026-01-01')"))
    command.upgrade(cfg(url, monkeypatch), "head")
    with engine.connect() as conn:
        assert conn.execute(sa.text("select count(*) from users")).scalar() == 1
