#!/usr/bin/env bash
set -euo pipefail

echo "Corporate Tragedy M0 toolchain check"
echo "=================================="

check() {
  local command_name="$1"
  if command -v "$command_name" >/dev/null 2>&1; then
    printf "FOUND  %-16s %s\n" "$command_name" "$(command -v "$command_name")"
  else
    printf "MISS   %-16s\n" "$command_name"
  fi
}

check xcode-select
check xcodebuild
check clang
check cmake
check ninja
check python3

echo
if command -v xcodebuild >/dev/null 2>&1; then
  xcodebuild -version
fi
if command -v cmake >/dev/null 2>&1; then
  cmake --version | head -n 1
fi
if command -v ninja >/dev/null 2>&1; then
  ninja --version
fi

echo
echo "Qt 6 detection (optional during direct-CEF sample validation):"
if command -v brew >/dev/null 2>&1; then
  brew list --versions qt 2>/dev/null || true
  brew --prefix qt 2>/dev/null || true
fi

echo
echo "Next: build the official CEF cefsimple sample for this macOS architecture."
echo "Do not start the Corporate Tragedy shell until the upstream sample runs."
