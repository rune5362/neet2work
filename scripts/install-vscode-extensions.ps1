$ErrorActionPreference = "Stop"

function Test-Command {
  param([string]$Command)
  return $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

if (-not (Test-Command "code")) {
  throw @"
VS Code의 code 명령을 찾을 수 없습니다.

해결 방법:
1. VS Code를 실행합니다.
2. Ctrl+Shift+P를 누릅니다.
3. 'Shell Command: Install code command in PATH'를 실행합니다.
4. PowerShell을 새로 열고 다시 실행합니다.
"@
}

$extensions = @(
  "dbaeumer.vscode-eslint",
  "esbenp.prettier-vscode",
  "ms-azuretools.vscode-docker",
  "ms-playwright.playwright",
  "ckolkman.vscode-postgres",
  "mikestead.dotenv"
)

foreach ($extension in $extensions) {
  Write-Host "Installing $extension" -ForegroundColor Cyan
  code --install-extension $extension
}

Write-Host ""
Write-Host "VS Code 최소 확장 설치가 완료되었습니다." -ForegroundColor Green
