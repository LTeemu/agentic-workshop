import { parseSSEChunk } from './shared/sse-parser.js';
import { backoffDelay } from './shared/reconnect.js';

// ── State ──

const state = {
  readings: [],
  anomalies: [],
  history: {}, // type -> array of recent values (for sparklines)
  readingCount: 0,
  anomalyCount: 0,
  connected: false,
  reconnectAttempt: 0,
  lastEventId: null,
  timeWindow: 1800, // seconds of data to keep (default 30m)
  lastLatencyMs: null,
  pingStart: null,
  thresholds: {}, // { type: { min, max }, maxTempJump }
};

const MAX_ALERTS = 10;
const ALERT_EPISODE_TIMEOUT_MS = 30_000;
const MAX_READINGS = 20_000; // supports ~2h of data at 600ms intervals

const SENSOR_COLORS = {
  temperature: '#ff3355',
  humidity: '#00e5ff',
  pressure: '#33ff77',
  vibration: '#ffaa33',
};

const SENSOR_LABELS = {
  temperature: 'Temperature (°C)',
  humidity: 'Humidity (%)',
  pressure: 'Pressure (hPa)',
  vibration: 'Vibration (mm/s)',
};

// Fixed Y-axis ranges per sensor — prevents anomaly spikes from zooming the chart
const SENSOR_RANGES = {
  temperature: { min: -5, max: 45 },
  humidity: { min: 10, max: 95 },
  pressure: { min: 970, max: 1050 },
  vibration: { min: 0, max: 30 },
};

const SPARKLINE_POINTS = 20;
const HISTORY_MAX = 200;

// ── DOM References ──

const $ = (sel) => document.querySelector(sel);
const readingsBody = $('#readingsBody');
const alertsContainer = $('#alertsContainer');
const statsContainer = $('#statsContainer');
const connectionDot = $('#connectionDot');
const connectionLabel = $('#connectionLabel');
const readingCounter = $('#readingCounter');
const anomalyCounter = $('#anomalyCounter');
const uptimeEl = $('#uptime');
const latencyIndicator = $('#latencyIndicator');
const screenFlash = $('#screenFlash');
const episodeBar = $('#episodeBar');
const sensorDetailPanel = $('#sensorDetailPanel');
const detailGrid = $('#detailGrid');

// ── Small Multiples ──

const SENSOR_TYPES = Object.keys(SENSOR_COLORS);

function getVisibleReadings() {
  const cutoff = Date.now() - state.timeWindow * 1000;
  return state.readings.filter((r) => r.timestamp >= cutoff);
}

function initChartPanels() {
  const container = document.getElementById('chartPanels');
  container.innerHTML = '';
  for (const type of SENSOR_TYPES) {
    const panel = document.createElement('div');
    panel.className = 'chart-panel';
    panel.id = `panel-${type}`;
    panel.innerHTML = `
      <div class="chart-panel-header">
        <span class="chart-panel-dot" style="background:${SENSOR_COLORS[type]}"></span>
        <span class="chart-panel-name">${type}</span>
        <span class="chart-panel-value">--</span>
        <span class="chart-panel-unit"></span>
      </div>
      <canvas width="800" height="120"></canvas>
      <div class="panel-tooltip"></div>
    `;
    container.appendChild(panel);
    setupPanelTooltip(panel);
  }
}

function resizeAllCanvases() {
  for (const type of SENSOR_TYPES) {
    const panel = document.getElementById(`panel-${type}`);
    if (!panel) continue;
    const canvas = panel.querySelector('canvas');
    const rect = panel.getBoundingClientRect();
    canvas.width = Math.max(200, Math.round(rect.width - 2));
  }
}

function drawSmallMultiples() {
  const visible = getVisibleReadings();

  for (const type of SENSOR_TYPES) {
    const panel = document.getElementById(`panel-${type}`);
    if (!panel) continue;

    const canvas = panel.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const tooltip = panel.querySelector('.panel-tooltip');
    const valueEl = panel.querySelector('.chart-panel-value');
    const unitEl = panel.querySelector('.chart-panel-unit');

    const readings = visible.filter((r) => r.type === type);
    const last = readings[readings.length - 1];

    // Update header
    if (last) {
      valueEl.textContent = last.value;
      unitEl.textContent = last.unit;
      valueEl.style.color = last.anomaly ? 'var(--danger)' : '';
    }

    const w = canvas.width;
    const h = canvas.height;
    const padding = { top: 6, right: 6, bottom: 18, left: 38 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    if (readings.length < 2) {
      ctx.fillStyle = '#6e8b8f';
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting...', w / 2, h / 2 + 4);
      continue;
    }

    // Data-driven Y range using interior values (excludes clamped boundary hits).
    // This keeps the chart zoomed to normal drift while ignoring threshold-clamped
    // values that would otherwise compress the visible waves.
    const fullRange = SENSOR_RANGES[type] || { min: -Infinity, max: Infinity };
    const interior = readings.filter((r) => r.value > fullRange.min && r.value < fullRange.max);
    let yMin, yMax;
    if (interior.length >= 2) {
      const dMin = Math.min(...interior.map((r) => r.value));
      const dMax = Math.max(...interior.map((r) => r.value));
      const pad = (dMax - dMin) * 0.15 || 1;
      yMin = Math.max(fullRange.min, dMin - pad);
      yMax = Math.min(fullRange.max, dMax + pad);
    } else {
      // All values at boundary — fall back to full sensor range
      yMin = fullRange.min;
      yMax = fullRange.max;
    }

    const color = SENSOR_COLORS[type] || '#fff';
    const xScale = plotW / Math.max(readings.length - 1, 1);

    // Grid + Y-axis labels
    ctx.fillStyle = '#6e8b8f';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    const gridLines = 3;
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (plotH / gridLines) * i;
      ctx.strokeStyle = '#1e2a2d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding.left, Math.round(y) + 0.5);
      ctx.lineTo(w - padding.right, Math.round(y) + 0.5);
      ctx.stroke();
      const val = yMax - ((yMax - yMin) / gridLines) * i;
      ctx.fillText(val.toFixed(1), padding.left - 4, y + 3);
    }

    // Threshold indicator lines
    const drawThresholdLine = (thresholdVal, color, label) => {
      if (thresholdVal < yMin || thresholdVal > yMax) return;
      const y =
        Math.round(padding.top + plotH - ((thresholdVal - yMin) / (yMax - yMin)) * plotH) + 0.5;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();
      ctx.restore();
      // Label at the right edge
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(label + ' ' + thresholdVal, w - padding.right - 2, y - 2);
      ctx.restore();
    };
    drawThresholdLine(fullRange.max, 'rgba(255,50,50,0.45)', 'max');
    drawThresholdLine(fullRange.min, 'rgba(50,180,255,0.35)', 'min');

    // Glow line
    ctx.save();
    ctx.strokeStyle = color + '60';
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    for (let i = 0; i < readings.length; i++) {
      const x = Math.round(padding.left + i * xScale);
      const y = padding.top + plotH - ((readings[i].value - yMin) / (yMax - yMin)) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // Main line
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < readings.length; i++) {
      const x = Math.round(padding.left + i * xScale);
      const y = padding.top + plotH - ((readings[i].value - yMin) / (yMax - yMin)) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Anomaly markers
    for (let i = 0; i < readings.length; i++) {
      if (!readings[i].anomaly) continue;
      const x = Math.round(padding.left + i * xScale);
      const y = padding.top + plotH - ((readings[i].value - yMin) / (yMax - yMin)) * plotH;

      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 51, 85, 0.2)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3355';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 51, 85, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // X-axis time labels
    if (readings.length > 1) {
      ctx.fillStyle = '#6e8b8f';
      ctx.font = '8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(formatTime(readings[0].timestamp), padding.left, h - 3);
      ctx.fillText(formatTime(readings[readings.length - 1].timestamp), w - padding.right, h - 3);
    }
  }
}

// ── Per-Panel Tooltips ──

function setupPanelTooltip(panel) {
  const canvas = panel.querySelector('canvas');
  const tooltip = panel.querySelector('.panel-tooltip');
  const type = panel.id.replace('panel-', '');

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const padding = { top: 6, left: 38, right: 6, bottom: 18 };
    const plotW = canvas.width - padding.left - padding.right;

    const visible = getVisibleReadings().filter((r) => r.type === type);
    if (visible.length < 2) {
      tooltip.classList.remove('visible');
      return;
    }

    const xScale = plotW / Math.max(visible.length - 1, 1);
    const idx = Math.round((mx - padding.left) / xScale);
    if (idx < 0 || idx >= visible.length) {
      tooltip.classList.remove('visible');
      return;
    }

    const reading = visible[idx];

    const tipX = mx + 10;
    const tipY = my - 8;
    tooltip.style.left = Math.min(tipX, canvas.width - 160) + 'px';
    tooltip.style.top = Math.max(tipY, 0) + 'px';

    const anomalyLabel = reading.anomaly ? ' <span class="tt-anomaly">⚠</span>' : '';
    tooltip.innerHTML = `
      <div class="tt-label">${formatTime(reading.timestamp)}</div>
      <div class="tt-value" style="color:${SENSOR_COLORS[type]}">${reading.value} ${reading.unit}${anomalyLabel}</div>
      ${reading.anomalyReason ? `<div style="color:#6e8b8f;font-size:0.6rem">${reading.anomalyReason}</div>` : ''}
    `;
    tooltip.classList.add('visible');
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.classList.remove('visible');
  });
}

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

// ── Time Range Selector ──

function setupTimeRange() {
  const group = $('#timeRangeGroup');
  if (!group) return;
  group.addEventListener('click', (e) => {
    const btn = e.target.closest('.time-btn');
    if (!btn) return;
    group.querySelectorAll('.time-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    state.timeWindow = parseInt(btn.dataset.window, 10);
    const indicator = $('#windowIndicator');
    if (indicator) {
      const mins = state.timeWindow / 60;
      indicator.textContent = mins >= 60 ? `Showing last ${mins / 60}h` : `Showing last ${mins}m`;
    }
    drawSmallMultiples();
  });
}

// ── SSE Consumer ──

async function connectSSE() {
  const url = new URL('/api/sensors/stream', window.location.origin);
  if (state.lastEventId) {
    url.searchParams.set('lastEventId', state.lastEventId);
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    setConnected(true);
    state.reconnectAttempt = 0;
    clearAlerts();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lastDoubleNewline = buffer.lastIndexOf('\n\n');
      if (lastDoubleNewline === -1) continue;

      const complete = buffer.slice(0, lastDoubleNewline + 2);
      buffer = buffer.slice(lastDoubleNewline + 2);

      const events = parseSSEChunk(complete);
      for (const evt of events) {
        handleSSEEvent(evt);
      }
    }
  } catch (err) {
    console.error('SSE connection error:', err.message);
    setConnected(false);
    scheduleReconnect();
    return;
  }

  setConnected(false);
  scheduleReconnect();
}

function handleSSEEvent(evt) {
  if (evt.event === 'connected') return;

  if (evt.id) state.lastEventId = evt.id;

  if (evt.event === 'reading' || evt.event === 'anomaly') {
    const reading = evt.data;

    state.readings.push(reading);
    // Cap by total count so time-window switching always has data
    while (state.readings.length > MAX_READINGS) {
      state.readings.shift();
    }

    // History for sparklines
    if (!state.history[reading.type]) state.history[reading.type] = [];
    state.history[reading.type].push(reading.value);
    if (state.history[reading.type].length > HISTORY_MAX) {
      state.history[reading.type].shift();
    }

    state.readingCount++;
    if (reading.anomaly) {
      state.anomalyCount++;
      addAlert(reading);
      flashScreen();
    } else {
      resolveAlert(reading.type);
    }

    updateUI(reading);
  }
}

// ── Reconnection ──

function scheduleReconnect() {
  const delay = backoffDelay(state.reconnectAttempt);
  state.reconnectAttempt++;
  connectionDot.className = 'dot reconnecting';
  connectionLabel.textContent = `Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${state.reconnectAttempt})`;
  setTimeout(() => connectSSE(), delay);
}

function setConnected(connected) {
  state.connected = connected;
  connectionDot.className = 'dot ' + (connected ? 'connected' : 'disconnected');
  connectionLabel.textContent = connected ? 'Connected' : 'Disconnected';
}

// ── Latency Measurement ──

async function measureLatency() {
  if (!state.connected) return;
  const start = performance.now();
  try {
    const resp = await fetch('/api/health');
    if (resp.ok) {
      state.lastLatencyMs = Math.round(performance.now() - start);
      latencyIndicator.textContent = `Latency: ${state.lastLatencyMs}ms`;
    }
  } catch {
    /* ignore */
  }
}

// ── Screen Flash on Anomaly ──

let flashTimeout = null;

function flashScreen() {
  screenFlash.classList.remove('active');
  // Force reflow to restart the animation
  void screenFlash.offsetWidth;
  screenFlash.classList.add('active');
  clearTimeout(flashTimeout);
  flashTimeout = setTimeout(() => screenFlash.classList.remove('active'), 800);
}

// ── Anomaly Alerts (episode-based) ──

function addAlert(reading) {
  const existing = state.anomalies.find((a) => a.type === reading.type);

  if (existing) {
    existing.endTime = reading.timestamp;
    existing.count++;
    existing.value = reading.value;

    clearTimeout(existing.timerId);
    existing.timerId = setTimeout(() => dismissAlert(existing), ALERT_EPISODE_TIMEOUT_MS);

    updateAlertElement(existing);
    return;
  }

  const alert = {
    type: reading.type,
    anomalyReason: reading.anomalyReason || 'Out of range',
    value: reading.value,
    originalValue: reading.originalValue,
    unit: reading.unit,
    startTime: reading.timestamp,
    endTime: reading.timestamp,
    count: 1,
    timerId: null,
    _el: null,
  };
  alert.timerId = setTimeout(() => dismissAlert(alert), ALERT_EPISODE_TIMEOUT_MS);

  const emptyState = alertsContainer.querySelector('.empty-state');
  if (emptyState) emptyState.remove();

  const el = buildAlertElement(alert);
  alert._el = el;
  alertsContainer.prepend(el);

  state.anomalies.unshift(alert);
  if (state.anomalies.length > MAX_ALERTS) {
    const removed = state.anomalies.pop();
    clearTimeout(removed.timerId);
    removeAlertElement(removed._el);
    removed._el = null;
  }
}

function resolveAlert(type) {
  const idx = state.anomalies.findIndex((a) => a.type === type);
  if (idx === -1) return;
  const alert = state.anomalies[idx];
  clearTimeout(alert.timerId);
  state.anomalies.splice(idx, 1);
  removeAlertElement(alert._el);
  alert._el = null;
}

function dismissAlert(alert) {
  const idx = state.anomalies.indexOf(alert);
  if (idx === -1) return;
  state.anomalies.splice(idx, 1);
  removeAlertElement(alert._el);
  alert._el = null;
}

function clearAlerts() {
  for (const a of state.anomalies) {
    clearTimeout(a.timerId);
    a._el?.remove();
    a._el = null;
  }
  state.anomalies.length = 0;
  showEmptyState();
}

// ── DOM helpers (alerts) ──

function buildAlertElement(alert) {
  const div = document.createElement('div');
  div.className = 'alert-item';
  div.style.borderLeftColor = SENSOR_COLORS[alert.type] || '#888';
  div.innerHTML = `
    <span class="alert-type">${alert.type}</span>
    <span class="alert-value">${formatAlertValue(alert)}</span>
    <span class="alert-reason">${alert.anomalyReason}</span>
    <span class="alert-time">${formatTime(alert.startTime)}</span>
  `;
  return div;
}

function formatAlertValue(alert) {
  if (alert.originalValue != null && alert.originalValue !== alert.value) {
    return `${alert.originalValue} ${alert.unit} <span class="alert-clipped">clamped to ${alert.value}</span>`;
  }
  return `${alert.value} ${alert.unit}`;
}

function updateAlertElement(alert) {
  const el = alert._el;
  if (!el) return;

  el.querySelector('.alert-value').innerHTML = formatAlertValue(alert);
  const timeEl = el.querySelector('.alert-time');
  timeEl.textContent =
    alert.startTime === alert.endTime
      ? formatTime(alert.startTime)
      : `${formatTime(alert.startTime)} \u2013 ${formatTime(alert.endTime)}`;

  const typeEl = el.querySelector('.alert-type');
  const oldBadge = typeEl.querySelector('.alert-count');
  if (oldBadge) oldBadge.remove();
  typeEl.textContent = alert.type;
  if (alert.count > 1) {
    const badge = document.createElement('span');
    badge.className = 'alert-count';
    badge.textContent = `\u00d7${alert.count}`;
    typeEl.appendChild(badge);
  }
}

function removeAlertElement(el) {
  if (!el || !el.parentNode) return;
  el.classList.add('alert-resolving');
  el.addEventListener(
    'animationend',
    () => {
      el.remove();
      if (alertsContainer.children.length === 0) {
        alertsContainer.innerHTML = '<div class="empty-state">No anomalies detected</div>';
      }
    },
    { once: true },
  );
}

function showEmptyState() {
  if (alertsContainer.children.length === 0) {
    alertsContainer.innerHTML = '<div class="empty-state">No anomalies detected</div>';
  }
}

// ── Episode Timeline ──

function renderEpisodeTimeline() {
  // Show a simplified segment bar of the last N readings, colored by anomaly state
  const visible = getVisibleReadings();
  const segments = visible.slice(-40);
  if (segments.length < 2) {
    episodeBar.innerHTML =
      '<div style="color:#6e8b8f;font-size:0.7rem;font-family:monospace">Waiting...</div>';
    return;
  }

  const html = segments
    .map((r) => {
      const cls = r.anomaly ? 'anomaly' : r.cleaned ? 'cleaned' : 'normal';
      const color = r.anomaly ? SENSOR_COLORS[r.type] : '';
      return `<div class="episode-segment ${cls}" style="${color ? 'background:' + color : ''}" title="${r.type}: ${r.value} ${r.unit} at ${formatTime(r.timestamp)}"></div>`;
    })
    .join('');
  episodeBar.innerHTML = html;
}

// ── Readings Table ──

function renderTable() {
  const latest = {};
  for (const r of state.readings) {
    latest[r.type] = r;
  }

  const types = Object.keys(SENSOR_COLORS);
  if (types.every((t) => !latest[t])) {
    readingsBody.innerHTML =
      '<tr><td colspan="4" class="empty-state">Waiting for data...</td></tr>';
    return;
  }

  readingsBody.innerHTML = types
    .map((type) => {
      const r = latest[type];
      if (!r) {
        return `<tr class="sensor-row" data-type="${type}">
        <td><span class="sensor-dot" style="background:${SENSOR_COLORS[type]}"></span><span class="sensor-type-cell">${type}</span></td>
        <td class="muted">--</td>
        <td><span class="status-badge status-waiting">waiting</span></td>
        <td class="muted">--</td>
      </tr>`;
      }

      const status = r.anomaly ? 'anomaly' : r.cleaned ? 'cleaned' : 'normal';
      const statusClass = `status-${status}`;
      const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

      // Trend arrow
      const hist = state.history[type] || [];
      let trendHtml = '';
      if (hist.length >= 2) {
        const prev = hist[hist.length - 2];
        const curr = hist[hist.length - 1];
        if (curr > prev * 1.005) trendHtml = '<span class="trend-arrow trend-up">▲</span>';
        else if (curr < prev * 0.995) trendHtml = '<span class="trend-arrow trend-down">▼</span>';
        else trendHtml = '<span class="trend-arrow trend-flat">◆</span>';
      }

      // Sparkline
      const sparkValues = hist.slice(-SPARKLINE_POINTS);
      let sparkHtml = '';
      if (sparkValues.length >= 3) {
        sparkHtml = buildSparklineSVG(sparkValues, SENSOR_COLORS[type]);
      }

      return `<tr class="sensor-row" data-type="${type}">
      <td><span class="sensor-dot" style="background:${SENSOR_COLORS[type]}"></span><span class="sensor-type-cell">${type}</span>${sparkHtml}</td>
      <td><span class="sensor-value-cell">${r.value}</span> <span style="font-family:monospace;font-size:0.7rem;color:var(--text-muted)">${r.unit}</span>${trendHtml}</td>
      <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
      <td style="font-family:monospace;font-size:0.75rem">${formatTime(r.timestamp)}</td>
    </tr>`;
    })
    .join('');

  // Click row to show detail
  readingsBody.querySelectorAll('.sensor-row').forEach((row) => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => showDetail(row.dataset.type));
  });
}

function buildSparklineSVG(values, color) {
  const w = 40,
    h = 16;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * (w - 2) + 1;
      const y = h - 2 - ((v - min) / range) * (h - 4);
      return `${x},${y}`;
    })
    .join(' ');
  return `<span class="sensor-sparkline"><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.7"/></svg></span>`;
}

// ── Detail Panel ──

function showDetail(type) {
  const readings = state.history[type] || [];
  if (!readings.length) return;

  const stats = state.readings.filter((r) => r.type === type);
  const values = stats.map((r) => r.value);
  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  const min = Math.min(...values).toFixed(1);
  const max = Math.max(...values).toFixed(1);
  const anomalyCount = stats.filter((r) => r.anomaly).length;
  const cleanCount = stats.filter((r) => r.cleaned).length;

  detailGrid.innerHTML = `
    <div class="detail-item"><div class="detail-label">Avg</div><div class="detail-value" style="color:${SENSOR_COLORS[type] || '#fff'}">${avg}</div></div>
    <div class="detail-item"><div class="detail-label">Min</div><div class="detail-value" style="color:var(--success)">${min}</div></div>
    <div class="detail-item"><div class="detail-label">Max</div><div class="detail-value" style="color:var(--danger)">${max}</div></div>
    <div class="detail-item"><div class="detail-label">Readings</div><div class="detail-value">${values.length}</div></div>
    <div class="detail-item"><div class="detail-label">Anomalies</div><div class="detail-value" style="color:var(--danger)">${anomalyCount}</div></div>
    <div class="detail-item"><div class="detail-label">Cleaned</div><div class="detail-value" style="color:var(--warning)">${cleanCount}</div></div>
  `;
  sensorDetailPanel.classList.add('open');
}

// Close detail panel on click outside
document.addEventListener('click', (e) => {
  if (sensorDetailPanel.classList.contains('open') && !e.target.closest('.readings-card')) {
    sensorDetailPanel.classList.remove('open');
  }
});

// ── Gauges ──

async function fetchThresholds() {
  try {
    const resp = await fetch('/api/sensors/thresholds');
    if (!resp.ok) return;
    state.thresholds = await resp.json();
  } catch {
    /* silent */
  }
}

async function saveThreshold(type, field, value) {
  const num = parseFloat(value);
  if (isNaN(num)) return;
  try {
    const resp = await fetch('/api/sensors/thresholds', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [type]: { [field]: num } }),
    });
    if (resp.ok) state.thresholds = await resp.json();
  } catch {
    /* silent */
  }
}

function handleThresholdEdit(e) {
  if (e.type === 'keydown' && e.key !== 'Enter') return;
  e.preventDefault();
  const span = e.target;
  const card = span.closest('.gauge-card');
  if (!card) return;
  const type = card.dataset.type;
  const field = span.dataset.field;
  const value = span.textContent.trim();
  saveThreshold(type, field, value);
  span.blur();
}

async function fetchStats() {
  try {
    const resp = await fetch('/api/sensors/stats');
    if (!resp.ok) return;
    const stats = await resp.json();

    if (!stats.length) {
      statsContainer.innerHTML = '<div class="stat-placeholder">Waiting for data...</div>';
      return;
    }

    // Get latest values for each type
    const latest = {};
    for (const r of state.readings) {
      latest[r.type] = r;
    }

    statsContainer.innerHTML = stats
      .map((s) => {
        const color = SENSOR_COLORS[s.type] || '#888';
        const thr = state.thresholds[s.type] || { min: s.min, max: s.max };
        const range = thr.max - thr.min || 1;
        const current = latest[s.type]?.value ?? s.avg;
        const pct = ((current - thr.min) / range) * 100;
        const isAnomaly = latest[s.type]?.anomaly;
        const unit = latest[s.type]?.unit || '';

        return `
        <div class="gauge-card" data-type="${s.type}" style="border-top-color:${color}">
          <div class="gauge-header">
            <span class="gauge-type">${s.type}</span>
            <span class="gauge-readings">${s.count} rdgs</span>
          </div>
          <div class="gauge-value ${isAnomaly ? 'anomalous' : ''}">${current}</div>
          <div class="gauge-unit">${unit}</div>
          <div class="gauge-bar-bg">
            <div class="gauge-bar" style="width:${Math.max(2, Math.min(100, pct))}%;background:${color}"></div>
          </div>
          <div class="gauge-extremes">
            <span class="threshold-edit" contenteditable="true" data-field="min" title="Click to edit min">${thr.min}</span>
            <span class="threshold-edit" contenteditable="true" data-field="max" title="Click to edit max">${thr.max}</span>
          </div>
          ${s.anomalies > 0 ? `<div class="gauge-anomaly-badge">${s.anomalies} ${s.anomalies > 1 ? 'anomalies' : 'anomaly'}</div>` : ''}
        </div>
      `;
      })
      .join('');

    // Attach edit handlers to threshold fields
    statsContainer.querySelectorAll('.threshold-edit').forEach((span) => {
      span.addEventListener('blur', handleThresholdEdit);
      span.addEventListener('keydown', handleThresholdEdit);
    });
  } catch {
    // Stats fetch failed silently
  }
}

// ── UI Update ──

function updateUI(reading) {
  renderTable();
  drawSmallMultiples();
  renderEpisodeTimeline();
  readingCounter.textContent = `Readings: ${state.readingCount}`;
  anomalyCounter.textContent = `Anomalies: ${state.anomalyCount}`;
}

// ── Health / Uptime Polling ──

async function fetchHealth() {
  try {
    const resp = await fetch('/api/health');
    if (!resp.ok) return;
    const data = await resp.json();
    uptimeEl.textContent = `Uptime: ${Math.floor(data.uptime)}s`;
  } catch {
    /* ignore */
  }
}

// ── Init ──

window.addEventListener('resize', () => {
  resizeAllCanvases();
  drawSmallMultiples();
});

initChartPanels();
resizeAllCanvases();

// SSE
connectSSE();

// Time range
setupTimeRange();

// Poll stats every 5s (fresher gauges)
setInterval(fetchStats, 5_000);
fetchStats();

// Poll thresholds every 10s (in case another client changed them)
setInterval(fetchThresholds, 10_000);
fetchThresholds();

// Poll health every 5s
setInterval(fetchHealth, 5_000);
fetchHealth();

// Measure latency every 10s
setInterval(measureLatency, 10_000);
measureLatency();

// Redraw charts periodically
setInterval(drawSmallMultiples, 500);
