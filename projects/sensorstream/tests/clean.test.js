import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanReading } from '../pipeline/clean.js';
import { setLastValue } from '../pipeline/thresholds.js';

describe('cleanReading', () => {
  it('returns reading unchanged for normal values', () => {
    const reading = {
      id: 'test-id',
      timestamp: Date.now(),
      type: 'temperature',
      value: 22.5,
      unit: 'celsius',
    };
    const cleaned = cleanReading(reading);
    assert.equal(cleaned.value, 22.5);
    assert.equal(cleaned.cleaned, false);
    assert.equal(cleaned.anomaly, false);
  });

  it('flags value above max threshold', () => {
    const reading = {
      id: 'test-id',
      timestamp: Date.now(),
      type: 'temperature',
      value: 55,
      unit: 'celsius',
    };
    const cleaned = cleanReading(reading);
    assert.equal(cleaned.anomaly, true);
    assert.equal(cleaned.cleaned, true);
    assert.equal(cleaned.value, 45); // Clamped to max
    assert.equal(cleaned.originalValue, 55);
  });

  it('clips value below minimum threshold', () => {
    const reading = {
      id: 'test-id',
      timestamp: Date.now(),
      type: 'temperature',
      value: -50,
      unit: 'celsius',
    };
    const cleaned = cleanReading(reading);
    assert.equal(cleaned.anomaly, true);
    assert.equal(cleaned.cleaned, true);
    assert.equal(cleaned.value, -5); // Clamped to min
  });

  it('clips value above maximum threshold', () => {
    const reading = {
      id: 'test-id',
      timestamp: Date.now(),
      type: 'humidity',
      value: 200,
      unit: 'percent',
    };
    const cleaned = cleanReading(reading);
    assert.equal(cleaned.anomaly, true);
    assert.equal(cleaned.cleaned, true);
    assert.equal(cleaned.value, 95); // Clamped to max
  });

  it('corrects negative vibration to absolute value', () => {
    const reading = {
      id: 'test-id',
      timestamp: Date.now(),
      type: 'vibration',
      value: -5,
      unit: 'mm/s',
    };
    const cleaned = cleanReading(reading);
    assert.equal(cleaned.anomaly, true);
    assert.ok(
      cleaned.anomalyReason.includes('negative vibration'),
      `Reason should mention negative vibration, got: ${cleaned.anomalyReason}`,
    );
    assert.ok(cleaned.value > 0, `Value should be positive, got: ${cleaned.value}`);
    assert.equal(cleaned.originalValue, -5);
  });

  it('detects large temperature jump', () => {
    // Set the last temperature so jump > 15°C triggers
    setLastValue('temperature', 22);
    const reading = {
      id: 'test-id',
      timestamp: Date.now(),
      type: 'temperature',
      value: 50,
      unit: 'celsius',
    };
    const cleaned = cleanReading(reading);
    assert.equal(cleaned.anomaly, true);
    assert.ok(
      cleaned.anomalyReason.includes('jump'),
      `Reason should mention jump, got: ${cleaned.anomalyReason}`,
    );
  });

  it('preserves original value in metadata when changed', () => {
    const reading = {
      id: 'test-id',
      timestamp: Date.now(),
      type: 'temperature',
      value: 55,
      unit: 'celsius',
    };
    const cleaned = cleanReading(reading);
    assert.equal(cleaned.originalValue, 55);
    assert.ok(cleaned.cleanedAt);
  });

  it('does not flag normal humidity', () => {
    const reading = {
      id: 'test-id',
      timestamp: Date.now(),
      type: 'humidity',
      value: 50,
      unit: 'percent',
    };
    const cleaned = cleanReading(reading);
    assert.equal(cleaned.anomaly, false);
    assert.equal(cleaned.cleaned, false);
  });

  it('handles normal pressure reading', () => {
    const reading = {
      id: 'test-id',
      timestamp: Date.now(),
      type: 'pressure',
      value: 1013,
      unit: 'hpa',
    };
    const cleaned = cleanReading(reading);
    assert.equal(cleaned.anomaly, false);
    assert.equal(cleaned.value, 1013);
  });
});
