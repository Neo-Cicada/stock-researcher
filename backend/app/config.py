from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/kabuka"
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    DEBUG: bool = False
    FINNHUB_API_KEY: str = ""
    # SEC EDGAR requires a descriptive User-Agent with contact info on every
    # request (https://www.sec.gov/os/webmaster-faq#developers). Set your own
    # contact in .env (SEC_USER_AGENT) so SEC can reach you if a request pattern
    # misbehaves; this generic default works but has no real contact.
    SEC_USER_AGENT: str = "Kabuka Research (stock-researcher; contact via repo)"


settings = Settings()
