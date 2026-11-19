# Corporate Tragedy

A browser that looks and feels like a developer workstation. Social and entertainment apps live inside it, starting with WhatsApp.

## Iteration 01: WhatsApp

- Minimal workstation-inspired browser chrome
- WhatsApp Web only
- Browser navigation controls
- Address bar
- Persistent WhatsApp login session
- Simple workspace sidebar

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Electron launches the desktop shell. WhatsApp login persists in the `persist:whatsapp` partition.

This iteration intentionally contains no terminal panel, inspector, fake IDE modules, or other app placeholders. Future integrations will be added incrementally.

## Terminal bridge

ChatGPT Web can queue real terminal commands through GitHub and read the output back.
See [`agentFiles/README.md`](agentFiles/README.md).

```bash
npm run bridge          # watch prompts.json, run them, publish results
npm run bridge:status   # queue + results overview
npm run prompt -- "run the command git status in terminal"
```

