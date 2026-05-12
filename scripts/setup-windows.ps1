param(
  [switch]$SkipInstall,
  [switch]$RunCheck
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Command {
  param([string]$Command)
  return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machinePath;$userPath"
}

function Get-NodeVersion {
  if (-not (Test-Command "node")) {
    return $null
  }

  $version = (& node -v).TrimStart("v")
  return [Version]$version
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot
$requiredNodeVersion = [Version]"24.14.0"
$nextMajorNodeVersion = [Version]"25.0.0"

Write-Step "프로젝트 루트로 이동"
Write-Host $repoRoot

Write-Step "Node.js 24.14.0 이상 확인"
$nodeVersion = Get-NodeVersion

if ($null -eq $nodeVersion -or $nodeVersion -lt $requiredNodeVersion -or $nodeVersion -ge $nextMajorNodeVersion) {
  if (-not (Test-Command "winget")) {
    throw @"
winget 명령을 찾을 수 없습니다.
Microsoft Store에서 App Installer를 설치하거나 Node.js 24 LTS를 직접 설치한 뒤 다시 실행하세요.
"@
  }

  Write-Step "winget으로 Node.js LTS 설치"
  winget install --id OpenJS.NodeJS.LTS --exact --silent --accept-package-agreements --accept-source-agreements
  Refresh-Path
  $nodeVersion = Get-NodeVersion
}

if ($null -eq $nodeVersion -or $nodeVersion -lt $requiredNodeVersion -or $nodeVersion -ge $nextMajorNodeVersion) {
  throw "Node.js 24.14.0 이상 25 미만을 찾지 못했습니다. PowerShell을 새로 열고 다시 실행해 주세요."
}

Write-Host "Node: $(& node -v)" -ForegroundColor Green

Write-Step "npm 확인"
if (-not (Test-Command "npm")) {
  Refresh-Path
}

if (-not (Test-Command "npm")) {
  throw "npm 명령을 찾지 못했습니다. Node.js 24 LTS 설치 후 PowerShell을 새로 열고 다시 실행해 주세요."
}

Write-Host "npm: $(& npm -v)" -ForegroundColor Green

if (-not $SkipInstall) {
  Write-Step "npm 의존성 설치"
  npm install

  Write-Step ".env 생성"
  npm run setup:env

  Write-Step "Playwright Chromium 설치"
  npm run setup:playwright
}

if ($RunCheck) {
  Write-Step "프로젝트 전체 검사"
  npm run check
}

Write-Step "세팅 완료"
Write-Host "개발 서버 실행: npm run dev" -ForegroundColor Green
Write-Host "Docker 실행: npm run docker:up" -ForegroundColor Green
Write-Host "테스트 실행: npm test" -ForegroundColor Green
