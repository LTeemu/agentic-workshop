import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateReading, generateBatch } from '../sensor-sim.js';
import { validateReadingSafe } from '../pipeline/validate.js';
import config from '../config.js';

describe('sensor-sim generateReading', () => {
  it('returns an object with required fields', () => {
    const r = generateReading();
    assert.ok(r.id);
    assert.ok(r.timestamp);
    assert.ok(['temperature', 'humidity', 'pressure', 'vibration'].includes(r.type));
    assert.equal(typeof r.value, 'number');
    assert.ok(r.unit);
  });

  it('generates values within extended range', () => {
    for (let i = 0; i < 500; i++) {
      const r = generateReading();
      const t = config.sensor.types[r.type];
      const extendedMin = t.min - (t.max - t.min) * 0.3;
      const extendedMax = t.max + (t.max - t.min) * 0.5;
      assert.ok(
        r.value >= extendedMin && r.value <= extendedMax,
        `${r.type} value ${r.value} outside extended range [${extendedMin}, ${extendedMax}]`,
      );
    }
  });

  it('generates valid readings that pass schema validation', () => {
    for (let i = 0; i < 200; i++) {
      const r = generateReading();
      const result = validateReadingSafe(r);
      assert.ok(result.ok, `Generated reading failed validation: ${JSON.stringify(result.errors)}`);
    }
  });

  it('matches type to correct unit', () => {
    for (let i = 0; i < 100; i++) {
      const r = generateReading();
      const expectedUnit = config.sensor.types[r.type].unit;
      assert.equal(r.unit, expectedUnit, `${r.type} should have unit "${expectedUnit}"`);
    }
  });

  it('generates timestamps that are recent', () => {
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      const r = generateReading();
      assert.ok(r.timestamp <= now + 1000, 'Timestamp should not be in the future');
      assert.ok(r.timestamp > now - 10000, 'Timestamp should be recent');
    }
  });

  it('includes anomalies above max occasionally', () => {
    let anomalies = 0;
    for (let i = 0; i < 3000; i++) {
      const r = generateReading();
      const t = config.sensor.types[r.type];
      if (r.value > t.max) anomalies++;
    }
    // With pure random walk, threshold crossings happen naturally
    // after the walk accumulates enough drift. 3000 iterations gives
    // near-certain probability of at least one crossing.
    assert.ok(anomalies >= 1, `Expected at least 1 natural threshold crossing, got ${anomalies}`);
  });
});

describe('sensor-sim generateBatch', () => {
  it('generates the requested number of readings', () => {
    const batch = generateBatch(50);
    assert.equal(batch.length, 50);
  });

  it('all readings in batch pass validation', () => {
    const batch = generateBatch(100);
    for (const r of batch) {
      const result = validateReadingSafe(r);
      assert.ok(result.ok, `Batch reading failed: ${JSON.stringify(result.errors)}`);
    }
  });

  it('generates various sensor types across batch', () => {
    const batch = generateBatch(200);
    const types = new Set(batch.map((r) => r.type));
    assert.ok(types.size >= 3, 'Should generate at least 3 different sensor types in 200 readings');
  });
});
