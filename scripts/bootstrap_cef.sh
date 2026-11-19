#!/usr/bin/env bash
set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This bootstrap currently targets macOS/Xcode only." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CEF_DIR="$ROOT/.deps/cef-project"
CEF_PROJECT_COMMIT="3aec7049cf63a36876d7a6ef538842d6af314482"
CEF_VERSION="154.0.34+g14c5a08+chromium-154.0.8037.98"

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

# Apply narrow CT-specific patches to the upstream sample and pin the CEF build.
python3 - "$CEF_DIR/CMakeLists.txt" "$CEF_DIR/examples/minimal/app_browser_minimal.cc" "$CEF_DIR/examples/shared/main_mac.mm" "$CEF_VERSION" <<'PY'
from pathlib import Path
import re
import sys

cmake_file = Path(sys.argv[1])
cef_version = sys.argv[4]
cmake_text = cmake_file.read_text()
updated_cmake, count = re.subn(
    r'set\(CEF_VERSION "[^"]+"\)',
    f'set(CEF_VERSION "{cef_version}")',
    cmake_text,
    count=1,
)
if count != 1:
    raise SystemExit("Could not pin CEF version in upstream CMake; refusing to patch blindly.")
cmake_file.write_text(updated_cmake)

startup_file = Path(sys.argv[2])
startup = startup_file.read_text()
old_url = 'constexpr char kStartupURL[] = "https://www.google.com";'
new_url = 'constexpr char kStartupURL[] = "https://web.whatsapp.com";'
if old_url in startup:
    startup = startup.replace(old_url, new_url, 1)
elif new_url not in startup:
    raise SystemExit("Could not locate upstream minimal startup URL; refusing to patch blindly.")
startup = startup.replace('      command_line->AppendSwitch("use-mock-keychain");\n', "")
startup_file.write_text(startup)

mac_main = Path(sys.argv[3])
main_text = mac_main.read_text()
old_settings = '    CefSettings settings;'
new_settings = '''    CefSettings settings;
    // Keep browser profile data in the user's Application Support directory.
    NSString* profilePath =
        [NSHomeDirectory() stringByAppendingPathComponent:
            @"Library/Application Support/Corporate Tragedy"];
    [[NSFileManager defaultManager]
        createDirectoryAtPath:profilePath
        withIntermediateDirectories:YES
        attributes:nil
        error:nil];
    CefString(&settings.cache_path) = profilePath.UTF8String;'''
if old_settings in main_text:
    main_text = main_text.replace(old_settings, new_settings, 1)
elif 'Application Support/Corporate Tragedy' not in main_text:
    raise SystemExit("Could not locate CEF settings block; refusing to patch blindly.")
mac_main.write_text(main_text)
PY

echo "Pinned upstream cef-project checkout:"
git -C "$CEF_DIR" log -1 --oneline
echo "Pinned CEF release: $CEF_VERSION"

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
