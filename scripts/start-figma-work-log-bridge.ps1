$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$logDir = Join-Path $repoRoot "tmp\figma-work-log-bridge"
$logPath = Join-Path $logDir ("bridge-" + (Get-Date -Format "yyyyMMdd") + ".log")
$healthUrl = "http://localhost:3927/health"

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-BridgeLog {
  param([string] $Message)

  $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  "[$timestamp] $Message" | Out-File -FilePath $logPath -Append -Encoding utf8
}

function Test-BridgeHealth {
  try {
    Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

if (Test-BridgeHealth) {
  Write-BridgeLog "Bridge already running at $healthUrl"
  exit 0
}

$node = Get-Command node.exe -ErrorAction Stop
Set-Location -LiteralPath $repoRoot

Write-BridgeLog "Starting Figma work log bridge from $repoRoot"
& $node.Source "scripts/serve-figma-work-log.mjs" 2>&1 | ForEach-Object {
  Write-BridgeLog $_.ToString()
}
$exitCode = $LASTEXITCODE
Write-BridgeLog "Bridge exited with code $exitCode"
exit $exitCode
