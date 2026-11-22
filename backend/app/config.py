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
    max_artifacts_per_day: int = 30  # stored submissions per user in 24 hours, so storage cannot be filled for free
    max_chat_chars: int = 1500
    max_output_chars: int = 3200  # a structured reply with a table must not be cut mid-table

    # Request body ceiling in bytes, enforced before authentication. The largest legitimate body is an
    # artifact of 8000 characters (up to 32 KB as UTF-8) plus JSON overhead.
    max_body_bytes: int = 65536
    max_upload_bytes: int = 5 * 1024 * 1024  # admin image and PDF uploads, the only route allowed a large body

    # Requests per minute per client address. 0 turns the limit off (tests only). Public routes need no login.
    rate_limit_per_minute: int = 240
    rate_limit_public_per_minute: int = 60

    # Platform-wide AI spend ceilings in USD, on top of the per-user caps. Each user can spend up to
    # monthly_ai_budget_usd, so without these a crowd of accounts is limited only by the provider's own billing limit.
    global_daily_ai_budget_usd: float = 5.0
    global_monthly_ai_budget_usd: float = 50.0

    # Daily interview question email. Sent through Resend. The free Resend plan allows 100 emails a day in total and
    # sign-in codes share that allowance, so the cap here stays well below it.
    resend_api_key: str = Field(default="", repr=False)
    email_from: str = ""
    public_base_url: str = "http://localhost:3000"
    interview_email_daily_cap: int = 80  # all email sent in a day, interview and broadcast together (Resend free: 100)
    mailing_address: str = ""  # postal address printed in the footer of broadcast emails (required by US CAN-SPAM)
    # Browser push (Web Push, VAPID). Generate once with: python -m scripts.gen_vapid. Without both keys push is off.
    vapid_public_key: str = ""
    vapid_private_key: str = Field(default="", repr=False)
    vapid_subject: str = ""  # mailto:you@example.com, sent to push services so they can contact you
    interview_email_send_hour_ist: int = 7  # earliest hour (India time) at which the day's emails go out

    # Product rules (Requirement Baseline v1.1).
    free_lessons: int = 7

    # SuperProfile purchases relayed by the n8n bridge. The secret signs every relay (HMAC-SHA256); with no secret
    # the endpoint refuses everything. Titles must match the SuperProfile payment page titles exactly.
    payment_webhook_secret: str = Field(default="", repr=False)
    payment_webhook_max_age_seconds: int = 300
    superprofile_monthly_title: str = ""
    superprofile_yearly_title: str = ""
    plan_monthly_inr: float = 699
    plan_yearly_inr: float = 3499
    plan_monthly_days: int = 30
    plan_yearly_days: int = 365

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def admin_list(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
