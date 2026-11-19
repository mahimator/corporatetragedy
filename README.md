# Corporate Tragedy

A workstation-style browser for a focused personal workspace. The first integration is WhatsApp Web, using an isolated persistent session.

## Current scope

- Desktop shell built with Electron and React
- Browser navigation and address bar for HTTP and HTTPS pages
- Persistent WhatsApp Web session (`persist:whatsapp`)
- Optional workspace sidebar
- Read-only WhatsApp chat preview panel, currently based on WhatsApp's DOM and therefore experimental

## Keyboard shortcuts

- `⌘/Ctrl + L`: focus and select the address bar
- `⌘/Ctrl + R`: reload the current page

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```


Electron launches the desktop shell. WhatsApp login persists in the `persist:whatsapp` partition.


## Terminal bridge

ChatGPT Web can queue occasional local build/test commands through GitHub. The bridge is an execution tool, not a development loop. See [`agentFiles/README.md`](./agentFiles/README.md).

```bash
npm run bridge
npm run bridge:status
`


This first iteration intentionally keeps integrations narrow. No fake terminal, inspector, or placeholder IDE apps are included.
