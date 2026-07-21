#!/bin/sh
# Container entrypoint: apply any pending DB migrations, then start the API.
# Runs migrations on boot so a fresh deploy provisions its schema automatically.
# (For multi-instance deploys, prefer running `alembic upgrade head` as a
# separate release step and starting the server directly — concurrent instances
# racing on the same upgrade is avoidable.)
set -e

echo "Applying database migrations (alembic upgrade head)..."
uv run alembic upgrade head

# Honor a host-injected $PORT (Cloud Run / Railway / Render / Heroku), else 8000.
exec uv run uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
