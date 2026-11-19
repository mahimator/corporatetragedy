# Corporate Tragedy Product Scope

## Product statement

Corporate Tragedy is a modular leisure-accessibility toolkit for work-centric computing environments. Its flagship browser makes personal web experiences easy to access and customize. Small companion utilities can solve independent problems and ship separately.

## Product family

### Corporate Tragedy Browser
The flagship desktop browser. Chromium-based, profile-aware, customizable, with modular integrations.

### Integrations
Optional modules for services such as WhatsApp, Instagram, and YouTube Music. Integrations must use normal website sessions and clear permission boundaries. They should be removable and individually disabled.

### Companion utilities
Small standalone desktop tools. They are not browser features unless a clear reason exists to integrate them.

## Non-goals

- A productivity suite
- A fake IDE shell
- A Chromium source fork at initial development
- A collection of empty feature placeholders
- Credential extraction or account-session manipulation
- Hidden activity spoofing or attendance deception

## Product development principles

- Solve a real problem before decorating the UI.
- Browser foundation first.
- Build small vertical slices and test each one.
- Keep integrations optional and isolated.
- Treat browser security, updates and licensing as first-class requirements.
- Prefer boring and dependable infrastructure over clever hacks.
- Companion apps must work independently.
