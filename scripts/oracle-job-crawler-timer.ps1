param(
  [ValidateSet("install", "uninstall", "status", "run-now")]
  [string]$Action = "status",
  [string]$OracleHost = "129.146.96.211",
  [string]$OracleUser = "ubuntu",
  [string]$SshKey = "$env:USERPROFILE\.ssh\neet2work-prod.key",
  [string]$DeployRoot = "/opt/neet2work",
  [string]$Sources = "saramin jobkorea linkareer",
  [int]$IntervalMinutes = 60,
  [int]$Limit = 50,
  [int]$SourceCap = 20,
  [int]$CategoryCap = 12,
  [int]$DelaySeconds = 1
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SshKey)) {
  throw "SSH key not found: $SshKey"
}

if ($IntervalMinutes -lt 15) {
  throw "IntervalMinutes must be at least 15."
}

$remoteScript = @'
set -euo pipefail

ACTION="$1"
DEPLOY_ROOT="$2"
SOURCES="$3"
INTERVAL_MINUTES="$4"
LIMIT="$5"
SOURCE_CAP="$6"
CATEGORY_CAP="$7"
DELAY_SECONDS="$8"

SERVICE_NAME="neet2work-job-crawler.service"
TIMER_NAME="neet2work-job-crawler.timer"
ENV_FILE="/etc/default/neet2work-job-crawler"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME"
TIMER_FILE="/etc/systemd/system/$TIMER_NAME"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-neet2work}"

repo_dir="$DEPLOY_ROOT/repo"
current_dir="$DEPLOY_ROOT/current"
compose_dir=""

if [[ -f "$repo_dir/docker-compose.oracle.yml" ]]; then
  compose_dir="$repo_dir"
elif [[ -f "$current_dir/docker-compose.oracle.yml" ]]; then
  compose_dir="$current_dir"
else
  echo "missing_compose=$repo_dir/docker-compose.oracle.yml" >&2
  exit 1
fi

docker_bin() {
  if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    command -v docker
  elif command -v docker >/dev/null 2>&1 && sudo docker ps >/dev/null 2>&1; then
    command -v docker
  else
    echo "Docker is not installed or not usable by this user." >&2
    exit 1
  fi
}

docker_prefix() {
  if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    printf '%s' "$(command -v docker)"
  else
    printf 'sudo %s' "$(command -v docker)"
  fi
}

write_env_file() {
  local tmp_file
  tmp_file="$(mktemp)"
  cat > "$tmp_file" <<EOF
JOB_CRAWLER_SOURCES="$SOURCES"
JOB_CRAWLER_LIMIT="$LIMIT"
JOB_CRAWLER_SOURCE_CAP="$SOURCE_CAP"
JOB_CRAWLER_CATEGORY_CAP="$CATEGORY_CAP"
JOB_CRAWLER_DELAY_SECONDS="$DELAY_SECONDS"
COMPOSE_PROJECT_NAME="$COMPOSE_PROJECT_NAME"
EOF
  sudo install -m 0644 "$tmp_file" "$ENV_FILE"
  rm -f "$tmp_file"
}

write_service_files() {
  local docker_cmd
  local tmp_service
  local tmp_timer
  docker_cmd="$(docker_prefix)"
  tmp_service="$(mktemp)"
  tmp_timer="$(mktemp)"

  cat > "$tmp_service" <<EOF
[Unit]
Description=Neet2Work hourly job crawler
Wants=network-online.target docker.service
After=network-online.target docker.service

[Service]
Type=oneshot
WorkingDirectory=$compose_dir
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/env bash -lc 'set -euo pipefail; cd "$compose_dir"; $docker_cmd compose -p "\${COMPOSE_PROJECT_NAME:-neet2work}" --env-file .env.production -f docker-compose.oracle.yml run --rm --no-deps -e JOB_CRAWLER_SOURCES -e JOB_CRAWLER_LIMIT -e JOB_CRAWLER_SOURCE_CAP -e JOB_CRAWLER_CATEGORY_CAP -e JOB_CRAWLER_DELAY_SECONDS backend bash scripts/run-oracle-job-crawler.sh'
TimeoutStartSec=1800
EOF

  cat > "$tmp_timer" <<EOF
[Unit]
Description=Run Neet2Work job crawler every $INTERVAL_MINUTES minutes

[Timer]
OnBootSec=5min
OnUnitActiveSec=${INTERVAL_MINUTES}min
AccuracySec=1min
Persistent=true
Unit=$SERVICE_NAME

[Install]
WantedBy=timers.target
EOF

  sudo install -m 0644 "$tmp_service" "$SERVICE_FILE"
  sudo install -m 0644 "$tmp_timer" "$TIMER_FILE"
  rm -f "$tmp_service" "$tmp_timer"
}

install_timer() {
  docker_bin >/dev/null
  write_env_file
  write_service_files
  sudo systemctl daemon-reload
  sudo systemctl enable --now "$TIMER_NAME"
  echo "job_crawler_timer=installed"
  echo "compose_dir=$compose_dir"
  echo "interval_minutes=$INTERVAL_MINUTES"
  echo "sources=$SOURCES"
}

uninstall_timer() {
  sudo systemctl disable --now "$TIMER_NAME" >/dev/null 2>&1 || true
  sudo rm -f "$SERVICE_FILE" "$TIMER_FILE" "$ENV_FILE"
  sudo systemctl daemon-reload
  echo "job_crawler_timer=uninstalled"
}

status_timer() {
  echo "compose_dir=$compose_dir"
  if systemctl list-unit-files "$TIMER_NAME" --no-legend 2>/dev/null | grep -q "$TIMER_NAME"; then
    echo "timer_installed=true"
  else
    echo "timer_installed=false"
  fi
  echo "timer_enabled=$(systemctl is-enabled "$TIMER_NAME" 2>/dev/null || true)"
  echo "timer_active=$(systemctl is-active "$TIMER_NAME" 2>/dev/null || true)"
  systemctl show "$TIMER_NAME" -p LastTriggerUSec -p NextElapseUSecRealtime --no-pager 2>/dev/null || true
  systemctl list-timers "$TIMER_NAME" --no-pager 2>/dev/null || true
  journalctl -u "$SERVICE_NAME" -n 60 --no-pager 2>/dev/null || true
}

run_now() {
  if ! systemctl list-unit-files "$SERVICE_NAME" --no-legend 2>/dev/null | grep -q "$SERVICE_NAME"; then
    echo "service_missing=$SERVICE_NAME" >&2
    exit 1
  fi
  sudo systemctl start "$SERVICE_NAME"
  echo "job_crawler_run_now=completed"
  status_timer
}

case "$ACTION" in
  install)
    install_timer
    ;;
  uninstall)
    uninstall_timer
    ;;
  status)
    status_timer
    ;;
  run-now)
    run_now
    ;;
  *)
    echo "unknown_action=$ACTION" >&2
    exit 1
    ;;
esac
'@

$target = "$OracleUser@$OracleHost"
$tempScript = Join-Path ([System.IO.Path]::GetTempPath()) "neet2work-job-crawler-timer-$PID.sh"
$remotePath = "/tmp/neet2work-job-crawler-timer-$PID.sh"

try {
  $remoteScript = $remoteScript -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($tempScript, $remoteScript, [System.Text.UTF8Encoding]::new($false))

  & scp -i $SshKey -o StrictHostKeyChecking=accept-new $tempScript "${target}:$remotePath"
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $remoteCommand = "chmod 700 '$remotePath' && '$remotePath' '$Action' '$DeployRoot' '$Sources' '$IntervalMinutes' '$Limit' '$SourceCap' '$CategoryCap' '$DelaySeconds'; status=`$?; rm -f '$remotePath'; exit `$status"
  & ssh -i $SshKey -o StrictHostKeyChecking=accept-new $target $remoteCommand
  exit $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
}
