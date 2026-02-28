# Roku Generative Visual

A Node.js server that polls your Roku TV via ECP and drives a generative canvas visual in the browser. Your Roku remote modulates the shape in real-time.

## Setup

```bash
npm install
ROKU_IP=192.168.1.x node server.js
```

Then open **http://localhost:3000** in a browser. Mirror/cast that tab to your TV, or just watch it on your computer while the remote controls it.

## How it works

- The server polls `http://<roku-ip>:8060/query/*` every 200ms via Roku's ECP (External Control Protocol)
- Button events are sent via POST to `/keypress/<Key>` — the server forwards them to the Roku AND updates the visual params
- The browser connects via WebSocket and re-renders the canvas on every param change
- No Roku SDK needed — pure HTTP

## Remote Controls → Visual

| Button | Effect |
|--------|--------|
| ◀ / ▶ | Rotate hue |
| ▲ / ▼ | Speed up / slow down |
| OK | Cycle shape mode (Lissajous → Rose → Spirograph → Wave → Particles) |
| ✦ (Info/*) | Increase complexity |
| ↩ (Back) | Decrease complexity |
| ⏯ (Play/Pause) | Toggle rainbow color shift |
| ⏮ / ⏭ (Rev/Fwd) | Scale shape smaller/larger |
| ⌂ (Home) | Reset all params |

## Shape Modes

- **lissajous** — classic X/Y harmonic figure-8 curves
- **rose** — rhodonea / polar rose petals
- **spirograph** — hypotrochoid (spirograph toy)
- **wave** — Bowditch-style wave interference
- **particles** — particle fountain from a moving source

## On-Screen Remote

There's also an on-screen remote in the bottom-right corner — useful for testing without a physical Roku remote nearby. Keyboard shortcuts also work (arrow keys, Enter, Backspace, Space, etc).

## Forwarding real Roku button presses

Roku's ECP doesn't push key events — it only lets you *send* them. To detect actual remote presses you have two options:

1. **Developer mode packet sniffing** — enable dev mode on your Roku and watch ECP traffic on your network with a tool like Wireshark or `tcpdump`
2. **Home Assistant / Node-RED** — many HA Roku integrations expose `keypress` events as automations, which can `POST /keypress/<Key>` to this server

## Requirements

- Node.js 18+
- Roku TV on the same local network
- "Control by mobile apps" → **Network access: Default** (Settings → System → Advanced system settings)
