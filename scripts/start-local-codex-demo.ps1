param(
  [int]$FrontendPort = 5173,
  [int]$BackendPort = 3000,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$clientUrl = "http://localhost:$FrontendPort"
$backendUrl = "http://localhost:$BackendPort"
$codexHome = if ($env:CODEX_BRIDGE_HOME) { $env:CODEX_BRIDGE_HOME } else { Join-Path $env:USERPROFILE ".codex" }

$env:PORT = "$BackendPort"
$env:VITE_API_BASE_URL = $backendUrl
$env:CLIENT_URL = "$clientUrl,http://127.0.0.1:$FrontendPort"
$env:ALLOW_LOCALHOST_ORIGINS = "true"
$env:REQUIRE_HTTPS = "false"
$env:CODEX_BRIDGE_ENABLED = "true"
$env:CODEX_BRIDGE_HOME = $codexHome
$env:GEMINI_ENABLED = "true"

if (-not $env:AI_PROVIDER_ORDER) {
  $env:AI_PROVIDER_ORDER = "codex_bridge,gemini,local,fallback"
}

if (-not $env:GEMINI_MODELS) {
  $env:GEMINI_MODELS = "gemma-4-31b-it,gemma-4-26b-a4b-it,gemini-2.5-flash"
}

Write-Host "Starting Neet2Work local demo..."
Write-Host ""
Write-Host "Frontend URL: $clientUrl"
Write-Host "Backend URL:  $backendUrl"
Write-Host "Codex home:   $env:CODEX_BRIDGE_HOME"
Write-Host "AI order:     $env:AI_PROVIDER_ORDER"
Write-Host "Gemini list:  $env:GEMINI_MODELS"
Write-Host ""
Write-Host "This local demo enables Codex Bridge and Gemini/Gemma routing."
Write-Host "Keep this window open while presenting."
Write-Host ""

if (-not (Test-Path $env:CODEX_BRIDGE_HOME)) {
  Write-Warning "Codex home was not found yet. Codex Bridge may stay offline until Codex login is ready."
  Write-Host ""
}

if ($DryRun) {
  Write-Host "Dry run only. Dev servers were not started."
  exit 0
}

corepack pnpm run dev
exit $LASTEXITCODE
