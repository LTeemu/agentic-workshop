import { getThreshold, getLastValue, setLastValue, getMaxTempJump } from './thresholds.js';

/**
 * Cleans a validated sensor reading:
 *  1. Normalize sensor errors (e.g., negative vibration)
 *  2. Clamp to configurable min/max thresholds
 *  3. Detect temperature jumps
 *
 * Thresholds are runtime-mutable — changes via API take effect immediately.
 *
 * @param {object} reading - Validated reading (from validate.js).
 * @returns {object} The cleaned reading with added metadata.
 */
export function cleanReading(reading) {
  const cleaned = { ...reading };
  const originalValue = reading.value;
  let isAnomaly = false;
  let anomalyReason = null;

  // ── Step 1: Normalize sensor errors ──
  if (reading.type === 'vibration' && originalValue < 0) {
    isAnomaly = true;
    anomalyReason = 'negative vibration value (absolute corrected)';
    cleaned.value = Math.abs(originalValue);
  }

  // ── Step 2: Absolute range enforcement (uses live thresholds) ──
  const t = getThreshold(reading.type);
  if (t) {
    if (cleaned.value < t.min) {
      isAnomaly = true;
      anomalyReason =
        (anomalyReason ? anomalyReason + '; ' : '') +
        `value ${cleaned.value} below minimum ${t.min}`;
      cleaned.value = t.min;
    } else if (cleaned.value > t.max) {
      isAnomaly = true;
      anomalyReason =
        (anomalyReason ? anomalyReason + '; ' : '') +
        `value ${cleaned.value} exceeds maximum ${t.max}`;
      cleaned.value = t.max;
    }
  }

  // ── Step 3: Temperature jump detection ──
  if (reading.type === 'temperature') {
    const lastTemp = getLastValue('temperature');
    if (lastTemp != null) {
      const jump = Math.abs(reading.value - lastTemp);
      if (jump > getMaxTempJump()) {
        isAnomaly = true;
        anomalyReason =
          (anomalyReason ? anomalyReason + '; ' : '') +
          `temperature jumped ${jump.toFixed(1)}°C (max ${getMaxTempJump()}°C allowed)`;
      }
    }
  }

  // Track last value per type for subsequent jump detection
  setLastValue(reading.type, reading.value);

  // ── Step 4: Add cleaning metadata ──
  cleaned.cleaned = originalValue !== cleaned.value;
  cleaned.cleanedAt = cleaned.cleaned ? Date.now() : undefined;
  cleaned.originalValue = cleaned.cleaned ? originalValue : undefined;
  cleaned.anomaly = isAnomaly;
  cleaned.anomalyReason = anomalyReason || null;

  return cleaned;
}
