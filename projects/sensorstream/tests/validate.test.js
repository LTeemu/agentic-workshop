import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateReading, validateReadingSafe } from '../pipeline/validate.js';

function validReading(overrides = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: Date.now(),
    type: 'temperature',
    value: 22.5,
    unit: 'celsius',
    ...overrides,
  };
}

describe('validateReading', () => {
  it('accepts a valid temperature reading', () => {
    const r = validReading();
    assert.doesNotThrow(() => validateReading(r));
  });

  it('accepts valid readings for all sensor types', () => {
    const fixtures = {
      temperature: { value: 22.5, unit: 'celsius' },
      humidity: { value: 55, unit: 'percent' },
      pressure: { value: 1013, unit: 'hpa' },
      vibration: { value: 2.5, unit: 'mm/s' },
    };
    for (const [type, overrides] of Object.entries(fixtures)) {
      const r = validReading({ type, ...overrides });
      assert.doesNotThrow(() => validateReading(r), `Should accept ${type}`);
    }
  });

  it('rejects missing id', () => {
    const r = validReading({ id: undefined });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects non-uuid id', () => {
    const r = validReading({ id: 'not-a-uuid' });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects missing timestamp', () => {
    const r = validReading({ timestamp: undefined });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects non-integer timestamp', () => {
    const r = validReading({ timestamp: 123.45 });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects negative timestamp', () => {
    const r = validReading({ timestamp: -100 });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects invalid type', () => {
    const r = validReading({ type: 'light' });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects non-numeric value', () => {
    const r = validReading({ value: 'hot' });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects NaN value', () => {
    const r = validReading({ value: NaN });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects Infinity value', () => {
    const r = validReading({ value: Infinity });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects mismatched unit', () => {
    const r = validReading({ unit: 'fahrenheit' });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects value far outside extended range', () => {
    const r = validReading({ value: 9999 });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });

  it('rejects extra unknown properties', () => {
    const r = validReading({ extraField: 'should not be here' });
    assert.throws(() => validateReading(r), { name: 'ZodError' });
  });
});

describe('validateReadingSafe', () => {
  it('returns ok:true for valid input', () => {
    const r = validReading();
    const result = validateReadingSafe(r);
    assert.equal(result.ok, true);
    assert.equal(result.data.value, 22.5);
  });

  it('returns ok:false with error details for invalid input', () => {
    const r = validReading({ value: undefined });
    const result = validateReadingSafe(r);
    assert.equal(result.ok, false);
    assert.ok(result.errors.length > 0);
    assert.ok(result.errors[0].path);
    assert.ok(result.errors[0].message);
  });
});
