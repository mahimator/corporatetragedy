# CEF Bootstrap

The scripts in this directory set up and build an isolated upstream CEF minimal application on macOS.

## Requirements

- macOS 15.6 or newer\n- Xcode 26.0 and macOS 26 SDK selected, required by the pinned CEF 154 release\n- Xcode command-line tools
- CMake 3.21 or newer
- Git
- Python 3
- Network connection for upstream checkout and CEF binary distribution download
- Disk space for CEF distribution and generated build files

## Build and launch the upstream minimal app

From the repository root:

```sh
bash scripts/check_m0.sh
bash scripts/build_cef_minimal.sh
```

To build and launch in one command:

```sh
bash scripts/build_cef_minimal.sh --launch
```

The bootstrap clones official `chromiumembedded/cef-project` into `.deps/cef-project`, checks out the pinned upstream commit, and configures an Xcode build for the current Mac architecture. CEF's CMake setup downloads the prebuilt CEF binary distribution, not Chromium source.\n\nThe script pins CEF 154.0.34 / Chromium 154.0.8037.98 and applies narrow local patches to the upstream minimal sample: the initial URL becomes WhatsApp Web, the mock-keychain switch is removed, and the CEF cache/profile path is placed under `~/Library/Application Support/Corporate Tragedy`. This is a persistent local browser profile. The patch is applied only to the local checkout under `.deps`, not to upstream or tracked source files.

## Security adjustment

The upstream minimal sample uses a macOS mock-keychain switch. The CT bootstrap removes this switch from the local checkout so the sample does not intentionally disable cookie encryption. The upstream repository itself is not modified.

## What this milestone does not yet provide

- Corporate Tragedy native UI and branding
- Browser tabs and native navigation chrome
- Profile UI or profile switching
- Download management
- WhatsApp integration or validation

This is a build-control app. Once it builds and launches on the development Mac, we will copy the minimal CEF application into CT-owned source and start implementing the branded browser window.