#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CEF_DIR="$ROOT/.deps/cef-project"
CEF_PROJECT_COMMIT="3aec7049cf63a36876d7a6ef538842d6af314482"

if ! command -v cmake >/dev/null 2>&1; then echo "ERROR: cmake is required." >&2; exit 1; fi
if ! command -v git >/dev/null 2>&1; then echo "ERROR: git is required." >&2; exit 1; fi
if ! command -v python3 >/dev/null 2>&1; then echo "ERROR: python3 is required." >&2; exit 1; fi

mkdir -p "$ROOT/.deps"
if [ ! -d "$CEF_DIR/.git" ]; then
  git clone https://github.com/chromiumembedded/cef-project.git "$CEF_DIR"
fi

git -C "$CEF_DIR" fetch --tags --quiet origin
git -C "$CEF_DIR" checkout --detach "$CEF_PROJECT_COMMIT"

echo "Pinned upstream cef-project checkout:"
git -C "$CEF_DIR" log -1 --oneline

ARCH="$(uname -m)"
if [ "$ARCH" = "arm64" ]; then
  PROJECT_ARCH="arm64"
elif [ "$ARCH" = "x86_64" ]; then
  PROJECT_ARCH="x86_64"
else
  echo "Unsupported macOS architecture: $ARCH" >&2
  exit 1
fi

BUILD_DIR="$CEF_DIR/build-ct"
mkdir -p "$BUILD_DIR"
cmake -S "$CEF_DIR" -B "$BUILD_DIR" -G Xcode \
  -DPROJECT_ARCH="$PROJECT_ARCH" \
  -DWITH_EXAMPLES=On

echo
echo "CEF project configured."
echo "Next build the upstream minimal target:"
echo "  cmake --build '$BUILD_DIR' --config Release --target minimal"
echo
echo "Then run the upstream app bundle from its configured output directory."
echo "This is upstream's baseline app, not yet the branded CT browser."
