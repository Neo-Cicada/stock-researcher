from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Required — no committed default so the connection string (with its
    # credentials) lives only in .env, never in source. See .env.example for the
    # expected format.
    DATABASE_URL: str
    # Exact frontend origins allowed by CORS. Set to your real domain(s) in
    # production, e.g. ["https://kabuka.example.com"]. Never use ["*"] — the app
    # sends no credentials, but a wildcard invites abuse of the upstream-proxying
    # endpoints from any site.
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    # DEBUG also gates the interactive API docs (/docs, /redoc, /openapi.json):
    # they are only served when DEBUG is true, so the schema isn't advertised in
    # production.
    DEBUG: bool = False
    FINNHUB_API_KEY: str = ""
    # Free key from https://fredaccount.stlouisfed.org/apikeys — powers the
    # economic-events calendar (CPI, jobs, GDP, PCE, PPI release dates) on the
    # /events page. Empty (default) → the calendar falls back to Finnhub (a
    # premium endpoint that 403s on a free key) and then to frontend mock.
    FRED_API_KEY: str = ""
    # Per-client request ceiling for the whole API (slowapi syntax). Tune to
    # taste; protects the yfinance/Finnhub/SEC-proxying endpoints from abuse.
    RATE_LIMIT_DEFAULT: str = "120/minute"
    # Shared secret guarding the manual POST /api/reddit/fetch trigger. Empty
    # (the default) disables the endpoint entirely — the background task already
    # refreshes trending data, so production needs no manual trigger.
    ADMIN_TOKEN: str = ""
    # SEC EDGAR requires a descriptive User-Agent with contact info on every
    # request (https://www.sec.gov/os/webmaster-faq#developers). Set your own
    # contact in .env (SEC_USER_AGENT) so SEC can reach you if a request pattern
    # misbehaves; this generic default works but has no real contact.
    SEC_USER_AGENT: str = "Kabuka Research (stock-researcher; contact via repo)"

    @field_validator("DATABASE_URL")
    @classmethod
    def _force_asyncpg_driver(cls, value: str) -> str:
        """Normalize a driver-less Postgres URL to the asyncpg scheme.

        Managed hosts (Railway, Render, Heroku) inject DATABASE_URL as
        `postgresql://…` — or the legacy `postgres://…` — but this app's engine
        is SQLAlchemy async and needs an explicit `+asyncpg`; without it
        create_async_engine() falls back to the default psycopg2 driver, which
        isn't installed, and the app dies at import (crash-looping the
        container, since docker-entrypoint.sh runs alembic under `set -e`).
        Rewriting the scheme here lets a host's variable reference be wired
        straight through; a URL that already names a driver (the
        `postgresql+asyncpg://…` in .env.example) is returned untouched.
        """
        scheme, sep, rest = value.partition("://")
        if not sep or "+" in scheme:
            return value
        if scheme in ("postgres", "postgresql"):
            return f"postgresql+asyncpg://{rest}"
        return value


settings = Settings()
