/**
 * Device-emulation helpers shared between the dashboard UI and its unit tests.
 * UMD-style so the browser gets `window.DeviceUtils` while node:test can
 * `require()` the same file without a DOM.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DeviceUtils = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DEVICE_PRESETS = {
    // Match Chrome DevTools' device list: iPhone SE (smallest phone) and
    // iPad mini (smallest tablet).
    phone: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
  };

  const MIN_DEVICE_SIZE = 200;
  const MAX_DEVICE_SIZE = 4096;
  const MIN_FILL = 0.5; // presets zoom between fully fitted and half of the fit

  /** Clamp a dimension to the allowed device-size range. */
  function clampDimension(value) {
    if (!Number.isFinite(value)) return MIN_DEVICE_SIZE;
    return Math.min(MAX_DEVICE_SIZE, Math.max(MIN_DEVICE_SIZE, value));
  }

  /** Clamp a preset fill factor to [MIN_FILL, 1]. */
  function clampFill(value) {
    if (!Number.isFinite(value)) return 1;
    return Math.min(1, Math.max(MIN_FILL, value));
  }

  /** Valid starting state: fit mode with preset fallback dimensions. */
  function defaultState() {
    return {
      mode: 'fit',
      width: DEVICE_PRESETS.phone.width,
      height: DEVICE_PRESETS.phone.height,
      orientation: 'portrait',
      fill: 1,
    };
  }

  /**
   * Coerce a raw persisted value (or null) into a valid state. Unknown modes
   * fall back to 'fit'; missing or non-numeric fields fall back to the
   * defaults so a partial save still behaves sensibly.
   */
  function normalizeState(raw) {
    const candidate = raw && typeof raw === 'object' ? raw : {};
    const fallback = defaultState();
    const isKnownMode =
      candidate.mode === 'fit' ||
      candidate.mode === 'custom' ||
      Object.prototype.hasOwnProperty.call(DEVICE_PRESETS, candidate.mode);
    return {
      mode: isKnownMode ? candidate.mode : 'fit',
      width: Number.isFinite(candidate.width) ? clampDimension(candidate.width) : fallback.width,
      height: Number.isFinite(candidate.height)
        ? clampDimension(candidate.height)
        : fallback.height,
      orientation: candidate.orientation === 'landscape' ? 'landscape' : 'portrait',
      fill: clampFill(candidate.fill),
    };
  }

  /** Base (unscaled) device dimensions for a preset state, honoring orientation. */
  function presetBase(state) {
    const base = DEVICE_PRESETS[state.mode];
    return state.orientation === 'landscape'
      ? { width: base.height, height: base.width }
      : { width: base.width, height: base.height };
  }

  /**
   * Resolve the emulated frame layout for a state against a container.
   * - fit: null (frame fills the pane via CSS).
   * - custom: the stored pixel size at true scale while it fits; zoomed down
   *   to contain the pane only when it would overflow (the emulator never
   *   scrolls — custom's px are a design size).
   * - presets: render content at the real device CSS-pixel size, then zoom it
   *   by `scale` so the device fits inside the container (contain), further
   *   reduced by the fill factor. The returned width/height is the on-screen
   *   size of the frame; callers apply `scale` to the device-sized content.
   * A hidden/degenerate container reports the base size at scale 1.
   * Return shapes: null for fit; { width, height, scale } for custom and
   * presets (scale is the zoom applied to the design pixels).
   */
  function emulatedSize(state, containerWidth, containerHeight) {
    if (state.mode === 'fit') return null;
    const degenerate =
      !Number.isFinite(containerWidth) ||
      !Number.isFinite(containerHeight) ||
      containerWidth <= 0 ||
      containerHeight <= 0;
    if (state.mode === 'custom') {
      if (degenerate) return { width: state.width, height: state.height, scale: 1 };
      const scale = Math.min(1, containerWidth / state.width, containerHeight / state.height);
      return { width: state.width * scale, height: state.height * scale, scale };
    }
    const base = presetBase(state);
    if (degenerate) return { width: base.width, height: base.height, scale: 1 };
    const fill = clampFill(state.fill);
    const scale = Math.min(containerWidth / base.width, containerHeight / base.height) * fill;
    return { width: base.width * scale, height: base.height * scale, scale };
  }

  /**
   * Rotate the emulated device. Presets flip orientation (portrait ↔
   * landscape) and keep their locked ratio; custom swaps the pixel size and
   * clamps so a bogus value can't escape the range.
   */
  function rotateState(state) {
    if (state.mode === 'custom') {
      return {
        ...state,
        width: clampDimension(state.height),
        height: clampDimension(state.width),
      };
    }
    return {
      ...state,
      orientation: state.orientation === 'landscape' ? 'portrait' : 'landscape',
    };
  }

  /**
   * Human aspect-ratio label: "1:2.16" for portrait-phone, "2.16:1" for
   * landscape. Reduces to the larger axis first so the ratio reads naturally.
   */
  function ratioLabel(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return '—';
    }
    const rounded = (value) => Math.round(value * 100) / 100;
    return width >= height ? `${rounded(width / height)}:1` : `1:${rounded(height / width)}`;
  }

  /**
   * A custom size that almost fills the container, leaving `pad` pixels of
   * slack so the resize handles stay easy to grab. Returns null for a
   * hidden/degenerate container so the caller keeps the previous size.
   */
  function paddedSize(containerWidth, containerHeight, pad) {
    if (
      !Number.isFinite(containerWidth) ||
      !Number.isFinite(containerHeight) ||
      containerWidth <= 0 ||
      containerHeight <= 0
    ) {
      return null;
    }
    return {
      width: clampDimension(containerWidth - pad),
      height: clampDimension(containerHeight - pad),
    };
  }

  return {
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
  };
});
