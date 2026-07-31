from app.config import Settings

_normalize = Settings._force_asyncpg_driver


def test_driverless_postgres_urls_get_the_asyncpg_driver():
    # Railway/Render inject `postgresql://`; Heroku's legacy form is `postgres://`.
    assert (
        _normalize("postgresql://u:p@host:5432/kabuka")
        == "postgresql+asyncpg://u:p@host:5432/kabuka"
    )
    assert (
        _normalize("postgres://u:p@host.proxy.rlwy.net:34567/railway")
        == "postgresql+asyncpg://u:p@host.proxy.rlwy.net:34567/railway"
    )


def test_url_that_already_names_a_driver_is_untouched():
    local = "postgresql+asyncpg://postgres:postgres@localhost:5432/kabuka"
    assert _normalize(local) == local
    # A deliberate non-asyncpg driver is the caller's choice; don't rewrite it.
    psycopg = "postgresql+psycopg://u:p@host/db"
    assert _normalize(psycopg) == psycopg


def test_non_postgres_and_malformed_urls_pass_through():
    assert (
        _normalize("sqlite+aiosqlite:///./test.db") == "sqlite+aiosqlite:///./test.db"
    )
    assert _normalize("not-a-url") == "not-a-url"


def test_settings_normalizes_on_construction():
    settings = Settings(DATABASE_URL="postgres://u:p@host:5432/db")
    assert settings.DATABASE_URL.startswith("postgresql+asyncpg://")
