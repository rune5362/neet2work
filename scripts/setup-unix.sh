#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
REQUIRED_NODE_VERSION="24.14.0"
NEXT_MAJOR_NODE_VERSION="25.0.0"

version_ge() {
  [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

version_lt() {
  [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$1" ] && [ "$1" != "$2" ]
}

echo "==> Project root"
pwd

echo "==> Checking Node.js"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 24 LTS first, then run this script again."
  echo "macOS: see MACOS_SETUP.md"
  echo "Linux: see LINUX_SETUP.md"
  exit 1
fi

NODE_VERSION="$(node -v | sed 's/^v//')"
if ! version_ge "$NODE_VERSION" "$REQUIRED_NODE_VERSION" || ! version_lt "$NODE_VERSION" "$NEXT_MAJOR_NODE_VERSION"; then
  echo "Node.js >=24.14.0 and <25 is required. Current: $(node -v)"
  echo "Run: nvm install && nvm use"
  exit 1
fi

echo "Node: $(node -v)"

echo "==> Checking npm"
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is not installed or not available in PATH."
  exit 1
fi

echo "npm: $(npm -v)"

echo "==> Installing npm dependencies"
npm install

echo "==> Creating .env if missing"
npm run setup:env

echo "==> Installing Playwright Chromium"
npm run setup:playwright

echo "==> Setup complete"
echo "Run dev server: npm run dev"
echo "Run Docker stack: npm run docker:up"
echo "Run tests: npm test"
