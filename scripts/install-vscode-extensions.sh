#!/usr/bin/env bash
set -euo pipefail

if ! command -v code >/dev/null 2>&1; then
  cat <<'EOF'
VS Code의 code 명령을 찾을 수 없습니다.

해결 방법:
1. VS Code를 실행합니다.
2. Ctrl+Shift+P를 누릅니다.
3. 'Shell Command: Install code command in PATH'를 실행합니다.
4. 터미널을 새로 열고 다시 실행합니다.
EOF
  exit 1
fi

extensions=(
  "dbaeumer.vscode-eslint"
  "esbenp.prettier-vscode"
  "ms-azuretools.vscode-docker"
  "ms-playwright.playwright"
  "ckolkman.vscode-postgres"
  "mikestead.dotenv"
)

for extension in "${extensions[@]}"; do
  echo "Installing ${extension}"
  code --install-extension "${extension}"
done

echo ""
echo "VS Code 최소 확장 설치가 완료되었습니다."
