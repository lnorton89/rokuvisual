const { WebSocketServer } = require('ws');
const { registerClient, unregisterClient, getLogs } = require('../lib/logger');

/**
 * WebSocket server handler
 */
function createWebSocketServer(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('[ws] client connected');
    registerClient(ws);

    // Send initial state with logs
    ws.send(
      JSON.stringify({
        type: 'state',
        state: global.state
      })
    );

    // Send existing logs
    getLogs().forEach((entry) => {
      ws.send(JSON.stringify({ type: 'log', entry }));
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'keypress' && msg.key) {
          const { handleButton } = require('../handlers/button-handler');
          handleButton(msg.key, global.state, 'WS');
        }
      } catch (e) {
        // Ignore invalid JSON
      }
    });

    ws.on('close', () => {
      console.log('[ws] client disconnected');
      unregisterClient(ws);
    });
  });

  return wss;
}

module.exports = { createWebSocketServer };
