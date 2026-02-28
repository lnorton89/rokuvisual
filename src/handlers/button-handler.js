const config = require('../lib/config');
const { addLog, broadcast } = require('../lib/logger');

const cfg = config.loadConfig();

// Debounce button events
let lastButtonTime = 0;
const BUTTON_DEBOUNCE_MS = 50; // Minimum time between button events

/**
 * Handle button press and update visual params
 */
function handleButton(key, state, source = 'unknown') {
  // Debounce rapid button presses
  const now = Date.now();
  if (now - lastButtonTime < BUTTON_DEBOUNCE_MS) {
    return state;
  }
  lastButtonTime = now;

  addLog('button', `Key pressed: ${key}${source !== 'unknown' ? ` [${source}]` : ''}`);

  state.lastButton = key;
  state.buttonHistory = [key, ...state.buttonHistory].slice(0, 10);

  const mapping = cfg.buttonMap[key];
  if (!mapping) {
    return state;
  }

  const p = state.params;

  switch (mapping.action) {
  case 'hue':
    p.hue = (p.hue + mapping.value + 360) % 360;
    break;

  case 'speed':
    p.speed = clamp(p.speed + mapping.value, mapping.min, mapping.max);
    break;

  case 'complexity':
    if (mapping.cycle) {
      p.complexity = (p.complexity % mapping.cycle) + 1;
    } else {
      p.complexity = clamp(p.complexity + mapping.value, mapping.min, Infinity);
    }
    break;

  case 'scale':
    p.scale = clamp(p.scale + mapping.value, mapping.min, mapping.max);
    break;

  case 'cycleMode': {
    const modes = cfg.visual.modes;
    const idx = modes.indexOf(p.mode);
    p.mode = modes[(idx + 1) % modes.length];
    addLog('button', `Mode cycled to: ${p.mode}`);
    break;
  }

  case 'toggle':
    p[mapping.param] = !p[mapping.param];
    break;

  case 'volume':
    state.volume = clamp(state.volume + mapping.value, 0, 100);
    break;

  case 'reset':
    Object.assign(p, {
      hue: cfg.visual.defaultHue,
      speed: cfg.visual.defaultSpeed,
      complexity: cfg.visual.defaultComplexity,
      scale: cfg.visual.defaultScale,
      mode: cfg.visual.defaultMode,
      colorShift: cfg.visual.colorShift
    });
    addLog('button', 'Params reset to defaults');
    break;
  }

  broadcast({ type: 'button', key, params: p });
  return state;
}

/**
 * Clamp value between min and max
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

module.exports = { handleButton, clamp };
