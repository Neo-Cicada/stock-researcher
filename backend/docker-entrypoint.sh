#!/bin/sh
# Container entrypoint: apply any pending DB migrations, then start the API.
# Runs migrations on boot so a fresh deploy provisions its schema automatically.
# (For multi-instance deploys, prefer running `alembic upgrade head` as a
# separate release step and starting the server directly — concurrent instances
# racing on the same upgrade is avoidable.)
set -e

# --frozen --no-dev keeps `uv run` from re-syncing the environment at boot: the
# image was built with `uv sync --frozen --no-dev`, and a bare `uv run` treats
# that venv as out of date and reinstalls the dev group (ruff, pytest, …) on
# every container start — needless network/PyPI work on the critical boot path,
# and a hard failure (set -e, no Python traceback) if it can't reach the index.
UV_RUN="uv run --frozen --no-dev"

echo "Applying database migrations (alembic upgrade head)..."
$UV_RUN alembic upgrade head

# Honor a host-injected $PORT (Cloud Run / Railway / Render / Heroku), else 8000.
exec $UV_RUN uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
