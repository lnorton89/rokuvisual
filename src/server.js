/**
 * Roku Visual Server
 * Modular server implementation
 */

const http = require('http');
const config = require('./lib/config');
const ECPClient = require('./lib/ecp-client');
const { broadcast } = require('./lib/logger');

// Load configuration
const cfg = config.loadConfig();

// Get settings with environment variable overrides
const ROKU_IP = process.env.ROKU_IP || config.getConfig(cfg, 'roku.ip', null);
const ROKU_PORT = config.getConfig(cfg, 'roku.port', null);
const HOST_PORT = process.env.PORT || config.getConfig(cfg, 'server.port', null);
const POLL_MS = config.getConfig(cfg, 'roku.pollInterval', null);

// Initialize state
global.state = {
  connected: false,
  powerMode: 'unknown',
  activeApp: 'Home',
  activeAppId: '0',
  volume: 50,
  lastButton: null,
  buttonHistory: [],
  params: {
    hue: config.getConfig(cfg, 'visual.defaultHue', null),
    speed: config.getConfig(cfg, 'visual.defaultSpeed', null),
    complexity: config.getConfig(cfg, 'visual.defaultComplexity', null),
    scale: config.getConfig(cfg, 'visual.defaultScale', null),
    mode: config.getConfig(cfg, 'visual.defaultMode', null),
    colorShift: config.getConfig(cfg, 'visual.colorShift', null)
  }
};

// Initialize ECP client
const ecp = new ECPClient(ROKU_IP, ROKU_PORT);

// Create HTTP server
const { createApp } = require('./handlers/routes');
const app = createApp();
const server = http.createServer(app);

// Create WebSocket server
const { createWebSocketServer } = require('./handlers/websocket');
createWebSocketServer(server);

// Create poller
const { RokuPoller } = require('./handlers/poller');
const poller = new RokuPoller(ecp, global.state);

// Start server
server.listen(HOST_PORT, () => {
  console.log('\n🎨 Roku Visual');
  console.log(`   Server  → http://localhost:${HOST_PORT}`);
  console.log(`   Roku IP → ${ROKU_IP}:${ROKU_PORT}`);
  console.log('   Config  → config/default.yaml');
  console.log('\n   Set Roku IP:  ROKU_IP=x.x.x.x npm start');
  console.log('   Dev mode:     npm run dev');
  console.log(`   Inject buttons: POST http://localhost:${HOST_PORT}/keypress/<Key>\n`);

  // Log server started
  const { addLog } = require('./lib/logger');
  addLog('info', `✓ HTTP server listening on http://localhost:${HOST_PORT}`);
  addLog('info', `→ Connecting to Roku ECP API at ${ROKU_IP}:${ROKU_PORT}...`);
});

// Start polling with initial delay to let Roku wake up
setTimeout(() => {
  setInterval(() => poller.poll(), POLL_MS);
  poller.poll();
}, 1000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[reload] Shutting down...');
  broadcast({ type: 'reload' });
  setTimeout(() => process.exit(0), 500);
});

process.on('SIGTERM', () => {
  broadcast({ type: 'reload' });
  setTimeout(() => process.exit(0), 500);
});
