import { randomUUID } from 'crypto';
import config from './config.js';

const { types } = config.sensor;
const typeNames = Object.keys(types);

// Per-type current value, initialized near nominal with slight offset.
// State initializes lazily so tests can inject a deterministic RNG first.
const sensorState = {};
let initialized = false;
let random = Math.random;

function initState() {
  for (const name of typeNames) {
    const t = types[name];
    sensorState[name] =
      Math.round((t.nominal + (random() - 0.5) * (t.max - t.min) * 0.1) * 100) / 100;
  }
  initialized = true;
}

/**
 * Replaces the RNG used by the simulator and re-initializes walk state so
 * runs are fully deterministic. Production uses Math.random; tests inject
 * a seeded PRNG to avoid randomness-dependent assertions.
 *
 * @param {() => number} fn - Function returning a float in [0, 1).
 */
export function setRandom(fn) {
  if (typeof fn !== 'function') {
    throw new TypeError('setRandom expects a function returning a float in [0, 1)');
  }
  random = fn;
  initialized = false;
}

/**
 * Generates a single sensor reading using unrestricted random walk.
 * Values drift smoothly like real sensors. The walk is unconstrained —
 * it naturally drifts above/below thresholds and comes back on its own.
 * No artificial spikes, no clamping to threshold range.
 *
 * @returns {{ id: string, timestamp: number, type: string, value: number, unit: string }}
 */
export function generateReading() {
  if (!initialized) initState();

  const type = typeNames[Math.floor(random() * typeNames.length)];
  const t = types[type];
  const range = t.max - t.min;

  // Smooth random walk — 15% of range per step. No clamping to [min, max]
  // so values naturally drift across thresholds and back.
  // A soft guard rail at ±30% of range prevents runaway values.
  const guardMin = t.min - range * 0.3;
  const guardMax = t.max + range * 0.3;
  const step = (random() - 0.5) * range * 0.15;
  const value =
    Math.round(Math.max(guardMin, Math.min(guardMax, sensorState[type] + step)) * 100) / 100;

  sensorState[type] = value;

  return {
    id: randomUUID(),
    timestamp: Date.now(),
    type,
    value,
    unit: t.unit,
  };
}

/**
 * Generates a batch of readings (useful for testing).
 * @param {number} count
 * @returns {Array}
 */
export function generateBatch(count) {
  const readings = [];
  for (let i = 0; i < count; i++) {
    readings.push(generateReading());
  }
  return readings;
}
