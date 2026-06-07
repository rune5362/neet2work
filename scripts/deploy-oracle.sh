#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.oracle.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-neet2work}"
export COMPOSE_PROJECT_NAME

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Create it from deploy/oracle/env.production.example first." >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
  DOCKER=(docker)
elif command -v docker >/dev/null 2>&1 && sudo docker ps >/dev/null 2>&1; then
  DOCKER=(sudo docker)
else
  echo "Docker is not installed or not usable by this user." >&2
  exit 1
fi

COMPOSE=("${DOCKER[@]}" compose -p "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" -f "$COMPOSE_FILE")

"${COMPOSE[@]}" build
"${COMPOSE[@]}" run --rm backend pnpm --filter @neet2work/backend run db:deploy
"${COMPOSE[@]}" up -d backend frontend --remove-orphans
"${COMPOSE[@]}" ps

health_url="http://127.0.0.1:${HTTP_PORT:-8080}/health"

for attempt in {1..30}; do
  if curl -fsS -H "X-Forwarded-Proto: https" "$health_url" >/dev/null; then
    echo "Oracle deployment completed."
    exit 0
  fi

  sleep 2
done

echo "Deployment started, but health check did not pass in time." >&2
"${COMPOSE[@]}" logs --tail=80 backend frontend >&2
exit 1
