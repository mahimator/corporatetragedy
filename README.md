# Corporate Tragedy

Corporate Tragedy is an open-source leisure-accessibility toolkit for work environments that make personal browsing feel out of place.

The long-term product is a Chromium-based desktop browser with a native shell and modular playful integrations. Its first integration is WhatsApp. Companion utilities may be developed and distributed independently of the browser.

## Current rewrite

The rewrite is tracked on `rewrite/chromium-cef-foundation`. It replaces the original Electron/WebView prototype with a Chromium Embedded Framework (CEF) + Qt 6 + C++ foundation.

Read [the architecture decision and roadmap](docs/ARCHITECTURE.md) before implementation.

## Product principles

- Browser first, not a web app pretending to be a browser.
- Use the real Chromium runtime. Never spoof browser identity to make a website work.
- Keep app integrations modular and isolated.
- Browser security and user privacy are not negotiable.
- Companion utilities can stand alone and must not depend on browser internals.
- Keep the project small, useful, and extensible. No fake features or decorative complexity.

## Planned initial targets

1. macOS developer build
2. WhatsApp Web as a normal browser tab with persistent profile
3. Corporate Tragedy shell, tabs/navigation, app sidebar
4. Integration API for app-specific overlays and shortcuts
5. Independent companion utilities

## Licensing

The project will maintain a third-party license and attribution inventory. Chromium/CEF and Qt have their own license and redistribution requirements, which will be documented before packaging.


## M0 bootstrap

Run the macOS toolchain check with `bash scripts/check_m0.sh`. The first build will use the official CEF `cefsimple` sample as the baseline. See [M0 build plan](docs/M0_BUILD.md) and [technology decision update](docs/CEF_DECISION_UPDATE.md).
