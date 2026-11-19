# M0: Native Chromium build proof

M0 is intentionally limited to proving that the selected CEF foundation builds and launches.

## Host target

- macOS
- Apple Silicon (arm64)
- Xcode and command-line tools
- CMake and Ninja
- Python 3
- CEF binary distribution matching host architecture and selected Xcode/SDK

## Toolchain verification

Run from the repository root:

```sh
bash scripts/check_m0.sh
```

## CEF strategy

Use a stable CEF release branch and its prebuilt macOS arm64 distribution. Record CEF branch/version, bundled Chromium version, archive URL and checksum, Xcode/SDK, CMake and Ninja versions.

Do not build Chromium from source for M0. Use the official CEF `cefsimple` sample as the baseline. It already includes CEF's macOS entry point, resource layout, wrapper configuration and application bundle setup.

Official tutorial: https://chromiumembedded.github.io/cef/tutorial

## Sequence

1. Run the toolchain checker on the development Mac.
2. Select a CEF binary distribution compatible with the installed Xcode and SDK.
3. Build and launch the upstream `cefsimple` sample without modifications.
4. Confirm normal HTTPS navigation.
5. Confirm clean shutdown and browser subprocess handling.
6. Confirm a dedicated user profile directory and cookie/session persistence.
7. Only then create the Corporate Tragedy fork of the sample.

## Architecture integration spike

Before selecting the full UI shell, compare direct native CEF integration with CEF embedded in Qt 6. Evaluate lifecycle, input/focus, profile persistence, packaging, and platform portability. Qt is a candidate shell, not a locked requirement.

## Verification checklist

- [ ] CEF package selected for macOS arm64
- [ ] Version, Chromium version, archive and checksum recorded
- [ ] Official sample builds
- [ ] App launches
- [ ] HTTPS navigation succeeds
- [ ] Browser subprocesses shut down cleanly
- [ ] Profile data persists between launches
- [ ] No UA overrides or WhatsApp-specific hacks
- [ ] CEF third-party notices included

## Profile storage

Development profile must live in the user's Application Support directory under Corporate Tragedy, never inside the source tree or CEF framework bundle.

## Repository hygiene

- Do not commit downloaded CEF binaries.
- Do not commit build outputs.
- Pin the CEF revision.
- Track CEF/Chromium security updates and establish an update cadence before release.

## Exit condition

A repeatable local build launches Chromium through CEF, navigates normally, and persists a profile. CMake configuration alone does not count.
