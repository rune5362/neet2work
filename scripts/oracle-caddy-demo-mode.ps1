param(
  [ValidateSet("enable", "disable", "status")]
  [string]$Action = "status",
  [string]$OracleHost = "129.146.96.211",
  [string]$OracleUser = "ubuntu",
  [string]$SshKey = "$env:USERPROFILE\.ssh\neet2work-prod.key",
  [string]$Domain = "neet2work.duckdns.org",
  [int]$DemoApiPort = 3900,
  [int]$FrontendPort = 8080
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SshKey)) {
  throw "SSH key not found: $SshKey"
}

$remoteScript = @'
set -euo pipefail

ACTION="$1"
DOMAIN="$2"
DEMO_API_PORT="$3"
FRONTEND_PORT="$4"

CADDYFILE="/etc/caddy/Caddyfile"
BACKUP="/etc/caddy/Caddyfile.neet2work-normal.bak"
MARKER="# neet2work demo api tunnel mode"

write_demo_caddyfile() {
  local tmp_file
  tmp_file="$(mktemp)"
  cat > "$tmp_file" <<EOF
$MARKER
$DOMAIN {
  encode gzip

  handle /api/* {
    reverse_proxy 127.0.0.1:$DEMO_API_PORT {
      transport http {
        response_header_timeout 300s
      }
    }
  }

  handle /health {
    reverse_proxy 127.0.0.1:$DEMO_API_PORT {
      transport http {
        response_header_timeout 300s
      }
    }
  }

  handle {
    reverse_proxy 127.0.0.1:$FRONTEND_PORT {
      transport http {
        response_header_timeout 300s
      }
    }
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

case "$ACTION" in
  enable)
    sudo test -f "$CADDYFILE"
    if ! sudo grep -qF "$MARKER" "$CADDYFILE"; then
      sudo cp "$CADDYFILE" "$BACKUP"
    fi
    write_demo_caddyfile
    validate_and_reload
    echo "demo_mode=enabled"
    echo "api_proxy=http://127.0.0.1:$DEMO_API_PORT"
    echo "frontend_proxy=http://127.0.0.1:$FRONTEND_PORT"
    ;;
  disable)
    if sudo test -f "$BACKUP"; then
      sudo cp "$BACKUP" "$CADDYFILE"
      validate_and_reload
      echo "demo_mode=disabled"
      echo "restored=$BACKUP"
    else
      echo "backup_missing=$BACKUP" >&2
      exit 1
    fi
    ;;
  status)
    if sudo grep -qF "$MARKER" "$CADDYFILE"; then
      echo "demo_mode=enabled"
    else
      echo "demo_mode=disabled"
    fi
    curl -fsS -o /dev/null -w "frontend_http=%{http_code}\n" "http://127.0.0.1:$FRONTEND_PORT/" || true
    curl -fsS -o /dev/null -w "demo_api_tunnel_http=%{http_code}\n" "http://127.0.0.1:$DEMO_API_PORT/health" || true
    ;;
  *)
    echo "unknown_action=$ACTION" >&2
    exit 1
    ;;
esac
'@

$target = "$OracleUser@$OracleHost"
$tempScript = Join-Path ([System.IO.Path]::GetTempPath()) "neet2work-caddy-demo-mode-$PID.sh"
$remotePath = "/tmp/neet2work-caddy-demo-mode-$PID.sh"

try {
  $remoteScript = $remoteScript -replace "`r`n", "`n"
  [System.IO.File]::WriteAllText($tempScript, $remoteScript, [System.Text.UTF8Encoding]::new($false))

  & scp -i $SshKey -o StrictHostKeyChecking=accept-new $tempScript "${target}:$remotePath"
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  $remoteCommand = "chmod 700 '$remotePath' && '$remotePath' '$Action' '$Domain' '$DemoApiPort' '$FrontendPort'; status=`$?; rm -f '$remotePath'; exit `$status"
  & ssh -i $SshKey -o StrictHostKeyChecking=accept-new $target $remoteCommand
  exit $LASTEXITCODE
} finally {
  Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
}
