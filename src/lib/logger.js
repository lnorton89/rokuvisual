const config = require('./config');

const state = { logs: [] };
let wsClients = [];
let errorCounts = {};
let suppressedUntil = 0;

/**
 * Add a log entry
 */
function addLog(level, message, detail = '') {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    detail
  };

  const maxEntries = config.getConfig(
    config.loadConfig(),
    'logging.maxEntries',
    null
  );

  state.logs = [entry, ...state.logs].slice(0, maxEntries || 50);

  // Broadcast to WebSocket clients
  broadcast({ type: 'log', entry });

  // Console output with throttling for errors
  const prefix = `[${entry.ts.slice(11, 23)}]`;

  if (level === 'error') {
    // Throttle repeated errors
    const now = Date.now();
    errorCounts[message] = (errorCounts[message] || 0) + 1;

    // Suppress after max errors until cooldown
    const maxErrors = config.getConfig(
      config.loadConfig(),
      'roku.maxErrors',
      null
    );
    const cooldown = config.getConfig(
      config.loadConfig(),
      'roku.errorCooldown',
      null
    );

    if (errorCounts[message] > (maxErrors || 5)) {
      if (now < suppressedUntil) {
        return; // Skip logging
      } else {
        suppressedUntil = now + (cooldown || 10000);
        errorCounts[message] = 0;
        console.error(`${prefix} ${message} (suppressed for ${cooldown || 10000}ms)`);
      }
    } else {
      console.error(`${prefix} ${message}`, detail || '');
    }
  } else if (level === 'ecp') {
    console.log(`${prefix} [ECP] ${message}`);
  } else if (level === 'button') {
    console.log(`${prefix} [BTN] ${message}`);
  } else if (level === 'info') {
    console.log(`${prefix} ${message}`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

/**
 * Broadcast message to WebSocket clients
 */
function broadcast(obj) {
  const msg = JSON.stringify(obj);
  wsClients.forEach((c) => {
    if (c.readyState === 1) {
      c.send(msg);
    }
  });
}

/**
 * Register WebSocket client for logging
 */
function registerClient(ws) {
  wsClients.push(ws);
}

/**
 * Unregister WebSocket client
 */
function unregisterClient(ws) {
  wsClients = wsClients.filter((c) => c !== ws);
}

/**
 * Get current logs
 */
function getLogs() {
  return state.logs;
}

/**
 * Reset error throttling
 */
function resetErrorCounts() {
  errorCounts = {};
  suppressedUntil = 0;
}

module.exports = {
  addLog,
  broadcast,
  registerClient,
  unregisterClient,
  getLogs,
  resetErrorCounts
};
