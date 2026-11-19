# CEF Bootstrap

This script uses the official Chromium Embedded Framework sample project as an isolated build baseline.

## Requirements

- macOS with Xcode and command line tools selected
- CMake 3.21 or newer
- Git
- Python 3
- Network connection for upstream checkout and CEF binary distribution download
- Disk space for the CEF distribution and generated build files

## Bootstrap

From the repository root:

```sh
bash scripts/check_m0.sh
bash scripts/bootstrap_cef.sh
```

The bootstrap clones the official `chromiumembedded/cef-project` repository into `.deps/cef-project`, checks out the fixed commit recorded in the script, and configures its Xcode build directory for the current Mac architecture.

The script deliberately does not install dependencies, alter system settings, or download Chromium source. CEF's CMake setup downloads the prebuilt CEF distribution.

## Build the upstream minimal app

After bootstrap completes:

```sh
cmake --build .deps/cef-project/build-ct --config Release --target minimal
```

Locate the generated app bundle:

```sh
find .deps/cef-project/build-ct -name 'minimal.app' -type d
```

Launch the app bundle from Finder or with `open /path/to/minimal.app`.

## Why upstream first

We need to separate toolchain/CEF failures from Corporate Tragedy code. The upstream minimal app is the control build. Once it launches, we copy the minimum source set into CT and begin replacing the sample's window/browser behavior. This prevents debugging our code and CEF setup at the same time.

## What this does not yet provide

- Corporate Tragedy branding in the native window
- Browser tabs or native navigation chrome
- User profile management
- Download management
- WhatsApp-specific integration

The upstream minimal app is a build proof only. The branded browser implementation is the next development layer.
