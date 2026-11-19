# Workbench

Iteration 01: IDE-style shell with WhatsApp Web as the first embedded app.

## Run locally
- Install Node.js 20+
- `npm install`
- `npm run dev`

WhatsApp Web session is stored in Electron's persistent `persist:whatsapp` partition. First launch requires QR authentication.

## Current scope
- Dark IDE-inspired shell
- App navigation placeholders
- Embedded WhatsApp Web
- Bottom terminal panel (UI placeholder)
- Right inspector placeholder

Next: test embedded WhatsApp stability, then prototype terminal-style chat rendering.