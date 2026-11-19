# Corporate Tragedy Architecture

**Status:** Foundation decision and roadmap  
**Rewrite branch:** `rewrite/chromium-cef-foundation`

## Product

Corporate Tragedy is an open-source leisure-accessibility toolkit for work-centric computer environments. Its flagship product is a browser, with modular web integrations and a separate ecosystem of optional companion utilities.

It is not a productivity suite, fake IDE, or browser-themed React application.

## Foundation decision: CEF + Qt 6 + C++

- **Chromium via CEF:** compatibility with modern web applications, multiprocess browser runtime, browser platform features, and upstream-maintained Chromium releases without managing a full Chromium fork at the start.
- **Qt 6:** native desktop windowing, menus, controls, layouts, platform integration and packaging.
- **C++:** application core, browser lifecycle, native integration, security boundaries and browser subsystems.
- **Web UI only where justified:** HTML/CSS/JS may power optional UI surfaces, but they do not impersonate the browser or replace the native browser shell.

CEF is an embedding framework, not a finished browser. Browser capabilities must be implemented and tested deliberately.

## Layered architecture

```
Corporate Tragedy
├── Native desktop shell (Qt)
│   ├── Window / titlebar / themes
│   ├── Tabs and navigation
│   ├── Sidebar / app launcher
│   ├── Settings / permissions
│   └── Downloads
├── Browser core (CEF / Chromium)
│   ├── Browser instances and lifecycle
│   ├── Profiles, cookies and storage
│   ├── History and navigation
│   ├── Downloads and permissions
│   └── DevTools and diagnostics
├── Integration system
│   ├── WhatsApp (first)
│   ├── Instagram (later)
│   ├── YouTube Music (later)
│   └── Other integrations
└── Companion utilities (independent)
    ├── Cursor utility
    └── Future small tools
```

## Principles and constraints

1. **No UA spoofing.** Use Chromium's real runtime identity, not a fake string to force compatibility.
2. **No credential interception.** Login and session data remain within the user's browser profile and normal website flows.
3. **Secure boundaries.** No arbitrary privileged JavaScript exposed to websites. Any CEF bindings are minimal, restricted, and origin-scoped.
4. **Profile persistence is explicit.** Start with one profile. Future profiles must have clear separation.
5. **Integrations are optional modules.** They can be disabled, removed, and independently versioned.
6. **Companion apps remain independent.** Cursor utilities and future tools should not depend on browser internals.
7. **No fake features.** Ship only working features. No decorative placeholders.
8. **Security and update cadence.** CEF/Chromium version tracking and patching are release requirements, not optional polish.

## Milestones

### M0: Build proof
- Verify CEF binaries, Qt 6 compatibility and macOS toolchain.
- Create a minimal CMake-based C++/Qt application.
- Launch a Chromium-backed browser and navigate to a normal HTTPS site.
- Validate process lifecycle, clean shutdown, macOS bundle layout and profile persistence.

**Exit condition:** native app opens a real Chromium browser and navigates without UA tricks.

### M1: Browser essentials
- Address bar, back, forward, reload and stop
- Tabs
- Persistent profile and cookies
- Basic history
- Downloads
- Permission prompts
- External link handling
- Clear browsing data
- Developer tools during development

**Exit condition:** reliable everyday browsing without integrations.

### M2: Corporate Tragedy identity
- Workstation-inspired visual design
- Sidebar and app launcher
- Compact tab strip
- Keyboard-first interaction
- Themes and settings

**Exit condition:** recognizable branded browser shell.

### M3: WhatsApp
- WhatsApp Web in a normal browser tab
- QR/login flow
- Persistent session after restart
- Optional CT integration panel
- Alternate chat rendering is read-only initially and separately tested

**Exit condition:** user can sign in, close, relaunch, and retain a functional session; integration does not break WhatsApp.

### M4: Integration contract
- Stable integration API
- Permission model
- Per-integration enable/disable
- UI contribution points (sidebar, toolbar, panel)
- Versioning and compatibility
- Isolated scripts and UI from native core

### M5: Companion tools
Build optional tools as independently installable apps. A cursor utility must have a visible, user-controlled state and must not silently falsify workplace activity or attendance records.

## Target source layout

```
corporatetragedy/
├── app/
│   ├── main.cpp
│   ├── application/
│   ├── browser/
│   ├── profiles/
│   ├── tabs/
│   ├── downloads/
│   ├── permissions/
│   ├── integrations/
│   └── ui/
├── resources/
│   ├── icons/
│   └── themes/
├── docs/
│   ├── ARCHITECTURE.md
│   └── THIRD_PARTY_NOTICES.md
├── tests/
├── scripts/
└── packaging/
```

This is a target structure, not a claim that the folders already exist.

## Dependency and licensing policy

- Prefer upstream maintained dependencies and stable APIs.
- Pin CEF versions and record the Chromium version.
- Track CEF security advisories and establish an update cadence.
- Maintain third-party license and attribution inventory.
- Review Qt 6 licensing and distribution implications for the selected packaging model before releases.
- Do not silently disable browser security for integrations.

## Platform plan

- **First target:** macOS, the primary development environment.
- **Later targets:** Windows and Linux, after browser core and packaging are stable and verified against available CEF binaries.

## Rejected approaches

- Electron as the browser foundation.
- Embedded WebView as a substitute for a browser.
- User-agent spoofing.
- React application masquerading as a browser.
- Full Chromium fork and maintenance from day one.
- Terminal aesthetics before browser functionality is reliable.

## Decisions to close before M0

- Exact CEF distribution/revision and macOS architecture.
- Qt 6 licensing and packaging model.
- CMake project/build conventions.
- CI build matrix and artifact signing.
- Default profile layout.
- Integration permissions and lifecycle contract.

## Rewrite definition of done

A reproducible build of the native application that launches Chromium through CEF, navigates normally, and persists a browser profile. WhatsApp-specific changes are not part of this foundation milestone.
