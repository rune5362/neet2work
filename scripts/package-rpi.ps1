param(
  [string]$FrontendApiBaseUrl = $env:VITE_API_BASE_URL
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ReleaseDir = Join-Path $RepoRoot "release-rpi"
$ZipFile = Join-Path $RepoRoot "neet2work-rpi-release.zip"

Set-Location $RepoRoot

function Assert-PathExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required path not found: $Path"
  }
}

function Invoke-CheckedCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ArgumentList
  )

  & $FilePath @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($ArgumentList -join ' ')"
  }
}

Assert-PathExists "package.json"
Assert-PathExists "pnpm-lock.yaml"
Assert-PathExists "pnpm-workspace.yaml"
Assert-PathExists "apps/backend/package.json"
Assert-PathExists "apps/backend/prisma"
Assert-PathExists "apps/backend/data"
Assert-PathExists "apps/frontend/package.json"

if ([string]::IsNullOrWhiteSpace($FrontendApiBaseUrl)) {
  Write-Warning "VITE_API_BASE_URL is empty. The frontend build will use its source-code fallback unless the app is configured otherwise."
} else {
  $env:VITE_API_BASE_URL = $FrontendApiBaseUrl
  Write-Host "Using VITE_API_BASE_URL=$FrontendApiBaseUrl"
}

Remove-Item -LiteralPath $ReleaseDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $ZipFile -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "apps/backend/dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath "apps/frontend/dist" -Recurse -Force -ErrorAction SilentlyContinue

Invoke-CheckedCommand "corepack" "pnpm" "run" "build"

Assert-PathExists "apps/backend/dist/generated/prisma/client.js"
Assert-PathExists "apps/backend/dist/generated/prisma/internal/class.js"

New-Item -ItemType Directory -Force (Join-Path $ReleaseDir "apps/backend") | Out-Null
New-Item -ItemType Directory -Force (Join-Path $ReleaseDir "apps/frontend") | Out-Null

Copy-Item -LiteralPath "package.json" -Destination $ReleaseDir
Copy-Item -LiteralPath "pnpm-lock.yaml" -Destination $ReleaseDir
Copy-Item -LiteralPath "pnpm-workspace.yaml" -Destination $ReleaseDir

Copy-Item -LiteralPath "apps/backend/package.json" -Destination (Join-Path $ReleaseDir "apps/backend")
Copy-Item -LiteralPath "apps/backend/dist" -Destination (Join-Path $ReleaseDir "apps/backend/dist") -Recurse
Copy-Item -LiteralPath "apps/backend/prisma" -Destination (Join-Path $ReleaseDir "apps/backend/prisma") -Recurse
Copy-Item -LiteralPath "apps/backend/data" -Destination (Join-Path $ReleaseDir "apps/backend/data") -Recurse

Copy-Item -LiteralPath "apps/frontend/package.json" -Destination (Join-Path $ReleaseDir "apps/frontend")
Copy-Item -LiteralPath "apps/frontend/dist" -Destination (Join-Path $ReleaseDir "apps/frontend/dist") -Recurse

Assert-PathExists (Join-Path $ReleaseDir "apps/backend/dist/generated/prisma/client.js")
Assert-PathExists (Join-Path $ReleaseDir "apps/backend/dist/generated/prisma/internal/class.js")

Compress-Archive -Path (Join-Path $ReleaseDir "*") -DestinationPath $ZipFile -Force

Write-Host "Created $ZipFile"
