#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CEF_DIR="$ROOT/.deps/cef-project"
BUILD_DIR="$CEF_DIR/build-ct"

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This first build script targets macOS only." >&2
  exit 1
fi

bash "$ROOT/scripts/bootstrap_cef.sh"
cmake --build "$BUILD_DIR" --config Release --target minimal

APP_PATH="$(find "$BUILD_DIR" -name 'minimal.app' -type d -print -quit)"
if [ -z "$APP_PATH" ]; then
  echo "Build finished, but minimal.app was not found in the build directory." >&2
  exit 2
fi

echo
echo "CEF minimal app built:"
echo "$APP_PATH"

if [ "${1:-}" = "--launch" ]; then
  open "$APP_PATH"
fi
