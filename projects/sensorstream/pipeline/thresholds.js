import config from '../config.js';

/**
 * Mutable runtime thresholds for sensor anomaly detection.
 * Initialized from config but can be updated at runtime via API.
 */

// Per-type min/max thresholds
const thresholds = {};
for (const [type, t] of Object.entries(config.sensor.types)) {
  thresholds[type] = { min: t.min, max: t.max };
}

// Last value per type (for temperature jump detection)
const lastValues = {};

// Temperature jump threshold
let maxTempJump = config.pipeline.maxTempJump;

export function getThresholds() {
  return { ...thresholds, maxTempJump };
}

export function getThreshold(type) {
  return thresholds[type] ? { ...thresholds[type] } : null;
}

/**
 * @param {object} partial - e.g. { temperature: { max: 50 }, maxTempJump: 20 }
 */
export function updateThresholds(partial) {
  for (const [key, val] of Object.entries(partial)) {
    if (key === 'maxTempJump') {
      maxTempJump = Number(val);
    } else if (thresholds[key]) {
      if (val.min != null) thresholds[key].min = Number(val.min);
      if (val.max != null) thresholds[key].max = Number(val.max);
    }
  }
}

export function getLastValue(type) {
  return lastValues[type];
}

export function setLastValue(type, value) {
  lastValues[type] = value;
}

export function getMaxTempJump() {
  return maxTempJump;
}
