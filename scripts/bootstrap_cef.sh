#!/usr/bin/env bash
set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This bootstrap currently targets macOS/Xcode only." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CEF_DIR="$ROOT/.deps/cef-project"
CEF_PROJECT_COMMIT="3aec7049cf63a36876d7a6ef538842d6af314482"

for required in cmake git python3; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "ERROR: $required is required." >&2
    exit 1
  fi
done

mkdir -p "$ROOT/.deps"
if [ ! -d "$CEF_DIR/.git" ]; then
  git clone https://github.com/chromiumembedded/cef-project.git "$CEF_DIR"
fi

git -C "$CEF_DIR" fetch --tags --quiet origin
git -C "$CEF_DIR" checkout --detach "$CEF_PROJECT_COMMIT"

# Upstream minimal sample sets mock-keychain on macOS, disabling cookie encryption.
# Remove it for the CT baseline.
sed -i '' '/use-mock-keychain/d' "$CEF_DIR/examples/minimal/app_browser_minimal.cc"

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
echo "Build with:"
echo "  cmake --build '$BUILD_DIR' --config Release --target minimal"
