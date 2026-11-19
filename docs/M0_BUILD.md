# M0: Native Chromium build proof

M0 is intentionally limited to proving that the chosen native browser foundation builds and launches.

## Host target

- macOS
- Apple Silicon (arm64)
- Xcode command-line tools
- CMake
- Ninja
- Qt 6
- CEF binary distribution matching the host architecture and the selected Xcode/SDK requirements

## Toolchain verification

Run:

```sh
xcode-select -p
xcodebuild -version
clang --version
cmake --version
ninja --version
brew --prefix qt
```

If Qt is installed using Homebrew, use the installed Qt 6 package path. Do not assume the path if multiple Qt versions are present.

## CEF choice

Use a stable CEF release branch and its matching prebuilt macOS arm64 distribution. Record:

- CEF branch and version
- Chromium version bundled in that CEF release
- CEF archive URL and checksum
- Xcode version and SDK
- Qt version
- CMake and Ninja versions

Do not build Chromium from source for M0. The CEF source build requires substantial disk space and RAM and is unnecessary for this proof.

## Project approach

Start from the official CEF `cefsimple` sample and its provided CMake configuration. It already includes CEF's macOS entry point, resource layout, wrapper library configuration and application bundle setup. We will make the first Corporate Tragedy changes only after the upstream sample builds.

Official reference: https://chromiumembedded.github.io/cef/tutorial

## Verification checklist

- [ ] CEF distribution downloaded and checksum verified
- [ ] CEF sample builds with local toolchain
- [ ] Native macOS app launches
- [ ] A normal HTTPS page navigates successfully
- [ ] Browser subprocesses launch and shut down cleanly
- [ ] Profile data is stored in a dedicated user-data directory
- [ ] Relaunch preserves a test cookie/session
- [ ] No UA override or WhatsApp-specific workaround is present

## Profile location

Development profile should be stored under the user's Application Support directory, within a Corporate Tragedy folder. It must not be stored inside the source tree or CEF bundle.

## Build artifacts and repository hygiene

- Keep downloaded CEF binaries out of git.
- Keep build output out of git.
- Pin the CEF revision in a local configuration or lock file.
- Keep the CEF third-party notices available in the app and repository.
- Avoid installing or enabling third-party integrations during M0.

## Exit criteria

M0 is complete only when the app launches a Chromium browser, navigates normally, and persists a profile across restarts. Screenshots or CI logs should prove this. A successful CMake configure alone is not sufficient.
