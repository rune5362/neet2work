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

install_job_crawler_timer() {
  if [[ "${ENABLE_JOB_CRAWLER_TIMER:-true}" != "true" ]]; then
    echo "Job crawler timer install skipped: ENABLE_JOB_CRAWLER_TIMER is not true."
    return
  fi

  if ! command -v systemctl >/dev/null 2>&1 || [[ ! -d /etc/systemd/system ]]; then
    echo "Job crawler timer install skipped: systemd is not available."
    return
  fi

  if ! command -v docker >/dev/null 2>&1; then
    echo "Job crawler timer install skipped: docker is not installed."
    return
  fi

  local compose_dir
  local docker_path
  local env_tmp
  local service_tmp
  local timer_tmp
  local service_name
  local timer_name
  local timer_env_file
  compose_dir="$(pwd)"
  docker_path="$(command -v docker)"
  env_tmp="$(mktemp)"
  service_tmp="$(mktemp)"
  timer_tmp="$(mktemp)"
  service_name="neet2work-job-crawler.service"
  timer_name="neet2work-job-crawler.timer"
  timer_env_file="/etc/default/neet2work-job-crawler"

  cat > "$env_tmp" <<EOF
JOB_CRAWLER_SOURCES="${JOB_CRAWLER_SOURCES:-saramin jobkorea linkareer}"
JOB_CRAWLER_LIMIT="${JOB_CRAWLER_LIMIT:-50}"
JOB_CRAWLER_SOURCE_CAP="${JOB_CRAWLER_SOURCE_CAP:-20}"
JOB_CRAWLER_CATEGORY_CAP="${JOB_CRAWLER_CATEGORY_CAP:-12}"
JOB_CRAWLER_DELAY_SECONDS="${JOB_CRAWLER_DELAY_SECONDS:-1}"
COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME"
EOF

  cat > "$service_tmp" <<EOF
[Unit]
Description=Neet2Work hourly job crawler
Wants=network-online.target docker.service
After=network-online.target docker.service

[Service]
Type=oneshot
WorkingDirectory=$compose_dir
EnvironmentFile=$timer_env_file
ExecStart=/usr/bin/env bash -lc 'set -euo pipefail; cd "$compose_dir"; $docker_path compose -p "\${COMPOSE_PROJECT_NAME:-neet2work}" --env-file $ENV_FILE -f $COMPOSE_FILE run --rm --no-deps -e JOB_CRAWLER_SOURCES -e JOB_CRAWLER_LIMIT -e JOB_CRAWLER_SOURCE_CAP -e JOB_CRAWLER_CATEGORY_CAP -e JOB_CRAWLER_DELAY_SECONDS backend bash scripts/run-oracle-job-crawler.sh'
TimeoutStartSec=1800
EOF

  cat > "$timer_tmp" <<EOF
[Unit]
Description=Run Neet2Work job crawler every ${JOB_CRAWLER_INTERVAL_MINUTES:-60} minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=${JOB_CRAWLER_INTERVAL_MINUTES:-60}min
AccuracySec=1min
Persistent=true
Unit=$service_name

[Install]
WantedBy=timers.target
EOF

  sudo install -m 0644 "$env_tmp" "$timer_env_file"
  sudo install -m 0644 "$service_tmp" "/etc/systemd/system/$service_name"
  sudo install -m 0644 "$timer_tmp" "/etc/systemd/system/$timer_name"
  rm -f "$env_tmp" "$service_tmp" "$timer_tmp"

  sudo systemctl daemon-reload
  sudo systemctl enable --now "$timer_name"
  echo "Job crawler timer installed: $timer_name every ${JOB_CRAWLER_INTERVAL_MINUTES:-60} minutes."

  if sudo systemctl start "$service_name"; then
    echo "Job crawler immediate run completed."
  else
    echo "Job crawler immediate run failed; hourly timer remains installed." >&2
    sudo journalctl -u "$service_name" -n 80 --no-pager >&2 || true
  fi
}

"${COMPOSE[@]}" build
"${COMPOSE[@]}" run --rm backend pnpm --filter @neet2work/backend run db:deploy
"${COMPOSE[@]}" up -d backend frontend --remove-orphans
"${COMPOSE[@]}" ps

health_url="http://127.0.0.1:${HTTP_PORT:-8080}/health"

for attempt in {1..30}; do
  if curl -fsS -H "X-Forwarded-Proto: https" "$health_url" >/dev/null; then
    install_job_crawler_timer
    echo "Oracle deployment completed."
    exit 0
  fi

  sleep 2
done

echo "Deployment started, but health check did not pass in time." >&2
"${COMPOSE[@]}" logs --tail=80 backend frontend >&2
exit 1
