from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Railway (like most managed Postgres hosts) fronts the database with a TCP
# proxy that silently drops connections idle for a few minutes. Our background
# tasks sleep 5 / 10 / 60 minutes between DB touches, so with SQLAlchemy's
# defaults the next cycle checks a pooled connection back out that the server
# already killed and the first statement fails with an asyncpg-level
# InterfaceError (https://sqlalche.me/e/20/rvf5) — the crash seen in production.
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    # The actual fix: emit a cheap liveness check before handing a pooled
    # connection out. A dead one is discarded and replaced transparently.
    pool_pre_ping=True,
    # Belt and braces: proactively retire connections older than 5 minutes, so
    # they're recycled by us before the proxy's idle timeout reaps them.
    pool_recycle=300,
    # Sized for a small managed Postgres plan, whose max_connections is shared
    # with migrations, psql sessions and any other running instance: this
    # process opens at most pool_size + max_overflow = 15 connections.
    pool_size=5,
    max_overflow=10,
    # Fail fast (TimeoutError) instead of hanging a request forever when every
    # pooled connection is checked out.
    pool_timeout=30,
)
async_session = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session() as session:
        yield session
