#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/neet2work}"
REPO_URL="${REPO_URL:-https://github.com/rune5362/neet2work.git}"
BRANCH="${BRANCH:-main}"
REPO_DIR="$DEPLOY_ROOT/repo"
ENV_FILE="$DEPLOY_ROOT/.env.production"
STATE_FILE="$DEPLOY_ROOT/.deployed-sha"
LOCK_FILE="$DEPLOY_ROOT/.deploy.lock"

mkdir -p "$DEPLOY_ROOT"

(
  flock -n 9 || exit 0

  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE" >&2
    exit 1
  fi

  if [[ ! -d "$REPO_DIR/.git" ]]; then
    rm -rf "$REPO_DIR"
    git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$REPO_DIR"
  fi

  cd "$REPO_DIR"
  git fetch origin "$BRANCH"
  remote_sha="$(git rev-parse "origin/$BRANCH")"
  deployed_sha="$(cat "$STATE_FILE" 2>/dev/null || true)"

  if [[ "$remote_sha" == "$deployed_sha" ]]; then
    exit 0
  fi

  git checkout --force "$remote_sha"

  if [[ ! -f scripts/deploy-oracle.sh || ! -f docker-compose.oracle.yml ]]; then
    echo "Deploy files are not present on $BRANCH yet; skipping $remote_sha." >&2
    printf "%s\n" "$remote_sha" > "$STATE_FILE"
    exit 0
  fi

  cp "$ENV_FILE" .env.production
  bash scripts/deploy-oracle.sh
  printf "%s\n" "$remote_sha" > "$STATE_FILE"
) 9>"$LOCK_FILE"
