"""Application settings. All secrets come from environment variables."""
from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    env: str = "development"
    database_url: str = "sqlite:///./dev.db"
    cors_origins: str = "http://localhost:3000"

    # Auth: JWTs issued by Better Auth, verified against its JWKS endpoint.
    jwks_url: str = ""
    # Optional: the public JWKS document pasted as JSON. Verifies tokens with no network call.
    jwks_json: str = ""
    jwt_issuer: str = ""
    jwt_audience: str = ""
    jwt_algorithms: str = "EdDSA,RS256,ES256"
    admin_emails: str = ""
    # Set automatically by Vercel when Protection Bypass for Automation is enabled.
    vercel_bypass_secret: str = Field(default="", validation_alias="VERCEL_AUTOMATION_BYPASS_SECRET", repr=False)

    # AI (model names are configuration, never hard-coded in logic).
    openai_api_key: str = Field(default="", repr=False)
    model_review: str = "gpt-6.1-terra"
    model_chat: str = "gpt-6-luna"
    model_moderation: str = "omni-moderation-latest"
    ai_moderation: bool = True
    review_price_in_per_m: float = 1.00
    review_price_out_per_m: float = 5.00
    chat_price_in_per_m: float = 0.10
    chat_price_out_per_m: float = 0.50
    max_messages_per_day: int = 20
    max_reviews_per_day: int = 5
    monthly_ai_budget_usd: float = 3.0
    max_artifact_chars: int = 8000
    max_chat_chars: int = 1500
    max_output_chars: int = 2000

    # Product rules (Requirement Baseline v1.1).
    free_lessons: int = 10

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_list(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
