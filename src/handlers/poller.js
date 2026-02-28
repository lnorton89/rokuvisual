const { addLog, broadcast, resetErrorCounts } = require('../lib/logger');

/**
 * Simple XML field extractor
 */
function xmlField(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
  return m ? m[1].trim() : null;
}

/**
 * Roku state poller
 */
class RokuPoller {
  constructor(ecpClient, state) {
    this.ecp = ecpClient;
    this.state = state;
    this.errorCount = 0;
    this.connected = false;
    this.hasConnectedOnce = false;
  }

  /**
   * Poll Roku for state changes
   */
  async poll() {
    try {
      // Get device info
      const infoXml = await this.ecp.getDeviceInfo();
      const powerMode = xmlField(infoXml, 'power-mode') || 'unknown';

      // Reset error count on success
      this.errorCount = 0;
      resetErrorCounts();

      // Get active app
      const appXml = await this.ecp.getActiveApp();
      const appName = xmlField(appXml, 'name') || 'Home';
      const appId = xmlField(appXml, 'id') || '0';

      let changed = false;

      // First successful connection
      if (!this.hasConnectedOnce) {
        this.hasConnectedOnce = true;
        this.state.powerMode = powerMode;  // Set initial state without logging change
        addLog('info', `✓ ECP connected to Roku at ${this.ecp.ip}:${this.ecp.port}`);
        addLog('info', `✓ Roku device is ${powerMode === 'PowerOn' ? 'on' : powerMode}`);
      } else if (powerMode !== this.state.powerMode) {
        // Power mode changed after initial connection
        this.state.powerMode = powerMode;
        addLog('info', `Roku power mode changed: ${powerMode}`);
        changed = true;
      }

      // Check app change
      if (appName !== this.state.activeApp) {
        this.state.activeApp = appName;
        this.state.activeAppId = appId;
        addLog('info', `App changed: ${appName}`);

        // Shift hue on app change
        this.state.params.hue = (this.state.params.hue + 47) % 360;
        changed = true;
      }

      this.connected = true;
      this.state.connected = true;

      if (changed) {
        broadcast({ type: 'state', state: this.safeState() });
      }
    } catch (err) {
      this.errorCount++;

      if (this.connected) {
        this.connected = false;
        this.state.connected = false;
        addLog(
          'warn',
          `ECP connection lost after ${this.errorCount} errors`
        );
        broadcast({ type: 'state', state: this.safeState() });
      } else if (this.errorCount === 1) {
        addLog('warn', `ECP not reachable at ${this.ecp.ip}:${this.ecp.port}`);
      }
    }
  }

  /**
   * Get safe state snapshot
   */
  safeState() {
    return {
      connected: this.state.connected,
      powerMode: this.state.powerMode,
      activeApp: this.state.activeApp,
      volume: this.state.volume,
      lastButton: this.state.lastButton,
      buttonHistory: this.state.buttonHistory,
      params: { ...this.state.params }
    };
  }
}

module.exports = { RokuPoller, xmlField };
