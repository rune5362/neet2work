param(
  [string]$OracleHost = "129.146.96.211",
  [string]$OracleUser = "ubuntu",
  [string]$SshKey = "$env:USERPROFILE\.ssh\neet2work-prod.key",
  [int]$LocalBackendPort = 3000,
  [int]$RemoteApiPort = 3900,
  [string]$ClientUrl = "https://neet2work.duckdns.org",
  [string]$CodexHome = "$env:USERPROFILE\.codex",
  [string]$Domain = "neet2work.duckdns.org",
  [int]$FrontendPort = 8080,
  [int]$TunnelReadyTimeoutSeconds = 45,
  [switch]$SkipCaddyDemoMode,
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

$backendEnv = @{
  "PORT" = "$LocalBackendPort"
  "CLIENT_URL" = $ClientUrl
  "ALLOW_LOCALHOST_ORIGINS" = "true"
  "REQUIRE_HTTPS" = "false"
  "CODEX_BRIDGE_ENABLED" = "true"
  "CODEX_BRIDGE_HOME" = $CodexHome
  "AI_PROVIDER_ORDER" = "codex_bridge,gemini,local,fallback"
}

Write-Host "Starting local backend with Codex Bridge..."
Write-Host "Backend: http://127.0.0.1:$LocalBackendPort"
Write-Host "Client:  $ClientUrl"
Write-Host "Tunnel:  Oracle 127.0.0.1:$RemoteApiPort -> local 127.0.0.1:$LocalBackendPort"
Write-Host "Caddy:   auto demo mode $(@{ $true = 'off'; $false = 'on' }[$SkipCaddyDemoMode.IsPresent])"
Write-Host ""

if ($DryRun) {
  Write-Host "Dry run only. Backend, SSH tunnel, and Caddy changes were not started."
  exit 0
}

function Invoke-CaddyDemoMode {
  param(
    [ValidateSet("enable", "disable", "status")]
    [string]$Action
  )

  $scriptPath = Join-Path $PSScriptRoot "oracle-caddy-demo-mode.ps1"
  $output = & powershell -NoProfile -ExecutionPolicy Bypass -File $scriptPath `
    -Action $Action `
    -OracleHost $OracleHost `
    -OracleUser $OracleUser `
    -SshKey $SshKey `
    -Domain $Domain `
    -DemoApiPort $RemoteApiPort `
    -FrontendPort $FrontendPort

  $exitCode = $LASTEXITCODE
  $output | ForEach-Object { Write-Host $_ }

  if ($exitCode -ne 0) {
    throw "Caddy demo mode '$Action' failed with exit code $exitCode."
  }

  return $output
}

$backendJob = Start-Job -Name "neet2work-codex-demo-backend" -ScriptBlock {
  param($RepoRoot, $EnvPairs)

  Set-Location $RepoRoot
  foreach ($key in $EnvPairs.Keys) {
    [Environment]::SetEnvironmentVariable([string]$key, [string]$EnvPairs[$key], "Process")
  }

  corepack pnpm --filter @neet2work/backend dev
} -ArgumentList $repoRoot, $backendEnv

$tunnelJob = $null
$caddyEnabled = $false

try {
  $healthUrl = "http://127.0.0.1:$LocalBackendPort/health"
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
    Write-Host "Backend did not become healthy. Recent backend output:"
    Receive-Job -Job $backendJob -Keep | Select-Object -Last 40
    exit 1
  }

  Write-Host "Backend is healthy."

  try {
    $providers = Invoke-RestMethod -Uri "http://127.0.0.1:$LocalBackendPort/api/draft-workflow/providers" -TimeoutSec 10
    $providers.data | ForEach-Object {
      $reason = if ($_.reason) { " reason=$($_.reason)" } else { "" }
      Write-Host "provider=$($_.providerId) online=$($_.online) configured=$($_.configured)$reason"
    }
  } catch {
    Write-Warning "Provider status check failed: $($_.Exception.Message)"
  }

  Write-Host ""
  Write-Host "Opening SSH reverse tunnel..."
  Write-Host ""

  $tunnelJob = Start-Job -Name "neet2work-oracle-codex-demo-tunnel" -ScriptBlock {
    param($SshKey, $OracleUser, $OracleHost, $RemoteApiPort, $LocalBackendPort)

    & ssh `
      -i $SshKey `
      -o StrictHostKeyChecking=accept-new `
      -o ExitOnForwardFailure=yes `
      -o ServerAliveInterval=30 `
      -o ServerAliveCountMax=3 `
      -N `
      -R "127.0.0.1:${RemoteApiPort}:127.0.0.1:${LocalBackendPort}" `
      "$OracleUser@$OracleHost"

    exit $LASTEXITCODE
  } -ArgumentList $SshKey, $OracleUser, $OracleHost, $RemoteApiPort, $LocalBackendPort

  $deadline = (Get-Date).AddSeconds($TunnelReadyTimeoutSeconds)
  $tunnelReady = $false

  while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 2

    if ($tunnelJob.State -ne "Running") {
      Write-Host "SSH tunnel stopped before it became ready. Recent tunnel output:"
      Receive-Job -Job $tunnelJob -Keep | Select-Object -Last 40
      exit 1
    }

    $statusOutput = Invoke-CaddyDemoMode -Action status
    if (($statusOutput -join "`n") -match "demo_api_tunnel_http=200") {
      $tunnelReady = $true
      break
    }
  }

  if (-not $tunnelReady) {
    throw "SSH reverse tunnel did not become reachable from Oracle within $TunnelReadyTimeoutSeconds seconds."
  }

  if (-not $SkipCaddyDemoMode) {
    Write-Host ""
    Write-Host "Enabling Oracle Caddy demo mode..."
    Invoke-CaddyDemoMode -Action enable | Out-Null
    $caddyEnabled = $true
  }

  Write-Host ""
  Write-Host "Demo is ready: $ClientUrl"
  Write-Host "Keep this window open during the demo."
  Write-Host "Press Ctrl+C or close this window to restore Caddy and stop backend/tunnel."
  Write-Host ""

  while ($tunnelJob.State -eq "Running" -and $backendJob.State -eq "Running") {
    Start-Sleep -Seconds 2
  }

  if ($tunnelJob.State -ne "Running") {
    Write-Host "SSH tunnel stopped. Recent tunnel output:"
    Receive-Job -Job $tunnelJob -Keep | Select-Object -Last 40
  }

  if ($backendJob.State -ne "Running") {
    Write-Host "Backend stopped. Recent backend output:"
    Receive-Job -Job $backendJob -Keep | Select-Object -Last 40
  }
} finally {
  if ($caddyEnabled) {
    Write-Host ""
    Write-Host "Restoring Oracle Caddy normal mode..."
    try {
      Invoke-CaddyDemoMode -Action disable | Out-Null
    } catch {
      Write-Warning "Failed to restore Caddy automatically: $($_.Exception.Message)"
      Write-Warning "Run manually: oracle-caddy-demo-mode.cmd -Action disable"
    }
  }

  if ($tunnelJob -and $tunnelJob.State -eq "Running") {
    Stop-Job -Job $tunnelJob
  }
  if ($tunnelJob) {
    Receive-Job -Job $tunnelJob -Keep | Select-Object -Last 20 | ForEach-Object { Write-Host $_ }
    Remove-Job -Job $tunnelJob -Force
  }

  if ($backendJob.State -eq "Running") {
    Stop-Job -Job $backendJob
  }
  Receive-Job -Job $backendJob -Keep | Select-Object -Last 20 | ForEach-Object { Write-Host $_ }
  Remove-Job -Job $backendJob -Force
}
