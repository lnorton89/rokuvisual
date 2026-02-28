const http = require('http');
const { addLog } = require('./logger');

/**
 * Roku ECP API client
 */
class ECPClient {
  constructor(ip, port, timeout = 1500) {
    this.ip = ip;
    this.port = port;
    this.timeout = timeout;
  }

  /**
   * GET request to ECP API
   */
  async get(path) {
    return new Promise((resolve, reject) => {
      const req = http.get(
        {
          hostname: this.ip,
          port: this.port,
          path,
          timeout: this.timeout
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(data));
        }
      );

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('timeout'));
      });
    });
  }

  /**
   * POST request to ECP API
   */
  async post(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.ip,
        port: this.port,
        path,
        method: 'POST',
        headers: { 'Content-Length': 0 },
        timeout: this.timeout
      };

      const req = http.request(options, (res) => {
        res.resume();
        res.on('end', resolve);
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('timeout'));
      });

      req.end();
    });
  }

  /**
   * Send keypress to Roku
   */
  async keypress(key) {
    try {
      await this.post(`/keypress/${key}`);
      return true;
    } catch (err) {
      addLog('error', `ECP keypress ${key} failed`, err.message);
      return false;
    }
  }

  /**
   * Get device info
   */
  async getDeviceInfo() {
    return this.get('/query/device-info');
  }

  /**
   * Get active app
   */
  async getActiveApp() {
    return this.get('/query/active-app');
  }

  /**
   * Get media player state
   */
  async getMediaPlayer() {
    return this.get('/query/media-player');
  }
}

module.exports = ECPClient;
