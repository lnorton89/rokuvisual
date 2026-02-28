const express = require('express');
const path = require('path');
const { handleButton } = require('../handlers/button-handler');

/**
 * Create and configure Express app
 */
function createApp() {
  const app = express();

  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, '..', '..', 'public')));

  // Inject button event from external caller or browser UI
  app.post('/keypress/:key', (req, res) => {
    handleButton(req.params.key, global.state);

    // Also forward to Roku so the TV actually responds
    const ECPClient = require('../lib/ecp-client');
    const ecp = new ECPClient(
      process.env.ROKU_IP || '192.168.1.155',
      8060
    );
    ecp.post(`/keypress/${req.params.key}`).catch(() => {});

    res.json({ ok: true, key: req.params.key });
  });

  // Current state snapshot
  app.get('/state', (req, res) => {
    res.json({
      connected: global.state.connected,
      powerMode: global.state.powerMode,
      activeApp: global.state.activeApp,
      volume: global.state.volume,
      lastButton: global.state.lastButton,
      buttonHistory: global.state.buttonHistory,
      params: { ...global.state.params },
      logs: require('../lib/logger').getLogs()
    });
  });

  return app;
}

module.exports = { createApp };
