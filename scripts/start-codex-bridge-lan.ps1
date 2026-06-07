param(
  [string]$LanIp,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not $LanIp) {
  $candidate = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
    Where-Object {
      $_.OperationalStatus -eq [System.Net.NetworkInformation.OperationalStatus]::Up -and
      $_.NetworkInterfaceType -ne [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback
    } |
    ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
    Where-Object {
      $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
      $_.Address.ToString() -ne "127.0.0.1" -and
      $_.Address.ToString() -notlike "169.254.*"
    } |
    Select-Object -First 1

  if ($candidate) {
    $LanIp = $candidate.Address.ToString()
  }
}

if (-not $LanIp) {
  Write-Host "Could not detect this PC's LAN IP."
  Write-Host "Usage: start-codex-bridge-lan.cmd 192.168.0.54"
  exit 1
}

$env:CODEX_BRIDGE_ENABLED = "true"
$env:CODEX_BRIDGE_HOME = Join-Path $env:USERPROFILE ".codex"
if (-not $env:AI_PROVIDER_ORDER) {
  $env:AI_PROVIDER_ORDER = "codex_bridge,gemini,local,fallback"
}

$env:VITE_API_BASE_URL = "http://${LanIp}:3000"
$env:CLIENT_URL = "http://localhost:5173,http://127.0.0.1:5173,http://${LanIp}:5173"
$env:ALLOW_LOCALHOST_ORIGINS = "true"
$env:REQUIRE_HTTPS = "false"

Write-Host "Starting Neet2Work LAN demo with Codex Bridge enabled..."
Write-Host ""
Write-Host "Work PC URL:  http://localhost:5173"
Write-Host "Demo PC URL:  http://${LanIp}:5173"
Write-Host "Backend URL:  http://${LanIp}:3000"
Write-Host "Codex home:   $env:CODEX_BRIDGE_HOME"
Write-Host ""
Write-Host "If the demo PC cannot connect, allow inbound TCP 5173 and 3000 in Windows Firewall."
Write-Host ""

if ($DryRun) {
  exit 0
}

corepack pnpm run dev
exit $LASTEXITCODE
