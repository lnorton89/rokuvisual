/**
 * Roku Generative Visual Server
 * ──────────────────────────────
 * Polls the Roku ECP API for device info + button events,
 * then broadcasts state changes to browser clients via WebSocket.
 *
 * Usage:
 *   ROKU_IP=192.168.1.x node server.js
 *
 * Then open http://localhost:{HOST_PORT} in a browser (ideally cast/mirror to your TV).
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const ROKU_IP = process.env.ROKU_IP || '192.168.1.155';
const ROKU_PORT = 8060;
const HOST_PORT = process.env.PORT || 30002;
const POLL_MS = 200; // how often to poll ECP (ms)
const LOG_MAX = 50; // max log entries to keep

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  connected: false,
  powerMode: 'unknown', // PowerOn | DisplayOff | Headless
  activeApp: 'Home',
  activeAppId: '0',
  volume: 50, // estimated 0-100 (ECP doesn't expose real volume)
  lastButton: null, // most recent button detected via keyboard polling
  buttonHistory: [], // rolling last-10 buttons
  deviceInfo: {},
  logs: [], // real-time log entries
  // Derived generative params (updated by button events)
  params: {
    hue: 200, // 0-360
    speed: 1.0, // 0.1 - 5.0
    complexity: 3, // 1 - 8  (number of lobes / harmonics)
    scale: 1.0, // 0.2 - 3.0
    mode: 'lissajous', // lissajous | rose | spirograph | wave | particles
    colorShift: false,
    pulseOnBeat: false
  }
};

function addLog(level, message, detail = '') {
  const entry = {
    ts: new Date().toISOString(),
    level, // 'info' | 'warn' | 'error' | 'ecp' | 'button'
    message,
    detail
  };
  state.logs = [entry, ...state.logs].slice(0, LOG_MAX);
  broadcast({ type: 'log', entry });
  // Also print to console
  const prefix = `[${entry.ts.slice(11, 23)}]`;
  if (level === 'error') {
    console.error(`${prefix} ${message}`, detail);
  } else if (level === 'ecp') {
    console.log(`${prefix} [ECP] ${message}`);
  } else if (level === 'button') {
    console.log(`${prefix} [BTN] ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

const MODES = ['lissajous', 'rose', 'spirograph', 'wave', 'particles'];

// ── ECP Helpers ───────────────────────────────────────────────────────────────

function ecpGet(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: ROKU_IP, port: ROKU_PORT, path, timeout: 1500 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', (err) => {
      addLog('error', `ECP GET ${path} failed`, err.message);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

function ecpPost(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ROKU_IP,
      port: ROKU_PORT,
      path,
      method: 'POST',
      headers: { 'Content-Length': 0 },
      timeout: 1500
    };
    const req = http.request(options, (res) => {
      res.resume();
      res.on('end', resolve);
    });
    req.on('error', (err) => {
      addLog('error', `ECP POST ${path} failed`, err.message);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

// Simple XML field extractor (no deps)
function xmlField(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1].trim() : null;
}

// ── Polling ───────────────────────────────────────────────────────────────────

let ecpErrorCount = 0;

async function pollRoku() {
  try {
    // 1. Device info (power, volume hint, etc.)
    const infoXml = await ecpGet('/query/device-info');
    const powerMode = xmlField(infoXml, 'power-mode') || 'unknown';

    ecpErrorCount = 0; // reset on success

    // 2. Active app
    const appXml = await ecpGet('/query/active-app');
    const appName = xmlField(appXml, 'name') || 'Home';
    const appId = xmlField(appXml, 'id') || '0';

    // 3. Key press detection via media player state (indirect approach)
    //    Roku doesn't expose raw key events via ECP, but we can watch
    //    media-player state changes as a proxy for user interaction.
    await ecpGet('/query/media-player');

    let changed = false;

    if (powerMode !== state.powerMode) {
      state.powerMode = powerMode;
      addLog('ecp', `Power mode: ${powerMode}`);
      changed = true;
    }
    if (appName !== state.activeApp) {
      state.activeApp = appName;
      state.activeAppId = appId;
      addLog('ecp', `App changed: ${appName}`);
      // Switching app → shift hue
      state.params.hue = (state.params.hue + 47) % 360;
      changed = true;
    }

    state.connected = true;

    if (changed) {
      broadcast({ type: 'state', state: safeState() });
    }
  } catch (err) {
    ecpErrorCount++;
    if (state.connected) {
      state.connected = false;
      addLog('warn', `ECP connection lost after ${ecpErrorCount} errors`);
      broadcast({ type: 'state', state: safeState() });
    } else if (ecpErrorCount === 1) {
      addLog('warn', `ECP not reachable at ${ROKU_IP}:${ROKU_PORT}`);
    }
  }
}

// ── Button simulation via ECP keyboard subscribe (best-effort) ───────────────
//
// Roku ECP doesn't push button events; we use a known pattern:
// POST /keypress/<Key>  to SEND keypresses. To DETECT them we have
// to rely on app state diffs above, OR the user can wire a companion
// script using Roku's ECPD (developer-mode) packet sniffer.
//
// For demo purposes we expose a /keypress/:key HTTP endpoint that
// the user (or any automation) can call to inject key events.

function handleButton(key) {
  console.log(`[button] ${key}`);
  state.lastButton = key;
  state.buttonHistory = [key, ...state.buttonHistory].slice(0, 10);

  addLog('button', `Key pressed: ${key}`);

  const p = state.params;

  switch (key) {
    // D-pad → hue rotation
    case 'Left':
      p.hue = (p.hue - 15 + 360) % 360;
      break;
    case 'Right':
      p.hue = (p.hue + 15) % 360;
      break;

    // Up/Down → speed
    case 'Up':
      p.speed = Math.min(5.0, +(p.speed + 0.25).toFixed(2));
      break;
    case 'Down':
      p.speed = Math.max(0.1, +(p.speed - 0.25).toFixed(2));
      break;

    // OK → cycle mode
    case 'Select':
    case 'OK': {
      const idx = MODES.indexOf(p.mode);
      p.mode = MODES[(idx + 1) % MODES.length];
      addLog('button', `Mode cycled to: ${p.mode}`);
      break;
    }

    // * → increase complexity
    case 'Info':
    case 'Star':
      p.complexity = (p.complexity % 8) + 1;
      break;

    // Back → decrease complexity
    case 'Back':
      p.complexity = Math.max(1, p.complexity - 1);
      break;

    // Play/Pause → toggle color shift
    case 'Play':
    case 'Pause':
      p.colorShift = !p.colorShift;
      break;

    // Fwd/Rev → scale
    case 'Fwd':
      p.scale = Math.min(3.0, +(p.scale + 0.2).toFixed(1));
      break;
    case 'Rev':
      p.scale = Math.max(0.2, +(p.scale - 0.2).toFixed(1));
      break;

    // Volume (ECP keypresses only — actual volume isn't readable)
    case 'VolumeUp':
      state.volume = Math.min(100, state.volume + 5);
      break;
    case 'VolumeDown':
      state.volume = Math.max(0, state.volume - 5);
      break;

    // Home → reset
    case 'Home':
      Object.assign(p, {
        hue: 200,
        speed: 1.0,
        complexity: 3,
        scale: 1.0,
        mode: 'lissajous',
        colorShift: false
      });
      addLog('button', 'Params reset to defaults');
      break;
  }

  broadcast({ type: 'button', key, params: p });
}

// ── Express + WebSocket ───────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, '..', 'public')));

// Inject button event from external caller or browser UI
app.post('/keypress/:key', (req, res) => {
  handleButton(req.params.key);
  // Also forward to Roku so the TV actually responds
  ecpPost(`/keypress/${req.params.key}`).catch(() => {});
  res.json({ ok: true, key: req.params.key });
});

// Current state snapshot
app.get('/state', (req, res) => res.json(safeState()));

// WebSocket
wss.on('connection', (ws) => {
  console.log('[ws] client connected');
  // Send initial state with logs
  ws.send(JSON.stringify({ type: 'state', state: safeState() }));
  // Send existing logs
  state.logs.forEach((entry) => {
    ws.send(JSON.stringify({ type: 'log', entry }));
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'keypress' && msg.key) {
        handleButton(msg.key);
      }
    } catch (e) {
      // Ignore invalid JSON
    }
  });

  ws.on('close', () => console.log('[ws] client disconnected'));
});

function broadcast(obj) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach((c) => {
    if (c.readyState === 1) {
      c.send(msg);
    }
  });
}

function safeState() {
  return {
    connected: state.connected,
    powerMode: state.powerMode,
    activeApp: state.activeApp,
    volume: state.volume,
    lastButton: state.lastButton,
    buttonHistory: state.buttonHistory,
    params: { ...state.params },
    logs: state.logs
  };
}

// ── Start ─────────────────────────────────────────────────────────────────────

server.listen(HOST_PORT, () => {
  console.log('\n🎨 Roku Generative Visual');
  console.log(`   Server  → http://localhost:${HOST_PORT}`);
  console.log(`   Roku IP → ${ROKU_IP}:${ROKU_PORT}`);
  console.log('\n   Set your Roku IP:  ROKU_IP=x.x.x.x node server.js');
  console.log(`   Inject buttons:    POST http://localhost:${HOST_PORT}/keypress/<Key>\n`);
});

setInterval(pollRoku, POLL_MS);
pollRoku();
