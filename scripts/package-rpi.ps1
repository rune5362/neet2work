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

function Test-FrontendApiBaseUrl {
  param(
    [Parameter(Mandatory = $true)]
    [AllowNull()]
    [AllowEmptyString()]
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $false
  }

  $parsedUri = $null
  if (-not [System.Uri]::TryCreate($Value.Trim(), [System.UriKind]::Absolute, [ref]$parsedUri)) {
    return $false
  }

  return ($parsedUri.Scheme -in @("http", "https")) -and -not [string]::IsNullOrWhiteSpace($parsedUri.Host)
}

function Resolve-FrontendApiBaseUrl {
  param(
    [AllowNull()]
    [AllowEmptyString()]
    [string]$Value
  )

  $resolvedValue = if ($null -eq $Value) { "" } else { $Value }
  while (-not (Test-FrontendApiBaseUrl $resolvedValue)) {
    if (-not [string]::IsNullOrWhiteSpace($resolvedValue)) {
      Write-Warning "Invalid VITE_API_BASE_URL: $resolvedValue"
    }

    $resolvedValue = Read-Host "Enter VITE_API_BASE_URL for the target device (example: http://172.30.1.7)"
  }

  return $resolvedValue.Trim()
}

function Write-FrontendApiBaseUrlMatches {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ApiBaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$FrontendDistDir
  )

  $apiBaseUri = [System.Uri]$ApiBaseUrl
  $assetPath = Join-Path $FrontendDistDir "assets\*.js"
  $patterns = @($ApiBaseUrl, $apiBaseUri.Host, "localhost:3000") | Select-Object -Unique

  Write-Host ""
  Write-Host "Frontend API base verification:"
  Write-Host "Select-String -Path $assetPath -Pattern $($patterns -join ', ')"

  $matches = @(Select-String -Path $assetPath -Pattern $patterns -ErrorAction SilentlyContinue)
  if ($matches.Count -eq 0) {
    Write-Warning "No VITE_API_BASE_URL or localhost:3000 matches were found in the built frontend assets."
    return
  }

  $matches | ForEach-Object { Write-Output $_ }

  if ($matches.Pattern -contains "localhost:3000") {
    Write-Warning "localhost:3000 was found in the built frontend assets. Check whether this release points to the target device API."
  }
}

Assert-PathExists "package.json"
Assert-PathExists "pnpm-lock.yaml"
Assert-PathExists "pnpm-workspace.yaml"
Assert-PathExists "apps/backend/package.json"
Assert-PathExists "apps/backend/prisma"
Assert-PathExists "apps/backend/data"
Assert-PathExists "apps/frontend/package.json"

$FrontendApiBaseUrl = Resolve-FrontendApiBaseUrl $FrontendApiBaseUrl
$env:VITE_API_BASE_URL = $FrontendApiBaseUrl
Write-Host "Using VITE_API_BASE_URL=$FrontendApiBaseUrl"

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
Assert-PathExists (Join-Path $ReleaseDir "apps/frontend/dist/assets")

Write-FrontendApiBaseUrlMatches `
  -ApiBaseUrl $FrontendApiBaseUrl `
  -FrontendDistDir (Join-Path $ReleaseDir "apps/frontend/dist")

Compress-Archive -Path (Join-Path $ReleaseDir "*") -DestinationPath $ZipFile -Force

Write-Host "Created $ZipFile"
