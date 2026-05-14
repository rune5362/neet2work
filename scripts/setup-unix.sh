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

echo "==> Checking Corepack"
if ! command -v corepack >/dev/null 2>&1; then
  echo "Corepack is not installed or not available in PATH."
  exit 1
fi

echo "==> Checking pnpm 11 through Corepack"
echo "pnpm: $(corepack pnpm --version)"

echo "==> Installing pnpm dependencies"
corepack pnpm install

echo "==> Creating .env if missing"
corepack pnpm run setup:env

echo "==> Generating Prisma Client"
corepack pnpm run db:generate

echo "==> Installing Playwright Chromium"
corepack pnpm run setup:playwright

echo "==> Setup complete"
echo "Run dev server: corepack pnpm run dev"
echo "Run Docker stack: corepack pnpm run docker:up"
echo "Run tests: corepack pnpm run test"
