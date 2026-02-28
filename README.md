# Roku Visual

A Node.js server that polls your Roku TV via ECP (External Control Protocol) and drives a generative canvas visualization in the browser. Your Roku remote modulates the shape, color, and motion in real-time.

![License](https://img.shields.io/badge/license-ISC-blue.svg)

## Features

- 📺 **Roku ECP Integration** - Polls device info, active app, and power state
- 🎨 **Generative Visuals** - 5 shape modes with dynamic parameters
- 🎮 **Remote Control** - Physical or on-screen remote controls the visualization
- 📊 **Real-time Logging** - Browser HUD shows ECP connection status and button events
- 🔁 **Hot Reload** - Auto-restarts on code changes during development
- 🌐 **WebSocket Sync** - Instant state updates to all connected clients

## Quick Start

```bash
# Install dependencies
npm install

# Set your Roku's IP address and start
ROKU_IP=192.168.1.x npm start
```

Then open **http://localhost:30002** in your browser.

## Development

```bash
# Auto-reload on file changes
npm run dev
```

## Configuration

| Environment Variable | Default         | Description               |
| -------------------- | --------------- | ------------------------- |
| `ROKU_IP`            | `192.168.1.155` | Your Roku TV's IP address |
| `PORT`               | `30002`         | Server port               |

### Finding Your Roku IP

1. On your Roku: **Settings** → **Network** → **About**
2. Note the IP address (e.g., `192.168.1.155`)
3. Or check your router's connected devices list

## Remote Controls → Visual Mapping

| Button            | Effect                       |
| ----------------- | ---------------------------- |
| ◀ / ▶             | Rotate hue (-15° / +15°)     |
| ▲ / ▼             | Speed up / slow down         |
| OK / Select       | Cycle shape mode             |
| ✦ (Star/Info)     | Increase complexity (1-8)    |
| ↩ (Back)          | Decrease complexity          |
| ⏯ (Play/Pause)   | Toggle rainbow color shift   |
| ⏮ / ⏭ (Rev/Fwd) | Scale smaller / larger       |
| ⌂ (Home)          | Reset all parameters         |
| Vol +/-           | Adjust volume (display only) |

## Shape Modes

| Mode           | Description                                  |
| -------------- | -------------------------------------------- |
| **Lissajous**  | Classic X/Y harmonic figure-8 curves         |
| **Rose**       | Rhodonea / polar rose petals                 |
| **Spirograph** | Hypotrochoid (spirograph toy patterns)       |
| **Wave**       | Bowditch-style wave interference             |
| **Particles**  | Particle fountain emitted from moving source |

## Interface

### HUD (Heads-Up Display)

- **Top-left**: Roku connection status, active app, power mode
- **Top-right**: Current shape mode and parameters (speed, complexity, scale)
- **Bottom-left**: Real-time event log (ECP requests, button presses, errors)
- **Bottom-right**: On-screen remote control

### On-Screen Remote

Click buttons or use keyboard shortcuts:

| Key        | Roku Button                |
| ---------- | -------------------------- |
| Arrow keys | D-pad (Up/Down/Left/Right) |
| Enter      | OK / Select                |
| Backspace  | Back                       |
| Escape     | Home                       |
| Space      | Play/Pause                 |
| `*`        | Info/Star                  |
| `+` / `-`  | Volume Up/Down             |
| `<` / `>`  | Rev/Fwd                    |

## How It Works

```
┌─────────────┐      HTTP Poll      ┌─────────────┐
│   Browser   │◄────WebSocket──────►│   Node.js   │
│  (Canvas)   │                     │   Server    │
└─────────────┘                     └──────┬──────┘
                                           │
                                    HTTP ECP (8060)
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │   Roku TV   │
                                    └─────────────┘
```

1. **Server polls Roku** every 200ms via ECP (`/query/device-info`, `/query/active-app`)
2. **Browser connects** via WebSocket and receives state updates
3. **Button presses** (on-screen or keyboard) send to server via WebSocket
4. **Server forwards** keypresses to Roku via ECP POST and updates visual parameters
5. **Canvas renders** generative shapes based on current parameters

## API Endpoints

| Endpoint         | Method | Description                   |
| ---------------- | ------ | ----------------------------- |
| `/`              | GET    | Serve canvas UI               |
| `/state`         | GET    | Current state snapshot (JSON) |
| `/keypress/:key` | POST   | Inject button event           |

## Project Structure

```
rokuvisual/
├── src/
│   ├── index.js        # Entry point
│   └── server.js       # Express + WebSocket + ECP logic
├── public/
│   └── index.html      # Canvas, HUD, remote, and render logic
├── package.json
├── nodemon.json        # Hot reload config
└── .gitignore
```

## Requirements

- **Node.js** 18+
- **Roku TV** on the same local network
- **Network access** enabled: Settings → System → Advanced system settings → Control by mobile apps → **Network access: Default**

## Troubleshooting

### "ECP not reachable" in logs

- Verify Roku IP is correct
- Ensure Roku and computer are on the same network
- Check Roku's ECP is enabled (Settings → System → Advanced system settings → Control by mobile apps)
- Firewall may be blocking port 8060

### Visual doesn't respond to remote

- Roku ECP doesn't push button events — it only accepts them
- Use the on-screen remote or keyboard to control the visual
- For actual Roku remote integration, see below

## Integrating Real Roku Remote Presses

Roku's ECP API only lets you _send_ keypresses, not receive them. To detect actual remote button presses:

### Option 1: Developer Mode Packet Sniffing

1. Enable developer mode on Roku (press Home 5x, etc.)
2. Capture network traffic with Wireshark or tcpdump
3. Filter for ECP traffic from your Roku's IP
4. Parse keypress events and forward to this server

### Option 2: Home Assistant / Node-RED

Many home automation platforms have Roku integrations that expose keypress events:

```yaml
# Example Home Assistant automation
automation:
  - alias: 'Roku Remote to Visual'
    trigger:
      platform: event
      event_type: roku_command
    action:
      service: rest_command.roku_visual_keypress
      data:
        key: '{{ trigger.event.data.command }}'
```

### Option 3: Companion Script

Write a separate script that monitors your network for Roku ECP responses and forwards detected events:

```bash
POST http://localhost:30002/keypress/Select
```

## Media Assistant Integration

**Roku Visual** works seamlessly with [Media Assistant](https://github.com/MedievalApple/Media-Assistant), a Roku channel that enables media playback from URLs via deeplink commands. This integration allows you to:

- Play media content (audio/video) directly through Media Assistant
- Control Media Assistant playback using the same ECP commands
- Visualize Media Assistant's UI state in the Roku Visual interface

### Installing Media Assistant

#### From Roku Channel Store (Recommended)

1. Visit [medievalapple.net/ma-setup](https://medievalapple.net/ma-setup)
2. Or search for "Media Assistant" in the Roku Channel Store
3. Channel ID: `782875`

#### Sideload (Development)

1. Enable Developer Mode on your Roku:
   - Press: **Home ×3 → Up ×2 → Right → Left → Right → Left → Right**
2. Download `Media-Assistant.zip` from [Releases](https://github.com/MedievalApple/Media-Assistant/releases)
3. Sideload via [Roku Development Setup](https://developer.roku.com/docs/developer-program/getting-started/developer-setup.md)
4. Channel ID when sideloaded: `dev`

### Prerequisites

**Enable "Control by mobile apps" on Roku:**
- Go to: **Settings → System → Advanced system settings → Control by mobile apps → Network access**

### Using Media Assistant with Roku Visual

#### Launch Media Assistant

```bash
# Using curl
curl -d '' 'http://192.168.1.x:8060/launch/782875'

# Using the on-screen remote in Roku Visual
# Press Home to return to the main screen, then navigate to Media Assistant
```

#### Play Media via Deeplink

```bash
# Launch and play video
curl -d '' 'http://192.168.1.x:8060/launch/782875?u=https%3A%2F%2Farchive.org%2Fdownload%2FBigBuckBunny_124%2FContent%2Fbig_buck_bunny_720p_surround.mp4&t=v'

# Play audio with metadata
curl -d '' 'http://192.168.1.x:8060/input?u=https://example.com/stream.mp3&t=a&songName=Test&artistName=Artist'
```

#### Supported Media Types

| Type | Parameter | Description |
|------|-----------|-------------|
| Video | `t=v` | Plays video content (sets Video UI mode) |
| Audio | `t=a` | Plays audio content (sets Audio UI mode) |
| Metadata | `t=m` | Updates metadata only (Audio UI mode only) |

#### Common URL Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `u` or `contentId` | Media URL (required) | `https://example.com/video.mp4` |
| `t` | Media type (`a`, `v`, or `m`) | `v` for video |
| `videoName` | Video title | `Big Buck Bunny` |
| `songName` | Song title | `Local Elevator` |
| `artistName` | Artist name | `Kevin MacLeod` |
| `albumName` | Album name | `Epic Elevator Tunes` |
| `albumArt` | Cover art image URL | `https://example.com/cover.jpg` |
| `enqueue` | Queue after current item | `true` |

### Media Assistant Settings

Access settings in **Audio UI mode** by pressing **OK** on the remote:

| Setting | Description |
|---------|-------------|
| **Album Art Background** | Use album art as background |
| **Show Album Name If Available** | Display album name above song |
| **Enable Screen Saver During Playback** | Allow screen saver during audio |

⚠️ **Note:** If "Enable Screen Saver During Playback" is enabled:
- Enqueued media will not play after current item
- `/input?` commands will not work
- `/launch` commands still function

### Integration Examples

#### JavaScript (Fetch API)

```javascript
const rokuIP = '192.168.1.x'
const channelID = '782875'

async function playMedia(url, type = 'v') {
    const params = new URLSearchParams({ u: url, t: type })
    
    await fetch(`http://${rokuIP}:8060/launch/${channelID}?${params}`, {
        method: 'POST',
        mode: 'no-cors',
    })
}

// Play video
playMedia('https://example.com/video.mp4', 'v')

// Play audio
playMedia('https://example.com/audio.mp3', 'a')
```

#### Python (Requests)

```python
import requests

roku_ip = '192.168.1.x'
channel_id = '782875'

def play_media(url, media_type='v'):
    params = {'u': url, 't': media_type}
    r = requests.post(f'http://{roku_ip}:8060/launch/{channel_id}', params=params)
    
    if r.status_code == 200:
        print('Media playing successfully')

play_media('https://example.com/video.mp4', 'v')
```

### Testing Tools

- **Media Assistant Tester**: [medievalapple.net/ma-setup](https://medievalapple.net/ma-setup) - Web interface to test deeplinks
- **Roku Visual HUD**: Shows active app (Media Assistant) and current state

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Media won't play | Verify URL is accessible and properly encoded |
| Wrong UI mode | Ensure correct `t` parameter (`a` for audio, `v` for video) |
| Settings not applying | Restart Media Assistant or start new media playback |
| ECP commands fail | Check "Control by mobile apps" is enabled on Roku |

### Resources

- [Media Assistant GitHub](https://github.com/MedievalApple/Media-Assistant)
- [Media Assistant Setup](https://medievalapple.net/ma-setup)
- [Roku Deeplink Documentation](https://developer.roku.com/docs/developer-program/deep-linking/deep-linking.md)

## Development Tools

This project includes a modern development toolchain for code quality and testing:

### Linting & Formatting

```bash
# Check code for issues
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code with Prettier
npm run format

# Check formatting without changing files
npm run format:check
```

### Testing with Playwright

```bash
# Run all tests (starts server automatically)
npm test

# Run tests with UI mode
npm run test:ui

# Debug tests step-by-step
npm run test:debug

# View HTML test report
npm run test:report
```

### Toolchain Overview

| Tool           | Purpose            | Config File            |
| -------------- | ------------------ | ---------------------- |
| **ESLint**     | JavaScript linting | `.eslintrc.json`       |
| **Prettier**   | Code formatting    | `.prettierrc`          |
| **Playwright** | E2E & API testing  | `playwright.config.js` |
| **nodemon**    | Hot reload         | `nodemon.json`         |

Tests cover:

- Page load and canvas rendering
- HUD element visibility
- Remote button interactions
- Keyboard shortcuts
- WebSocket connection
- API endpoints (`/state`, `/keypress/:key`)

## License

ISC
