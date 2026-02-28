const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Load and merge configuration files
 */
function loadConfig() {
  const defaultPath = path.join(__dirname, '..', '..', 'config', 'default.yaml');
  const userPath = path.join(__dirname, '..', '..', 'config', 'config.yaml');

  // Load default config
  const defaultConfig = yaml.load(fs.readFileSync(defaultPath, 'utf8'));

  // Override with user config if it exists
  if (fs.existsSync(userPath)) {
    const userConfig = yaml.load(fs.readFileSync(userPath, 'utf8'));
    return mergeConfig(defaultConfig, userConfig);
  }

  return defaultConfig;
}

/**
 * Deep merge two objects
 */
function mergeConfig(defaults, user) {
  const result = { ...defaults };

  for (const key in user) {
    if (user[key] instanceof Object && key in defaults) {
      result[key] = mergeConfig(defaults[key], user[key]);
    } else {
      result[key] = user[key];
    }
  }

  return result;
}

/**
 * Get config value with environment variable override
 */
function getConfig(config, keyPath, envVar) {
  const keys = keyPath.split('.');
  let value = config;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      value = undefined;
      break;
    }
  }

  // Environment variable takes precedence
  if (envVar && process.env[envVar]) {
    return process.env[envVar];
  }

  return value;
}

module.exports = { loadConfig, getConfig, mergeConfig };
