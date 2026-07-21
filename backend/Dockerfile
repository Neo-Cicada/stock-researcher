FROM python:3.12-slim AS base

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

RUN chmod +x docker-entrypoint.sh

EXPOSE 8000

# Applies migrations then starts uvicorn (honors $PORT). See docker-entrypoint.sh.
CMD ["./docker-entrypoint.sh"]
