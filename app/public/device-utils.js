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
    phone: { width: 390, height: 844 },
    tablet: { width: 820, height: 1180 },
  };

  const MIN_DEVICE_SIZE = 200;
  const MAX_DEVICE_SIZE = 4096;
  const MIN_FILL = 0.5; // presets stay between 100% and half of the fill axis

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
   * Resolve the emulated frame size for a state against a container.
   * - fit: null (frame fills the pane via CSS).
   * - custom: the stored pixel size, unchanged by the container.
   * - presets: lock the device aspect ratio. Portrait fills the container
   *   height, landscape fills the width, scaled by the fill factor.
   * A hidden/degenerate container reports the unscaled base size.
   */
  function emulatedSize(state, containerWidth, containerHeight) {
    if (state.mode === 'fit') return null;
    if (state.mode === 'custom') return { width: state.width, height: state.height };
    const base = presetBase(state);
    if (
      !Number.isFinite(containerWidth) ||
      !Number.isFinite(containerHeight) ||
      containerWidth <= 0 ||
      containerHeight <= 0
    ) {
      return { width: base.width, height: base.height };
    }
    const fill = clampFill(state.fill);
    const aspect = base.width / base.height;
    if (state.orientation === 'landscape') {
      const width = containerWidth * fill;
      return { width, height: width / aspect };
    }
    const height = containerHeight * fill;
    return { width: height * aspect, height };
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
