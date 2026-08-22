/**
 * Device emulation view — preview frame sizing, presets, drag, persistence.
 * Depends on window.DeviceUtils, window.ResizeUtils.
 */
(function () {
  'use strict';
  const frameContainer = document.getElementById('preview-frame-container');
  const deviceFrame = document.getElementById('device-frame');
  const deviceHandles = document.getElementById('device-handles');
  const devicePresets = document.getElementById('device-presets');
  const deviceWidthInput = document.getElementById('device-width');
  const deviceHeightInput = document.getElementById('device-height');
  const deviceRotate = document.getElementById('device-rotate');
  const deviceSize = document.getElementById('device-size');
  const deviceScale = document.getElementById('device-scale');
  const previewFrame = document.getElementById('preview-frame');
  const DEVICE_STATE_KEY = 'workshop-device-state';
  const CUSTOM_PAD = 24;
  const {
    DEVICE_PRESETS,
    clampDimension,
    clampFill,
    defaultState,
    normalizeState,
    emulatedSize,
    presetBase,
    rotateState,
    paddedSize,
    ratioLabel,
  } = window.DeviceUtils;
  let deviceState = readDeviceState();
  function readDeviceState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(DEVICE_STATE_KEY)));
    } catch {
      return defaultState();
    }
  }
  function persistDeviceState() {
    localStorage.setItem(DEVICE_STATE_KEY, JSON.stringify(deviceState));
  }
  function clearPreviewInlineStyles() {
    previewFrame.style.width = '';
    previewFrame.style.height = '';
    previewFrame.style.transform = '';
  }
  function applyDeviceView() {
    const { mode } = deviceState;
    const emulated = mode !== 'fit';
    const presetMode = Boolean(DEVICE_PRESETS[mode]);
    frameContainer.classList.toggle('emulated', emulated);
    deviceHandles.classList.toggle('hidden', !emulated);
    deviceRotate.disabled = !emulated;
    for (const btn of devicePresets.querySelectorAll('.device-preset')) {
      btn.classList.toggle('active', btn.dataset.preset === mode);
      const preset = DEVICE_PRESETS[btn.dataset.preset];
      if (!preset) continue;
      const orient = btn.dataset.preset === mode ? deviceState.orientation : 'portrait';
      const dims = orient === 'landscape' ? { width: preset.height, height: preset.width } : preset;
      const label = btn.dataset.preset[0].toUpperCase() + btn.dataset.preset.slice(1);
      btn.title =
        label +
        ' \u2014 content at real device pixels (' +
        dims.width +
        '\u00d7' +
        dims.height +
        '); the % badge shows the current fit zoom.';
    }
    if (!emulated) {
      deviceFrame.style.width = '';
      deviceFrame.style.height = '';
      clearPreviewInlineStyles();
      deviceWidthInput.disabled = true;
      deviceHeightInput.disabled = true;
      deviceWidthInput.value = '';
      deviceHeightInput.value = '';
      deviceSize.title = 'Fit fills the preview pane \u2014 use Custom to change size.';
      deviceScale.classList.add('hidden');
      return;
    }
    if (presetMode) {
      const base = presetBase(deviceState);
      deviceWidthInput.value = base.width;
      deviceHeightInput.value = base.height;
      deviceWidthInput.disabled = true;
      deviceHeightInput.disabled = true;
      const label = mode[0].toUpperCase() + mode.slice(1);
      deviceSize.title =
        label +
        ' is locked to ' +
        ratioLabel(base.width, base.height) +
        ' aspect ratio \u2014 use Custom to change';
      const rect = frameContainer.getBoundingClientRect();
      const size = emulatedSize(deviceState, rect.width, rect.height);
      deviceFrame.style.width = size.width + 'px';
      deviceFrame.style.height = size.height + 'px';
      previewFrame.style.width = base.width + 'px';
      previewFrame.style.height = base.height + 'px';
      previewFrame.style.transform = 'scale(' + size.scale + ')';
      deviceScale.textContent = Math.round(size.scale * 100) + '%';
      deviceScale.classList.remove('hidden');
    } else {
      deviceWidthInput.value = deviceState.width;
      deviceHeightInput.value = deviceState.height;
      deviceWidthInput.disabled = false;
      deviceHeightInput.disabled = false;
      deviceSize.title = '';
      const rect = frameContainer.getBoundingClientRect();
      const size = emulatedSize(deviceState, rect.width, rect.height);
      deviceFrame.style.width = size.width + 'px';
      deviceFrame.style.height = size.height + 'px';
      previewFrame.style.width = deviceState.width + 'px';
      previewFrame.style.height = deviceState.height + 'px';
      previewFrame.style.transform = 'scale(' + size.scale + ')';
      deviceScale.textContent = Math.round(size.scale * 100) + '%';
      deviceScale.classList.remove('hidden');
    }
  }
  function setDeviceMode(mode) {
    if (mode === 'fit') deviceState.mode = 'fit';
    else if (mode === 'custom') {
      const rect = frameContainer.getBoundingClientRect();
      const padded = paddedSize(rect.width, rect.height, CUSTOM_PAD);
      if (padded) {
        deviceState.width = padded.width;
        deviceState.height = padded.height;
      }
      deviceState.mode = 'custom';
    } else {
      const base = DEVICE_PRESETS[mode];
      deviceState = {
        mode,
        orientation: 'portrait',
        fill: 1,
        width: base.width,
        height: base.height,
      };
    }
    applyDeviceView();
    persistDeviceState();
  }
  devicePresets.addEventListener('click', (e) => {
    const btn = e.target.closest('.device-preset');
    if (btn && btn.dataset.preset) setDeviceMode(btn.dataset.preset);
  });
  deviceRotate.addEventListener('click', () => {
    if (deviceState.mode === 'fit') return;
    deviceState = rotateState(deviceState);
    applyDeviceView();
    persistDeviceState();
  });
  function commitDeviceInput() {
    if (deviceState.mode !== 'custom') return;
    const w = Number(deviceWidthInput.value),
      h = Number(deviceHeightInput.value);
    deviceState.width = clampDimension(w);
    deviceState.height = clampDimension(h);
    applyDeviceView();
    persistDeviceState();
  }
  deviceWidthInput.addEventListener('change', commitDeviceInput);
  deviceHeightInput.addEventListener('change', commitDeviceInput);
  let deviceDrag = null;
  function startDeviceDrag(e) {
    const edge = e.target.dataset.edge;
    const cursor = edge === 'e' ? 'ew-resize' : edge === 's' ? 'ns-resize' : 'nwse-resize';
    deviceDrag = { edge, startX: e.clientX, startY: e.clientY, ...deviceState };
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none';
  }
  function moveDeviceDrag(e) {
    const drag = deviceDrag;
    if (!drag) return;
    const dx = e.clientX - drag.startX,
      dy = e.clientY - drag.startY;
    if (drag.mode === 'custom') {
      const rect = frameContainer.getBoundingClientRect();
      const fitted = emulatedSize(drag, rect.width, rect.height);
      const inv = fitted.scale || 1;
      if (drag.edge !== 's') deviceState.width = clampDimension(drag.width + dx / inv);
      if (drag.edge !== 'e') deviceState.height = clampDimension(drag.height + dy / inv);
    } else {
      const rect = frameContainer.getBoundingClientRect();
      const fitted = emulatedSize({ ...drag, fill: 1 }, rect.width, rect.height);
      const axis = drag.orientation === 'landscape' ? fitted.width : fitted.height;
      const delta = drag.orientation === 'landscape' ? dx : dy;
      deviceState.fill = clampFill(drag.fill + delta / (axis || 1));
    }
    applyDeviceView();
  }
  function endDeviceDrag() {
    deviceDrag = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    persistDeviceState();
  }
  document.addEventListener('pointermove', moveDeviceDrag);
  document.addEventListener('pointerup', endDeviceDrag);
  document.addEventListener('pointercancel', endDeviceDrag);
  deviceHandles.addEventListener('pointerdown', startDeviceDrag);
  window.ResizeUtils.watchResize(frameContainer, applyDeviceView, 100);
  applyDeviceView();
  window.DeviceView = {
    applyDeviceView,
    setDeviceMode,
    get state() {
      return deviceState;
    },
  };
})();
