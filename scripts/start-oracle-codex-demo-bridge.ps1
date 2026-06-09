param(
  [string]$OracleHost = "129.146.96.211",
  [string]$OracleUser = "ubuntu",
  [string]$SshKey = "$env:USERPROFILE\.ssh\neet2work-prod.key",
  [int]$LocalBackendPort = 3000,
  [int]$RemoteRelayPort = 3900,
  [string]$ClientUrl = "https://neet2work.duckdns.org",
  [string]$CodexHome = "$env:USERPROFILE\.codex",
  [int]$TunnelReadyTimeoutSeconds = 45,
  [int]$RunForSeconds = 0,
  [switch]$SkipOracleRelayConfig,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path $SshKey)) {
  throw "SSH key not found: $SshKey"
}

if (-not (Test-Path $CodexHome)) {
  Write-Warning "Codex home was not found yet: $CodexHome"
  Write-Warning "Codex Bridge can stay offline until Codex CLI/Desktop login creates this directory."
}

function Test-TcpPortOpen {
  param([int]$Port)

  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $connect = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    if (-not $connect.AsyncWaitHandle.WaitOne(500, $false)) {
      return $false
    }

    $client.EndConnect($connect)
    return $true
  } catch {
    return $false
  } finally {
    $client.Close()
  }
}

function New-RelayToken {
  $bytes = [byte[]]::new(32)
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $rng.GetBytes($bytes)
  } finally {
    $rng.Dispose()
  }
  return [Convert]::ToBase64String($bytes).TrimEnd("=").Replace("+", "-").Replace("/", "_")
}

$relayToken = New-RelayToken
$clientBaseUrl = $ClientUrl.TrimEnd([char[]]"/")
$clientDomain = ([Uri]$clientBaseUrl).Host
$relayPrefix = "/__codex-relay"
$remoteTunnelBaseUrl = "http://127.0.0.1:$RemoteRelayPort"
$remoteRelayBaseUrl = "$clientBaseUrl$relayPrefix"

$backendEnv = @{
  "PORT" = "$LocalBackendPort"
  "CLIENT_URL" = $ClientUrl
  "ALLOW_LOCALHOST_ORIGINS" = "true"
  "REQUIRE_HTTPS" = "false"
  "CODEX_BRIDGE_ENABLED" = "true"
  "CODEX_BRIDGE_HOME" = $CodexHome
  "CODEX_BRIDGE_RELAY_ENABLED" = "true"
  "CODEX_BRIDGE_RELAY_TOKEN" = $relayToken
  "AI_PROVIDER_ORDER" = "codex_bridge,fallback"
}

Write-Host "Starting local Codex relay backend..."
Write-Host "Local relay:    http://127.0.0.1:$LocalBackendPort"
Write-Host "Oracle tunnel:  $remoteTunnelBaseUrl -> local 127.0.0.1:$LocalBackendPort"
Write-Host "Public relay:   $remoteRelayBaseUrl -> Oracle tunnel"
Write-Host "Public site:    $clientBaseUrl"
Write-Host "Oracle backend: stays active; only Codex Bridge is delegated to this PC"
Write-Host ""

if ($DryRun) {
  Write-Host "Dry run only. Local backend, SSH tunnel, Caddy relay prefix, and Oracle backend relay config were not started."
  exit 0
}

if (Test-TcpPortOpen -Port $LocalBackendPort) {
  throw "Local port $LocalBackendPort is already in use. Close the previous 2-demo window or backend process first, then rerun this script."
}

function Invoke-OracleShell {
  param([string]$Command)

  $target = "$OracleUser@$OracleHost"
  $output = & ssh -i $SshKey -o StrictHostKeyChecking=accept-new $target $Command
  $exitCode = $LASTEXITCODE

  if ($exitCode -ne 0) {
    $output | ForEach-Object { Write-Host $_ }
    throw "Oracle shell command failed with exit code $exitCode."
  }

  return $output
}

function Invoke-OracleCodexRelayMode {
  param(
    [ValidateSet("enable", "disable", "status")]
    [string]$Action
  )

  $scriptPath = Join-Path $PSScriptRoot "oracle-codex-relay-mode.ps1"
  $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
    -Action $Action `
    -OracleHost $OracleHost `
    -OracleUser $OracleUser `
    -SshKey $SshKey `
    -RemoteBaseUrl $remoteRelayBaseUrl `
    -RelayToken $relayToken

  $exitCode = $LASTEXITCODE
  $output | ForEach-Object { Write-Host $_ }

  if ($exitCode -ne 0) {
    throw "Oracle Codex relay mode '$Action' failed with exit code $exitCode."
  }

  return $output
}

function Invoke-OracleCodexCaddyRelay {
  param(
    [ValidateSet("enable", "disable", "status")]
    [string]$Action
  )

  $scriptPath = Join-Path $PSScriptRoot "oracle-codex-caddy-relay.ps1"
  $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
    -Action $Action `
    -OracleHost $OracleHost `
    -OracleUser $OracleUser `
    -SshKey $SshKey `
    -Domain $clientDomain `
    -RelayPrefix $relayPrefix `
    -RelayPort $RemoteRelayPort

  $exitCode = $LASTEXITCODE
  $output | ForEach-Object { Write-Host $_ }

  if ($exitCode -ne 0) {
    throw "Oracle Codex Caddy relay '$Action' failed with exit code $exitCode."
  }

  return $output
}

$backendJob = Start-Job -Name "neet2work-local-codex-relay-backend" -ScriptBlock {
  param($RepoRoot, $EnvPairs)

  Set-Location $RepoRoot
  foreach ($key in $EnvPairs.Keys) {
    [Environment]::SetEnvironmentVariable([string]$key, [string]$EnvPairs[$key], "Process")
  }

  corepack pnpm --filter @neet2work/backend dev
} -ArgumentList $repoRoot, $backendEnv

$tunnelJob = $null
$relayEnabled = $false
$caddyRelayEnabled = $false

try {
  $healthUrl = "http://127.0.0.1:$LocalBackendPort/health"
  $relayStatusUrl = "http://127.0.0.1:$LocalBackendPort/api/codex-bridge-relay/status"
  $deadline = (Get-Date).AddSeconds(60)
  $healthy = $false

  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2
    if ($backendJob.State -ne "Running") {
      break
    }

    try {
      $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 3
      if ($response.ok) {
        $healthy = $true
        break
      }
    } catch {
      # Keep waiting until the backend finishes booting.
    }
  }

  if (-not $healthy) {
    Write-Host "Local relay backend did not become healthy. Recent backend output:"
    Receive-Job -Job $backendJob -Keep | Select-Object -Last 40
    exit 1
  }

  Write-Host "Local relay backend is healthy."

  try {
    $headers = @{ Authorization = "Bearer $relayToken" }
    $codexStatus = Invoke-RestMethod -Uri $relayStatusUrl -Headers $headers -TimeoutSec 10
    $provider = $codexStatus.data
    $reason = if ($provider.reason) { " reason=$($provider.reason)" } else { "" }
    Write-Host "local_codex online=$($provider.online) configured=$($provider.configured)$reason"

    if (-not $provider.configured -or -not $provider.online -or $provider.quotaExceeded) {
      throw "Local Codex is not ready: online=$($provider.online) configured=$($provider.configured)$reason"
    }
  } catch {
    Write-Host "Local Codex relay status check failed. Recent backend output:"
    Receive-Job -Job $backendJob -Keep | Select-Object -Last 40
    throw $_
  }

  Write-Host ""
  Write-Host "Opening SSH reverse tunnel for Codex relay..."
  Write-Host ""

  $tunnelJob = Start-Job -Name "neet2work-oracle-codex-relay-tunnel" -ScriptBlock {
    param($SshKey, $OracleUser, $OracleHost, $RemoteRelayPort, $LocalBackendPort)

    & ssh `
      -i $SshKey `
      -o StrictHostKeyChecking=accept-new `
      -o ExitOnForwardFailure=yes `
      -o ServerAliveInterval=30 `
      -o ServerAliveCountMax=3 `
      -N `
      -R "127.0.0.1:${RemoteRelayPort}:127.0.0.1:${LocalBackendPort}" `
      "$OracleUser@$OracleHost"

    exit $LASTEXITCODE
  } -ArgumentList $SshKey, $OracleUser, $OracleHost, $RemoteRelayPort, $LocalBackendPort

  $deadline = (Get-Date).AddSeconds($TunnelReadyTimeoutSeconds)
  $tunnelReady = $false

  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2

    if ($tunnelJob.State -ne "Running") {
      Write-Host "SSH relay tunnel stopped before it became ready. Recent tunnel output:"
      Receive-Job -Job $tunnelJob -Keep | Select-Object -Last 40
      exit 1
    }

    $statusOutput = Invoke-OracleShell "curl -fsS -o /dev/null -w 'relay_health_http=%{http_code}\n' '$remoteTunnelBaseUrl/health' || true"
    $statusOutput | ForEach-Object { Write-Host $_ }
    if (($statusOutput -join "`n") -match "relay_health_http=200") {
      $tunnelReady = $true
      break
    }
  }

  if (-not $tunnelReady) {
    throw "SSH relay tunnel did not become reachable from Oracle within $TunnelReadyTimeoutSeconds seconds."
  }

  Write-Host ""
  Write-Host "Enabling Oracle Caddy Codex relay prefix..."
  Invoke-OracleCodexCaddyRelay -Action enable | Out-Null
  $caddyRelayEnabled = $true

  $caddyReadyDeadline = (Get-Date).AddSeconds(30)
  $caddyReady = $false
  while ((Get-Date) -lt $caddyReadyDeadline) {
    Start-Sleep -Seconds 2
    $statusOutput = Invoke-OracleCodexCaddyRelay -Action status
    if (($statusOutput -join "`n") -match "codex_prefix_health=ok") {
      $caddyReady = $true
      break
    }
  }

  if (-not $caddyReady) {
    throw "Oracle Caddy Codex relay prefix did not become healthy within 30 seconds."
  }

  if (-not $SkipOracleRelayConfig) {
    Write-Host ""
    Write-Host "Enabling Oracle backend Codex relay mode..."
    Invoke-OracleCodexRelayMode -Action enable | Out-Null
    $relayEnabled = $true

    $publicReadyDeadline = (Get-Date).AddSeconds(60)
    $publicReady = $false
    $lastPublicReason = "not_checked"

    while ((Get-Date) -lt $publicReadyDeadline) {
      Start-Sleep -Seconds 3

      $statusOutput = Invoke-OracleCodexRelayMode -Action status
      if (($statusOutput -join "`n") -notmatch "relay_health_http=200") {
        $lastPublicReason = "oracle_cannot_reach_relay"
        continue
      }

      try {
        $providers = Invoke-RestMethod -Uri "$clientBaseUrl/api/draft-workflow/providers" -TimeoutSec 10
        $codexProvider = @($providers.data) | Where-Object { $_.providerId -eq "codex_bridge" } | Select-Object -First 1
        $lastPublicReason = if ($codexProvider.reason) { $codexProvider.reason } else { "unknown" }
        Write-Host "public_codex online=$($codexProvider.online) configured=$($codexProvider.configured) reason=$lastPublicReason"

        if ($codexProvider.online -and $codexProvider.configured -and -not $codexProvider.quotaExceeded) {
          $publicReady = $true
          break
        }
      } catch {
        $lastPublicReason = $_.Exception.Message
      }
    }

    if (-not $publicReady) {
      throw "Oracle Codex relay did not become online within 60 seconds. Last reason: $lastPublicReason"
    }
  }

  Write-Host ""
  Write-Host "Codex relay is ready: $clientBaseUrl"
  Write-Host "Gemini and other APIs continue to run on the Oracle backend."
  Write-Host "Keep this window open during the Codex demo."
  Write-Host "Press Ctrl+C or close this window to restore Oracle backend/Caddy config and stop the tunnel."
  Write-Host ""

  if ($RunForSeconds -gt 0) {
    Write-Host "Self-test mode: keeping Codex relay open for $RunForSeconds seconds before automatic restore."
    Start-Sleep -Seconds $RunForSeconds
    return
  }

  while ($tunnelJob.State -eq "Running" -and $backendJob.State -eq "Running") {
    Start-Sleep -Seconds 2
  }

  if ($tunnelJob.State -ne "Running") {
    Write-Host "SSH relay tunnel stopped. Recent tunnel output:"
    Receive-Job -Job $tunnelJob -Keep | Select-Object -Last 40
  }

  if ($backendJob.State -ne "Running") {
    Write-Host "Local relay backend stopped. Recent backend output:"
    Receive-Job -Job $backendJob -Keep | Select-Object -Last 40
  }
} finally {
  if ($relayEnabled) {
    Write-Host ""
    Write-Host "Restoring Oracle backend normal Codex config..."
    try {
      Invoke-OracleCodexRelayMode -Action disable | Out-Null
    } catch {
      Write-Warning "Failed to restore Oracle backend automatically: $($_.Exception.Message)"
      Write-Warning "Run manually: oracle-codex-relay-mode.cmd -Action disable"
    }
  }

  if ($caddyRelayEnabled) {
    Write-Host ""
    Write-Host "Restoring Oracle Caddy normal config..."
    try {
      Invoke-OracleCodexCaddyRelay -Action disable | Out-Null
    } catch {
      Write-Warning "Failed to restore Oracle Caddy automatically: $($_.Exception.Message)"
      Write-Warning "Run manually: oracle-codex-caddy-relay.cmd -Action disable"
    }
  }

  if ($tunnelJob -and $tunnelJob.State -eq "Running") {
    Stop-Job -Job $tunnelJob
  }
  if ($tunnelJob) {
    Receive-Job -Job $tunnelJob -Keep -ErrorAction SilentlyContinue | Select-Object -Last 20 | ForEach-Object { Write-Host $_ }
    Remove-Job -Job $tunnelJob -Force
  }

  if ($backendJob.State -eq "Running") {
    Stop-Job -Job $backendJob
  }
  Receive-Job -Job $backendJob -Keep -ErrorAction SilentlyContinue | Select-Object -Last 20 | ForEach-Object { Write-Host $_ }
  Remove-Job -Job $backendJob -Force
}
