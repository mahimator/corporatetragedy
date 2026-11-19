# Corporate Tragedy

A workstation-style desktop browser for a focused personal workspace. The first integration is WhatsApp Web, with a persistent isolated session.

## Current scope

- Desktop shell built with Electron and React
- HTTP and HTTPS navigation
- Address bar accepts URLs or plain search queries (DuckDuckGo)
- Independent browser tabs with new-tab and close controls
- Back, forward, reload, and external-browser navigation
- Persistent WhatsApp Web session (`persist:whatsapp`)
- Optional workspace sidebar
- Local persistent bookmarks stored in the app
- Read-only WhatsApp chat preview panel (experimental and DOM-dependent)

## Keyboard shortcuts

- `⌘/Ctrl + L`: focus and select the address bar
- `⌘/Ctrl + R`: reload the current page
- `⌘/Ctrl + T`: new tab
- `⌘/Ctrl + W`: close active tab
- `Ctrl + Tab` / `Ctrl + Shift + Tab`: cycle tabs
- `⌥/Alt + ←`: back
- `⌥/Alt + →`: forward
- `Escape`: close the Chat Terminal overlay

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Electron launches the desktop shell. WhatsApp login persists in the `persist:whatsapp` partition.

## Experimental Chat Terminal

The Chat Terminal reads the WhatsApp chat list and a limited recent message view from the page DOM. It is read-only and does not send messages. WhatsApp may change its markup at any time, so this feature is experimental.

## Terminal bridge

ChatGPT Web can queue occasional local build/test commands through GitHub. The bridge is an execution tool, not a development loop. See [`agentFiles/README.md`](./agentFiles/README.md).

```bash
npm run bridge
npm run bridge:status
```

The first beta intentionally keeps integrations narrow and avoids placeholder tools that do not work yet.
