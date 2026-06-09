param(
  [ValidateSet("enable", "disable", "status")]
  [string]$Action = "status",
  [string]$OracleHost = "129.146.96.211",
  [string]$OracleUser = "ubuntu",
  [string]$SshKey = "$env:USERPROFILE\.ssh\neet2work-prod.key",
  [string]$DeployRoot = "/opt/neet2work",
  [string]$RemoteBaseUrl = "http://127.0.0.1:3900",
  [string]$RelayToken = ""
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SshKey)) {
  throw "SSH key not found: $SshKey"
}

$remoteScript = @'
set -euo pipefail

ACTION="$1"
DEPLOY_ROOT="$2"
REMOTE_BASE_URL="$3"
RELAY_TOKEN="$4"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-neet2work}"

root_env="$DEPLOY_ROOT/.env.production"
current_dir="$DEPLOY_ROOT/current"
current_env="$current_dir/.env.production"

env_files=()
if [[ -f "$root_env" ]]; then
  env_files+=("$root_env")
fi
if [[ -f "$current_env" && "$current_env" != "$root_env" ]]; then
  env_files+=("$current_env")
fi

if [[ ${#env_files[@]} -eq 0 ]]; then
  echo "missing_env=$root_env" >&2
  exit 1
fi

docker_cmd() {
  if command -v docker >/dev/null 2>&1 && docker ps >/dev/null 2>&1; then
    docker "$@"
  elif command -v docker >/dev/null 2>&1 && sudo docker ps >/dev/null 2>&1; then
    sudo docker "$@"
  else
    echo "Docker is not installed or not usable by this user." >&2
    exit 1
  fi
}

restart_backend() {
  if [[ ! -d "$current_dir" ]]; then
    echo "missing_current=$current_dir" >&2
    exit 1
  fi

  cd "$current_dir"
  docker_cmd compose \
    -p "$COMPOSE_PROJECT_NAME" \
    --env-file .env.production \
    -f docker-compose.oracle.yml \
    up -d --no-deps --force-recreate backend
}

set_env_key() {
  local file="$1"
  local tmp
  tmp="$(mktemp)"
  grep -vE '^(CODEX_BRIDGE_ENABLED|CODEX_BRIDGE_REMOTE_BASE_URL|CODEX_BRIDGE_RELAY_TOKEN)=' "$file" > "$tmp" || true
  {
    cat "$tmp"
    printf 'CODEX_BRIDGE_ENABLED=true\n'
    printf 'CODEX_BRIDGE_REMOTE_BASE_URL=%s\n' "$REMOTE_BASE_URL"
    printf 'CODEX_BRIDGE_RELAY_TOKEN=%s\n' "$RELAY_TOKEN"
  } > "$file"
  rm -f "$tmp"
}

enable_relay() {
  if [[ -z "$RELAY_TOKEN" ]]; then
    echo "relay_token_required=true" >&2
    exit 1
  fi

  for file in "${env_files[@]}"; do
    local_backup="$file.neet2work-codex-relay.bak"
    if [[ ! -f "$local_backup" ]]; then
      cp "$file" "$local_backup"
    fi
    set_env_key "$file"
  done

  restart_backend
  echo "codex_relay_mode=enabled"
}

restore_or_remove_relay() {
  local file="$1"
  local backup="$file.neet2work-codex-relay.bak"
  local tmp

  if [[ -f "$backup" ]]; then
    cp "$backup" "$file"
    rm -f "$backup"
    return
  fi

  tmp="$(mktemp)"
  grep -vE '^(CODEX_BRIDGE_ENABLED|CODEX_BRIDGE_REMOTE_BASE_URL|CODEX_BRIDGE_RELAY_TOKEN)=' "$file" > "$tmp" || true
  {
    cat "$tmp"
    printf 'CODEX_BRIDGE_ENABLED=false\n'
  } > "$file"
  rm -f "$tmp"
}

disable_relay() {
  for file in "${env_files[@]}"; do
    restore_or_remove_relay "$file"
  done

  restart_backend
  echo "codex_relay_mode=disabled"
}

status_relay() {
  local enabled="false"
  for file in "${env_files[@]}"; do
    if grep -q '^CODEX_BRIDGE_REMOTE_BASE_URL=' "$file"; then
      enabled="true"
    fi
  done

  if [[ "$enabled" == "true" ]]; then
    echo "codex_relay_mode=enabled"
  else
    echo "codex_relay_mode=disabled"
  fi

  curl -fsS -o /dev/null -w "relay_health_http=%{http_code}\n" "$REMOTE_BASE_URL/health" || true
  curl -fsS -H "X-Forwarded-Proto: https" -o /dev/null -w "provider_http=%{http_code}\n" "http://127.0.0.1:${HTTP_PORT:-8080}/api/draft-workflow/providers" || true
}

case "$ACTION" in
  enable)
    enable_relay
    ;;
  disable)
    disable_relay
    ;;
  status)
    status_relay
    ;;
  *)
    echo "unknown_action=$ACTION" >&2
    exit 1
    ;;
esac
'@

$target = "$OracleUser@$OracleHost"
$tempScript = Join-Path ([System.IO.Path]::GetTempPath()) "neet2work-codex-relay-mode-$PID.sh"
$remotePath = "/tmp/neet2work-codex-relay-mode-$PID.sh"

try {
  $remoteScript = $remoteScript -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($tempScript, $remoteScript, [System.Text.UTF8Encoding]::new($false))

  & scp -i $SshKey -o StrictHostKeyChecking=accept-new $tempScript "${target}:$remotePath"
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $remoteCommand = "chmod 700 '$remotePath' && '$remotePath' '$Action' '$DeployRoot' '$RemoteBaseUrl' '$RelayToken'; status=`$?; rm -f '$remotePath'; exit `$status"
  & ssh -i $SshKey -o StrictHostKeyChecking=accept-new $target $remoteCommand
  exit $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
}
