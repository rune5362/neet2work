param(
  [ValidateSet("enable", "disable", "status")]
  [string]$Action = "status",
  [string]$OracleHost = "129.146.96.211",
  [string]$OracleUser = "ubuntu",
  [string]$SshKey = "$env:USERPROFILE\.ssh\neet2work-prod.key",
  [string]$Domain = "neet2work.duckdns.org",
  [string]$RelayPrefix = "/__codex-relay",
  [int]$RelayPort = 3900,
  [int]$FrontendPort = 8080
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SshKey)) {
  throw "SSH key not found: $SshKey"
}

if (-not $RelayPrefix.StartsWith("/")) {
  throw "RelayPrefix must start with '/'."
}

$remoteScript = @'
set -euo pipefail

ACTION="$1"
DOMAIN="$2"
RELAY_PREFIX="$3"
RELAY_PORT="$4"
FRONTEND_PORT="$5"

CADDYFILE="/etc/caddy/Caddyfile"
BACKUP="/etc/caddy/Caddyfile.neet2work-codex-relay.bak"
MARKER="# neet2work codex relay prefix mode"

write_codex_caddyfile() {
  local tmp_file
  tmp_file="$(mktemp)"
  cat > "$tmp_file" <<EOF
$MARKER
$DOMAIN {
  encode gzip

  handle $RELAY_PREFIX/health {
    uri strip_prefix $RELAY_PREFIX
    reverse_proxy 127.0.0.1:$RELAY_PORT
  }

  handle $RELAY_PREFIX/api/codex-bridge-relay/* {
    uri strip_prefix $RELAY_PREFIX
    reverse_proxy 127.0.0.1:$RELAY_PORT
  }

  handle $RELAY_PREFIX/* {
    respond 404
  }

  handle {
    reverse_proxy 127.0.0.1:$FRONTEND_PORT
  }
}
EOF

  sudo install -m 0644 "$tmp_file" "$CADDYFILE"
  rm -f "$tmp_file"
}

validate_and_reload() {
  sudo caddy validate --config "$CADDYFILE"
  sudo systemctl reload caddy
}

restore_backup() {
  sudo cp "$BACKUP" "$CADDYFILE"
  validate_and_reload
}

check_codex_prefix_health() {
  local tmp_file
  local http_code
  tmp_file="$(mktemp)"
  http_code="$(curl -k -sS --resolve "$DOMAIN:443:127.0.0.1" -o "$tmp_file" -w "%{http_code}" "https://$DOMAIN$RELAY_PREFIX/health" || true)"
  echo "codex_prefix_http=$http_code"
  if [[ "$http_code" == "200" ]] && grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$tmp_file" && grep -Eq '"storage"[[:space:]]*:[[:space:]]*"local"' "$tmp_file"; then
    echo "codex_prefix_health=ok"
  else
    echo "codex_prefix_health=unavailable"
  fi
  rm -f "$tmp_file"
}

case "$ACTION" in
  enable)
    sudo test -f "$CADDYFILE"
    if ! sudo grep -qF "$MARKER" "$CADDYFILE"; then
      sudo cp "$CADDYFILE" "$BACKUP"
    fi
    write_codex_caddyfile
    if ! validate_and_reload; then
      if sudo test -f "$BACKUP"; then
        restore_backup || true
      fi
      exit 1
    fi
    echo "codex_caddy_relay_mode=enabled"
    echo "codex_prefix=https://$DOMAIN$RELAY_PREFIX"
    echo "relay_proxy=http://127.0.0.1:$RELAY_PORT"
    echo "frontend_proxy=http://127.0.0.1:$FRONTEND_PORT"
    ;;
  disable)
    if sudo grep -qF "$MARKER" "$CADDYFILE"; then
      if ! sudo test -f "$BACKUP"; then
        echo "backup_missing=$BACKUP" >&2
        exit 1
      fi
      restore_backup
      sudo rm -f "$BACKUP"
      echo "codex_caddy_relay_mode=disabled"
      echo "restored=$BACKUP"
    else
      echo "codex_caddy_relay_mode=disabled"
    fi
    ;;
  status)
    if sudo grep -qF "$MARKER" "$CADDYFILE"; then
      echo "codex_caddy_relay_mode=enabled"
    else
      echo "codex_caddy_relay_mode=disabled"
    fi
    check_codex_prefix_health
    curl -k -fsS --resolve "$DOMAIN:443:127.0.0.1" -o /dev/null -w "public_frontend_http=%{http_code}\n" "https://$DOMAIN/" || true
    ;;
  *)
    echo "unknown_action=$ACTION" >&2
    exit 1
    ;;
esac
'@

$target = "$OracleUser@$OracleHost"
$tempScript = Join-Path ([System.IO.Path]::GetTempPath()) "neet2work-codex-caddy-relay-$PID.sh"
$remotePath = "/tmp/neet2work-codex-caddy-relay-$PID.sh"

try {
  $remoteScript = $remoteScript -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($tempScript, $remoteScript, [System.Text.UTF8Encoding]::new($false))

  & scp -i $SshKey -o StrictHostKeyChecking=accept-new $tempScript "${target}:$remotePath"
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $remoteCommand = "chmod 700 '$remotePath' && '$remotePath' '$Action' '$Domain' '$RelayPrefix' '$RelayPort' '$FrontendPort'; status=`$?; rm -f '$remotePath'; exit `$status"
  & ssh -i $SshKey -o StrictHostKeyChecking=accept-new $target $remoteCommand
  exit $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
}
