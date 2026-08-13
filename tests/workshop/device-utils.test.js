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

const phone = DEVICE_PRESETS.phone;
const tablet = DEVICE_PRESETS.tablet;

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
      width: phone.width,
      height: phone.height,
    });
  });

  it('swaps dimensions in landscape', () => {
    assert.deepStrictEqual(presetBase({ mode: 'phone', orientation: 'landscape' }), {
      width: phone.height,
      height: phone.width,
    });
  });
});

describe('emulatedSize', () => {
  it('returns null for fit', () => {
    assert.strictEqual(emulatedSize({ mode: 'fit' }, 800, 600), null);
  });

  it('keeps custom at true size while it fits', () => {
    assert.deepStrictEqual(emulatedSize({ mode: 'custom', width: 640, height: 480 }, 800, 600), {
      width: 640,
      height: 480,
      scale: 1,
    });
  });

  it('zooms custom down to contain the pane when it exceeds it', () => {
    assert.deepStrictEqual(emulatedSize({ mode: 'custom', width: 640, height: 480 }, 320, 240), {
      width: 320,
      height: 240,
      scale: 0.5,
    });
    // Width-limited contain: height follows the ratio.
    const narrow = emulatedSize({ mode: 'custom', width: 640, height: 480 }, 320, 400);
    assert.ok(Math.abs(narrow.scale - 0.5) < 1e-9);
    assert.ok(Math.abs(narrow.width - 320) < 1e-9);
    assert.ok(Math.abs(narrow.height - 240) < 1e-9);
  });

  it('reports custom at scale 1 for a degenerate container', () => {
    assert.deepStrictEqual(emulatedSize({ mode: 'custom', width: 640, height: 480 }, 0, 0), {
      width: 640,
      height: 480,
      scale: 1,
    });
  });

  it('contains custom by height when the pane is short', () => {
    const size = emulatedSize({ mode: 'custom', width: 640, height: 480 }, 800, 200);
    assert.ok(Math.abs(size.scale - 200 / 480) < 1e-9);
    assert.ok(Math.abs(size.height - 200) < 1e-9);
    assert.ok(Math.abs(size.width - (200 * 640) / 480) < 1e-9);
  });

  it('zooms portrait presets to fill container height', () => {
    const size = emulatedSize({ mode: 'phone', orientation: 'portrait', fill: 1 }, 800, 600);
    assert.ok(Math.abs(size.height - 600) < 1e-9);
    assert.ok(Math.abs(size.width - (600 * phone.width) / phone.height) < 1e-9);
    assert.ok(Math.abs(size.scale - 600 / phone.height) < 1e-9);
  });

  it('zooms landscape presets to fill container width', () => {
    // Landscape swaps the base to {width: tablet.height, height: tablet.width}.
    const size = emulatedSize({ mode: 'tablet', orientation: 'landscape', fill: 1 }, 800, 600);
    assert.ok(Math.abs(size.width - 800) < 1e-9);
    assert.ok(Math.abs(size.height - (800 * tablet.width) / tablet.height) < 1e-9);
    assert.ok(Math.abs(size.scale - 800 / tablet.height) < 1e-9);
  });

  it('scales the zoom by the fill factor', () => {
    const size = emulatedSize({ mode: 'phone', orientation: 'portrait', fill: 0.5 }, 800, 600);
    assert.ok(Math.abs(size.height - 300) < 1e-9);
    assert.ok(Math.abs(size.scale - (0.5 * 600) / phone.height) < 1e-9);
  });

  it('contains the device when the pane is narrower than its ratio', () => {
    // The old fit-by-axis code overflowed here (height 800, width ~450);
    // contain keeps the whole device visible.
    const size = emulatedSize({ mode: 'phone', orientation: 'portrait', fill: 1 }, 300, 800);
    assert.ok(Math.abs(size.width - 300) < 1e-9);
    assert.ok(Math.abs(size.height - (300 * phone.height) / phone.width) < 1e-9);
    assert.ok(size.width <= 300 && size.height <= 800);
  });

  it('contains landscape presets in a short pane', () => {
    // Symmetric case: the old code filled the width (1200) and overflowed
    // the 500px-tall pane; contain fits the height instead.
    const size = emulatedSize({ mode: 'tablet', orientation: 'landscape', fill: 1 }, 1200, 500);
    assert.ok(Math.abs(size.height - 500) < 1e-9);
    assert.ok(Math.abs(size.width - (500 * tablet.height) / tablet.width) < 1e-9);
    assert.ok(size.width <= 1200 && size.height <= 500);
  });

  it('reports the base size at scale 1 for a degenerate container', () => {
    const size = emulatedSize({ mode: 'phone', orientation: 'portrait', fill: 1 }, 0, -5);
    assert.deepStrictEqual(size, { width: phone.width, height: phone.height, scale: 1 });
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
