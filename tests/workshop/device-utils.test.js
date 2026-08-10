const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  DEVICE_PRESETS,
  MIN_DEVICE_SIZE,
  MAX_DEVICE_SIZE,
  MIN_FILL,
  clampDimension,
  clampFill,
  defaultState,
  normalizeState,
  presetBase,
  emulatedSize,
  rotateState,
  paddedSize,
  ratioLabel,
} = require('../../app/public/device-utils');

describe('clampDimension', () => {
  it('passes in-range values through', () => {
    assert.strictEqual(clampDimension(500), 500);
    assert.strictEqual(clampDimension(MIN_DEVICE_SIZE), MIN_DEVICE_SIZE);
    assert.strictEqual(clampDimension(MAX_DEVICE_SIZE), MAX_DEVICE_SIZE);
  });

  it('clamps to the device range', () => {
    assert.strictEqual(clampDimension(50), MIN_DEVICE_SIZE);
    assert.strictEqual(clampDimension(99999), MAX_DEVICE_SIZE);
  });

  it('falls back to the minimum for non-numeric input', () => {
    assert.strictEqual(clampDimension(NaN), MIN_DEVICE_SIZE);
    assert.strictEqual(clampDimension('abc'), MIN_DEVICE_SIZE);
    assert.strictEqual(clampDimension(undefined), MIN_DEVICE_SIZE);
  });
});

describe('clampFill', () => {
  it('passes in-range factors through', () => {
    assert.strictEqual(clampFill(0.75), 0.75);
    assert.strictEqual(clampFill(1), 1);
  });

  it('clamps to the fill range', () => {
    assert.strictEqual(clampFill(0.2), MIN_FILL);
    assert.strictEqual(clampFill(2), 1);
  });

  it('falls back to full size for non-numeric input', () => {
    assert.strictEqual(clampFill(NaN), 1);
    assert.strictEqual(clampFill(undefined), 1);
  });
});

describe('defaultState', () => {
  it('starts in fit mode with preset fallback dimensions', () => {
    assert.deepStrictEqual(defaultState(), {
      mode: 'fit',
      width: DEVICE_PRESETS.phone.width,
      height: DEVICE_PRESETS.phone.height,
      orientation: 'portrait',
      fill: 1,
    });
  });
});

describe('normalizeState', () => {
  it('defaults to fit when nothing is persisted', () => {
    assert.deepStrictEqual(normalizeState(null), defaultState());
  });

  it('rejects an unknown mode but preserves valid dimensions', () => {
    const state = normalizeState({ mode: 'nope', width: 780, height: 500 });
    assert.strictEqual(state.mode, 'fit');
    assert.strictEqual(state.width, 780);
    assert.strictEqual(state.height, 500);
  });

  it('rejects non-object input', () => {
    assert.strictEqual(normalizeState('junk').mode, 'fit');
    assert.strictEqual(normalizeState(42).mode, 'fit');
  });

  it('keeps custom mode, orientation, and fill', () => {
    assert.deepStrictEqual(
      normalizeState({
        mode: 'custom',
        width: 640,
        height: 480,
        orientation: 'landscape',
        fill: 0.6,
      }),
      { mode: 'custom', width: 640, height: 480, orientation: 'landscape', fill: 0.6 },
    );
  });

  it('falls back to portrait and full fill for bad values', () => {
    const state = normalizeState({ mode: 'phone', orientation: 'sideways', fill: 9 });
    assert.strictEqual(state.orientation, 'portrait');
    assert.strictEqual(state.fill, 1);
  });

  it('clamps preset dimensions', () => {
    const state = normalizeState({ mode: 'tablet', width: 10, height: 99999 });
    assert.strictEqual(state.width, MIN_DEVICE_SIZE);
    assert.strictEqual(state.height, MAX_DEVICE_SIZE);
  });
});

describe('presetBase', () => {
  it('returns portrait dimensions by default', () => {
    assert.deepStrictEqual(presetBase({ mode: 'phone', orientation: 'portrait' }), {
      width: 390,
      height: 844,
    });
  });

  it('swaps dimensions in landscape', () => {
    assert.deepStrictEqual(presetBase({ mode: 'phone', orientation: 'landscape' }), {
      width: 844,
      height: 390,
    });
  });
});

describe('emulatedSize', () => {
  it('returns null for fit', () => {
    assert.strictEqual(emulatedSize({ mode: 'fit' }, 800, 600), null);
  });

  it('returns stored pixel size for custom', () => {
    assert.deepStrictEqual(emulatedSize({ mode: 'custom', width: 640, height: 480 }, 800, 600), {
      width: 640,
      height: 480,
    });
  });

  it('fills container height for portrait presets', () => {
    const size = emulatedSize({ mode: 'phone', orientation: 'portrait', fill: 1 }, 800, 600);
    assert.strictEqual(size.height, 600);
    assert.ok(Math.abs(size.width - (600 * 390) / 844) < 1e-9);
  });

  it('fills container width for landscape presets', () => {
    const size = emulatedSize({ mode: 'tablet', orientation: 'landscape', fill: 1 }, 800, 600);
    assert.strictEqual(size.width, 800);
    assert.ok(Math.abs(size.height - (800 * 820) / 1180) < 1e-9);
  });

  it('scales the fill axis by the fill factor', () => {
    const size = emulatedSize({ mode: 'phone', orientation: 'portrait', fill: 0.5 }, 800, 600);
    assert.strictEqual(size.height, 300);
  });

  it('reports the base size for a degenerate container', () => {
    const size = emulatedSize({ mode: 'phone', orientation: 'portrait', fill: 1 }, 0, -5);
    assert.deepStrictEqual(size, { width: 390, height: 844 });
  });
});

describe('ratioLabel', () => {
  it('reduces portrait ratios to 1:x', () => {
    assert.strictEqual(ratioLabel(390, 844), '1:2.16');
    assert.strictEqual(ratioLabel(820, 1180), '1:1.44');
  });

  it('reduces landscape ratios to x:1', () => {
    assert.strictEqual(ratioLabel(844, 390), '2.16:1');
    assert.strictEqual(ratioLabel(1180, 820), '1.44:1');
  });

  it('handles square and degenerate input', () => {
    assert.strictEqual(ratioLabel(600, 600), '1:1');
    assert.strictEqual(ratioLabel(0, 600), '—');
    assert.strictEqual(ratioLabel(NaN, 600), '—');
  });
});

describe('paddedSize', () => {
  it('almost fills the container, minus the padding', () => {
    assert.deepStrictEqual(paddedSize(1000, 600, 24), { width: 976, height: 576 });
  });

  it('clamps into the device range', () => {
    assert.deepStrictEqual(paddedSize(50, 50, 24), {
      width: MIN_DEVICE_SIZE,
      height: MIN_DEVICE_SIZE,
    });
  });

  it('returns null for a hidden or degenerate container', () => {
    assert.strictEqual(paddedSize(0, 0, 24), null);
    assert.strictEqual(paddedSize(NaN, 100, 24), null);
    assert.strictEqual(paddedSize(-5, 100, 24), null);
  });
});

describe('rotateState', () => {
  it('flips orientation for presets without touching the ratio', () => {
    const portrait = { mode: 'phone', orientation: 'portrait', fill: 1 };
    assert.strictEqual(rotateState(portrait).orientation, 'landscape');
    assert.strictEqual(rotateState(rotateState(portrait)).orientation, 'portrait');
  });

  it('swaps clamped pixel size for custom', () => {
    assert.deepStrictEqual(rotateState({ mode: 'custom', width: 390, height: 844 }), {
      mode: 'custom',
      width: 844,
      height: 390,
    });
    const clamped = rotateState({ mode: 'custom', width: 10, height: 500 });
    assert.strictEqual(clamped.width, 500);
    assert.strictEqual(clamped.height, MIN_DEVICE_SIZE);
  });
});
