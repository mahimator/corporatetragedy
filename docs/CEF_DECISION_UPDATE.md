# M0 Technology Decision Update

## Important refinement

Qt remains a candidate for the native application shell, but the browser core must be direct CEF, not a third-party Qt WebView wrapper that disables browser-specific functionality.

QCefView's own documentation explicitly notes that it is a widget component and is not the optimal choice for a full browser application. Therefore it is not selected as Corporate Tragedy's browser foundation.

## M0 bootstrap strategy

1. Select a CEF binary distribution matching macOS arm64 and the installed Xcode/SDK.
2. Use the official CEF `cefsimple` sample as the known-good starting point.
3. Build and run the upstream sample before changing its structure.
4. Make a minimal Corporate Tragedy fork of the sample only after baseline build success.
5. Validate persistent user profile data and ordinary web navigation.
6. Evaluate Qt shell integration against direct CEF APIs before committing to a cross-platform UI framework.

## Why this is safer

The CEF sample already handles the platform entry point, resource packaging, browser subprocesses, and basic lifecycle. Starting there minimizes the amount of unverified platform glue we write.

## Current decision

- Browser core: direct CEF APIs.
- macOS first: use the native macOS CEF sample foundation and build toolchain.
- Qt: optional native shell candidate, to be evaluated through an integration spike.
- CMake: build system.
- Ninja/Xcode: native build tools as supported by the selected CEF distribution.
- Chromium source fork: explicitly deferred.

## Required proof before architecture lock

A short integration spike must compare:

- Direct CEF sample with native platform windowing.
- CEF embedded into Qt 6 shell.
- Startup and shutdown reliability.
- Browser input/focus behaviour.
- Profile persistence.
- Build and packaging complexity.
- Cross-platform portability.

The browser architecture should be locked only after this spike, not based on a theoretical preference.
