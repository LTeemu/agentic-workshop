const projectList = document.getElementById('project-list');
const placeholder = document.getElementById('placeholder');
const preview = document.getElementById('preview');
const runTestsBtn = document.getElementById('run-tests');
const previewFrame = document.getElementById('preview-frame');
const projectTypeEl = document.getElementById('project-type');
const projectUrlEl = document.getElementById('project-url');
const openTabBtn = document.getElementById('open-tab');
const autoStopCheckbox = document.getElementById('auto-stop');
const stopAllBtn = document.getElementById('stop-all');
const previewNotice = document.getElementById('preview-notice');
const previewNoticeText = document.getElementById('preview-notice-text');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarCompact = document.getElementById('sidebar-compact');
const sidebarCompactProjects = document.getElementById('sidebar-compact-projects');

// Details panel
const detailsPanel = document.getElementById('details-panel');
const detailsTitle = document.getElementById('details-title');
const detailsClose = document.getElementById('details-close');
const detailsDescription = document.getElementById('details-description');
const detailsScriptsList = document.getElementById('details-scripts-list');
const detailsDepsList = document.getElementById('details-deps-list');
const detailsDevdepsList = document.getElementById('details-devdeps-list');

// Log panel
const logPanel = document.getElementById('log-panel');
const logOutput = document.getElementById('log-output');
const logFilter = document.getElementById('log-filter');
const logAutoScroll = document.getElementById('log-auto-scroll');
const logClear = document.getElementById('log-clear');
const logToggle = document.getElementById('log-toggle');
const resizeHandle = document.querySelector('.resize-handle');
const LOG_HEIGHT_KEY = 'workshop-log-height';
const LOG_VISIBLE_KEY = 'workshop-log-visible';
const LOG_TAB_KEY = 'workshop-log-tab';
const TERMINAL_ID_KEY = 'workshop-terminal-id'; // live session reused across refreshes
const LOG_MIN_HEIGHT = 180;

// Panel tabs
const panelTabs = document.getElementById('panel-tabs');

// Terminal tab
const terminalTab = document.getElementById('terminal-tab');
const terminalContainer = document.getElementById('terminal-container');
const terminalOpenCodeBtn = document.getElementById('terminal-opencode');

let projects = [];
let activeProject = null; // { name, url, runType }
let autoStop = true;
let logBuffers = {}; // { projectName: [{ ts, stream, line }] }
let logVisible = false;
let currentStatus = ''; // 'loading' | 'running' | 'stopped'
const testAllSummary = document.getElementById('test-all-summary');
const testAllResults = document.getElementById('test-all-results');
const testAllBtn = document.getElementById('test-all');

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

async function loadProjects() {
  const data = await api('/api/projects');
  if (!Array.isArray(data)) return; // failed response — keep the last known list
  projects = data;
  renderProjectList();
}

async function loadActive() {
  const data = await api('/api/active');
  if (data.active) {
    activeProject = data.active;
    selectProject(activeProject.name, false);
  } else if (data.file) {
    const projectName = data.file.replace('projects/', '');
    if (projectName) {
      selectProject(projectName, true);
    } else {
      showPlaceholder();
    }
  } else {
    showPlaceholder();
  }
}

function renderProjectList() {
  projectList.innerHTML = '';
  projects.sort((a, b) => a.name.localeCompare(b.name));
  let anyRunning = false;
  projects.forEach((p) => {
    if (p.running) anyRunning = true;
    const item = document.createElement('div');
    item.className =
      'project-item' + (activeProject && activeProject.name === p.name ? ' active' : '');
    const dotClass = p.running ? 'running' : '';
    const typeLabel = `<span class="run-type">${p.runType || p.type || '—'}</span>`;
    item.innerHTML = `<span class="dot ${dotClass}"></span><span class="project-name">${p.name}</span>${typeLabel}<div class="project-item-actions"><button class="details-btn" data-name="${p.name}" title="Project details">&#8505;</button></div>`;
    item.addEventListener('click', (e) => {
      if (e.target.closest('.project-item-actions')) return;
      if (p.running && activeProject && activeProject.name === p.name) {
        stopProject(p.name);
      } else {
        selectProject(p.name);
      }
    });
    item.querySelector('.details-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const panelHidden = detailsPanel.classList.contains('hidden');
      const sameProject = detailsTitle.dataset.project === p.name;
      if (!panelHidden && sameProject) {
        closeDetails();
      } else {
        showDetails(p.name);
      }
    });
    projectList.appendChild(item);
  });
  // ── Compact sidebar dots ──
  sidebarCompactProjects.innerHTML = '';
  projects.forEach((p) => {
    const el = document.createElement('div');
    el.className = 'compact-project' + (p.running ? ' running' : '');
    el.title = `${p.name}  (${p.runType || p.type || '—'})`;
    const shortId = p.name.charAt(0).toUpperCase();
    const dotClass = p.running ? 'running' : '';
    el.innerHTML = `<span class="dot ${dotClass}"></span><span class="compact-id">${shortId}</span><button class="compact-details" data-name="${p.name}">i</button>`;
    el.addEventListener('click', (e) => {
      if (e.target.closest('.compact-details')) return;
      e.stopPropagation();
      if (p.running && activeProject && activeProject.name === p.name) {
        stopProject(p.name);
      } else {
        selectProject(p.name);
      }
    });
    el.querySelector('.compact-details').addEventListener('click', (e) => {
      e.stopPropagation();
      const panelHidden = detailsPanel.classList.contains('hidden');
      const sameProject = detailsTitle.dataset.project === p.name;
      if (!panelHidden && sameProject) {
        closeDetails();
      } else {
        showDetails(p.name);
      }
    });
    sidebarCompactProjects.appendChild(el);
  });

  stopAllBtn.disabled = !anyRunning;
  compactStopAll.disabled = stopAllBtn.disabled;
  compactTestAll.disabled = testAllBtn.disabled;
}

// ── Details Panel ──

async function showDetails(name) {
  // Cancel any pending close
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
  detailsPanel.classList.remove('slide-out');

  const data = await api(`/api/projects/${name}/details`);
  detailsTitle.textContent = data.name;
  detailsTitle.dataset.project = name;

  // Description
  if (data.description) {
    detailsDescription.textContent = data.description;
    detailsDescription.classList.remove('hidden');
  } else {
    detailsDescription.classList.add('hidden');
  }

  // Scripts
  const scriptEntries = Object.entries(data.scripts);
  if (scriptEntries.length > 0) {
    detailsScriptsList.innerHTML = '';
    for (const [scriptName, scriptCmd] of scriptEntries) {
      const row = document.createElement('div');
      row.className = 'detail-script-row';
      row.innerHTML = `<span class="detail-script-name">${scriptName}</span><code class="detail-script-cmd">${escapeHtml(scriptCmd)}</code><button class="copy-btn" data-cmd="${escapeHtml(scriptCmd)}" title="Copy command">📋</button>`;
      row.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(scriptCmd).catch(() => {});
      });
      detailsScriptsList.appendChild(row);
    }
  } else {
    detailsScriptsList.innerHTML = '<p class="detail-empty">No scripts</p>';
  }

  // Dependencies
  renderDepList(detailsDepsList, data.dependencies);
  renderDepList(detailsDevdepsList, data.devDependencies);

  detailsPanel.classList.remove('hidden');
}

function renderDepList(container, deps) {
  const entries = Object.entries(deps);
  if (entries.length > 0) {
    container.innerHTML = '';
    for (const [depName, depVer] of entries) {
      const row = document.createElement('div');
      row.className = 'detail-dep-row';
      row.innerHTML = `<span class="detail-dep-name">${depName}</span><span class="detail-dep-ver">${depVer}</span>`;
      container.appendChild(row);
    }
    container.closest('section').classList.remove('hidden');
  } else {
    container.closest('section').classList.add('hidden');
  }
}

let closeTimer = null;

function closeDetails() {
  if (detailsPanel.classList.contains('hidden') || closeTimer) return;
  detailsPanel.classList.add('slide-out');
  closeTimer = setTimeout(() => {
    detailsPanel.classList.remove('slide-out');
    detailsPanel.classList.add('hidden');
    closeTimer = null;
  }, 200);
}

detailsClose.addEventListener('click', closeDetails);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDetails();
});
detailsPanel.addEventListener('click', (e) => {
  if (e.target === detailsPanel) closeDetails();
});

// ── Log Panel ──

function renderLogs() {
  if (!activeProject) return;
  const buffer = logBuffers[activeProject.name] || [];
  const filterText = logFilter.value.toLowerCase();
  let html = '';
  for (const entry of buffer) {
    if (filterText && !entry.line.toLowerCase().includes(filterText)) continue;
    const cls =
      entry.stream === 'stderr' ? 'log-stderr' : entry.stream === 'system' ? 'log-system' : '';
    html += `<span class="log-line ${cls}">${escapeHtml(stripAnsi(entry.line))}\n</span>`;
  }
  logOutput.innerHTML = html;
  if (logAutoScroll.checked) {
    logOutput.scrollTop = logOutput.scrollHeight;
  }
}

function appendLogLines(project, stream, lines) {
  if (!logBuffers[project]) logBuffers[project] = [];
  for (const line of lines) {
    logBuffers[project].push({ ts: Date.now(), stream, line });
  }
  // Keep last 1000 lines
  if (logBuffers[project].length > 1000) {
    logBuffers[project] = logBuffers[project].slice(-1000);
  }
  if (activeProject && activeProject.name === project) {
    renderLogs();
  }
}

function restoreLogHeight() {
  const savedH = localStorage.getItem(LOG_HEIGHT_KEY);
  logPanel.style.height = savedH ? savedH + 'px' : '200px';
}

function showLogPanel() {
  // Restore saved height before removing collapsed for smooth transition
  restoreLogHeight();
  logPanel.classList.remove('collapsed');
  logVisible = true;
  logToggle.textContent = '▼';
  if (activeProject) {
    renderLogs();
  }
}

function hideLogPanel() {
  logPanel.classList.add('collapsed');
  logVisible = false;
  logToggle.textContent = '▲';
}

logToggle.addEventListener('click', () => {
  if (logVisible) {
    hideLogPanel();
    localStorage.setItem(LOG_VISIBLE_KEY, '0');
  } else {
    showLogPanel();
    localStorage.setItem(LOG_VISIBLE_KEY, '1');
  }
});

logFilter.addEventListener('input', () => {
  if (activeProject) renderLogs();
});

logClear.addEventListener('click', () => {
  if (activeProject && logBuffers[activeProject.name]) {
    logBuffers[activeProject.name] = [];
    logOutput.innerHTML = '';
  }
});

// ── Log Panel Resize ──

// Restore saved height
restoreLogHeight();

let isResizing = false;
let resizeStartY = 0;
let resizeStartHeight = 0;

resizeHandle.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  resizeHandle.setPointerCapture(e.pointerId);
  isResizing = true;
  resizeStartY = e.clientY;
  resizeStartHeight = logPanel.getBoundingClientRect().height;
  logPanel.classList.add('no-transition');
  document.body.style.cursor = 'ns-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('pointermove', (e) => {
  if (!isResizing) return;
  const dy = resizeStartY - e.clientY; // positive = dragging up (taller)
  const newHeight = resizeStartHeight + dy;
  const clamped = Math.max(LOG_MIN_HEIGHT, newHeight);
  logPanel.style.height = clamped + 'px';
});

document.addEventListener('pointerup', (e) => {
  if (!isResizing) return;
  isResizing = false;
  logPanel.classList.remove('no-transition');
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  const h = logPanel.style.height;
  if (h) {
    localStorage.setItem(LOG_HEIGHT_KEY, parseInt(h, 10));
  }
});

// ── Panel Tabs ──

function bumpPanelHeight() {
  const h = parseInt(logPanel.style.height, 10) || 0;
  if (h < LOG_MIN_HEIGHT) {
    logPanel.style.height = LOG_MIN_HEIGHT + 'px';
    localStorage.setItem(LOG_HEIGHT_KEY, LOG_MIN_HEIGHT);
  }
}

function activatePanelTab(tab) {
  for (const btn of panelTabs.querySelectorAll('.panel-tab')) {
    const active = btn.dataset.tab === tab;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  }
  logPanel.classList.toggle('terminal-active', tab === 'terminal');
  terminalTab.classList.toggle('hidden', tab !== 'terminal');
}

function setPanelTab(tab) {
  activatePanelTab(tab);
  localStorage.setItem(LOG_TAB_KEY, tab);
  // Clicking a tab on a collapsed panel expands it.
  if (!logVisible) showLogPanel();
  localStorage.setItem(LOG_VISIBLE_KEY, '1');
  bumpPanelHeight();
  if (tab === 'terminal') {
    if (!termInstance) initTerminal();
    else {
      if (!terminalId) startTerminalSession(); // TUI exited earlier — restart
      requestAnimationFrame(fitTerminal); // re-fit after switching back
    }
  }
}

panelTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.panel-tab');
  if (btn) setPanelTab(btn.dataset.tab);
});

// ── Terminal Tab (real shell, opencode2 shortcut) ──

let termInstance = null; // xterm Terminal
let termFit = null; // FitAddon
let terminalId = null;
let openCodeCommand = null; // shell command string that launches opencode2
let terminalStream = null; // EventSource
let terminalStarting = false;
let terminalSessionPending = false; // in-flight startTerminalSession guard
let terminalFitTimer = null;
// Set while the page is being torn down (refresh/close/navigation). The browser
// aborts the SSE EventSource during teardown and fires `error` with readyState
// CLOSED; without this flag that abort would be mistaken for a lost session and
// wipe the persisted session id, spawning a fresh shell on the next page load.
// Both events are needed: `beforeunload` fires first in Chrome's teardown, with
// `pagehide` (and visibilitychange) arriving only after the stream error.
let pageUnloading = false;
window.addEventListener('beforeunload', () => {
  pageUnloading = true;
});
window.addEventListener('pagehide', () => {
  pageUnloading = true;
});
// Back/forward cache restore re-runs this page without a fresh document: the
// old document's stream may have been torn down while the flag was set, so
// re-enable recovery and re-open the stream if it ended up CLOSED.
window.addEventListener('pageshow', (e) => {
  pageUnloading = false;
  if (
    e.persisted &&
    terminalId &&
    terminalStream &&
    terminalStream.readyState === EventSource.CLOSED
  ) {
    openTerminalStream();
  }
});

function initTerminal() {
  if (termInstance || terminalStarting) return;
  terminalStarting = true;
  try {
    termInstance = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
      scrollback: 5000,
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        selectionBackground: '#1f6feb',
        black: '#0d1117',
        red: '#f85149',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#c9d1d9',
        brightBlack: '#484f58',
        brightRed: '#ff7b72',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
    });
    termFit = new FitAddon.FitAddon();
    termInstance.loadAddon(termFit);
    termInstance.open(terminalContainer);
    termInstance.onData(sendTerminalInput);
    fitTerminal();
    startTerminalSession();
  } finally {
    terminalStarting = false;
  }
}

async function startTerminalSession() {
  if (terminalSessionPending) return; // guard against re-entrant calls while awaiting
  terminalSessionPending = true;
  try {
    // Reuse the session from before a refresh: the shell lives server-side and
    // survives page reloads. A definitive "gone" (404/410) clears the key and
    // falls through to a fresh shell; a network failure is surfaced instead so
    // a transient blip can't orphan the still-running session.
    const savedId = localStorage.getItem(TERMINAL_ID_KEY);
    if (savedId) {
      const probe = await probeSession(savedId);
      if (probe.state) {
        setOpenCodeButton(probe.state.running);
        attachToSession(savedId, probe.state.openCodeCommand);
        return;
      }
      if (probe.gone) {
        localStorage.removeItem(TERMINAL_ID_KEY); // stale session — fall through
      } else {
        throw new Error('cannot reach the dashboard server');
      }
    }

    await createFreshSession();
  } catch (err) {
    terminalOpenCodeBtn.disabled = true;
    termInstance.write(`\r\n\x1b[31mFailed to start shell: ${err.message}\x1b[0m\r\n`);
  } finally {
    terminalSessionPending = false;
  }
}

/** POST a new shell and attach to it (also persists the id for refreshes). */
async function createFreshSession() {
  const data = await api('/api/terminal', {
    method: 'POST',
    body: JSON.stringify({ cols: termInstance.cols, rows: termInstance.rows }),
  });
  if (data.error) throw new Error(data.error);
  if (!data.id) throw new Error('server returned no session id');
  localStorage.setItem(TERMINAL_ID_KEY, data.id);
  termInstance.write('\x1b[2J\x1b[H');
  attachToSession(data.id, data.openCodeCommand);
}

/** A response status that definitively means the session no longer exists. */
function isSessionGone(status) {
  return status === 404 || status === 410;
}

/**
 * Probe a saved session. Result is `{ state }` when live, `{ gone: true }` on
 * a definitive 404/410, or `{ error: true }` when the request itself failed —
 * so a transient blip (network or a 5xx) never discards a running session.
 */
async function probeSession(id) {
  try {
    const res = await fetch(`/api/terminal/${id}/opencode`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return isSessionGone(res.status) ? { gone: true } : { error: true };
    return { state: await res.json() };
  } catch {
    return { error: true };
  }
}

/** Wire the UI to a live session and open its SSE stream. */
function attachToSession(id, command) {
  terminalId = id;
  openCodeCommand = command || 'opencode2';
  terminalOpenCodeBtn.disabled = false;
  fitTerminal(); // re-fit so the pty gets the current panel size after a refresh
  openTerminalStream();
}

/** Tear down the SSE stream and forget the in-memory session binding. The
 * persisted session id is deliberately kept: only startTerminalSession's probe
 * (404/410) removes it, so a teardown caused by a transient stream error can
 * never orphan a still-running server session. */
function resetTerminalState() {
  if (terminalStream) {
    terminalStream.close();
    terminalStream = null;
  }
  terminalId = null;
  openCodeCommand = null;
  setOpenCodeButton(false); // unhide + clear debounce (session ended)
  terminalOpenCodeBtn.disabled = true; // then lock: no shell to type into
}

function openTerminalStream() {
  if (terminalStream) terminalStream.close();
  const es = new EventSource(`/api/terminal/${terminalId}/stream`);
  terminalStream = es;
  // Re-sync on (re)connect: the server only broadcasts opencode state on
  // change, so after an SSE blip the button could be stale until then.
  es.onopen = () => syncOpenCodeState();
  es.addEventListener('message', (e) => {
    let ev;
    try {
      ev = JSON.parse(e.data);
    } catch {
      return;
    }
    if (ev.type === 'data') {
      termInstance.write(ev.data);
    } else if (ev.type === 'replay') {
      // Late attach (page refresh): replace the screen with the buffered state.
      termInstance.write('\x1b[2J\x1b[H');
      termInstance.write(ev.data);
    } else if (ev.type === 'restart') {
      const code = ev.data ? ` (code ${ev.data})` : '';
      // The old shell's screen is dead — the new one starts blank.
      termInstance.write('\x1b[2J\x1b[H');
      termInstance.write(`\r\n\x1b[2m[shell restarted${code}]\x1b[0m\r\n`);
    } else if (ev.type === 'opencode') {
      setOpenCodeButton(ev.data === true);
    } else if (ev.type === 'exit') {
      const code = ev.data ? ` (code ${ev.data})` : '';
      termInstance.write(`\r\n\x1b[90m[shell exited${code}]\x1b[0m\r\n`);
      resetTerminalState();
    }
  });
  // EventSource reconnects automatically on network blips (readyState
  // CONNECTING). CLOSED means the session is gone for good (410/404, or the
  // server restarted) — drop it and start a fresh shell. Exception: when the
  // page itself is being unloaded, the browser aborts the connection and fires
  // a spurious CLOSED error — recoverLostSession guards that case.
  es.onerror = () => {
    if (es.readyState !== EventSource.CLOSED) return;
    if (terminalStream !== es) return; // superseded by a newer stream — ignore
    recoverLostSession();
  };
}

/**
 * POST to the session; on 404 the session no longer exists server-side, so
 * recover instead of spamming dead requests on every keystroke/mouse event.
 * The id-capture guard prevents an in-flight response from an old session from
 * tearing down a freshly recovered one.
 */
async function postTerminal(id, path, body) {
  if (!id) return;
  try {
    const res = await fetch(`/api/terminal/${id}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (isSessionGone(res.status) && terminalId === id) recoverLostSession();
  } catch {
    // network blip — the SSE stream or the next event will retry
  }
}

function sendTerminalInput(data) {
  postTerminal(terminalId, 'input', { data });
}

function sendResize(cols, rows) {
  postTerminal(terminalId, 'resize', { cols, rows });
}

/**
 * The attached session is gone — drop it and start a fresh shell. Self-guarded
 * so concurrent triggers (a 404 from an in-flight POST plus a stream error)
 * can't double-recover; the flag stays set until the new session is attached
 * or the attempt failed. Also the single choke point for the page-teardown
 * guard: any trigger (stream error, POST 404) that fires while the page is
 * unloading must not discard the persisted session id — the next page load
 * probes and re-attaches to the still-running session instead.
 */
let terminalRecovering = false;
async function recoverLostSession() {
  if (pageUnloading || terminalRecovering) return;
  terminalRecovering = true;
  try {
    resetTerminalState();
    termInstance.write('\r\n\x1b[90m[terminal session lost — starting a new shell]\x1b[0m\r\n');
    await startTerminalSession();
  } finally {
    terminalRecovering = false;
  }
}

// Shortcut: type the resolved opencode2 launch command into the live shell.
// While the TUI is running the button is hidden — raw-mode input would land
// in opencode's chat instead of the shell.

function setOpenCodeButton(running) {
  const isRunning = running === true;
  const wasHidden = terminalOpenCodeBtn.classList.contains('hidden');
  terminalOpenCodeBtn.classList.toggle('hidden', isRunning);
  // Only a hidden → visible transition (opencode exited) clears the click-debounce
  // set by the click handler while the TUI boots. A plain "not running" probe
  // (e.g. SSE resync mid-boot) must not reopen the double-click window.
  if (wasHidden && !isRunning) terminalOpenCodeBtn.disabled = false;
}

/** Query the server for TUI state and mirror it on the button. Returns state or null. */
async function syncOpenCodeState() {
  if (!terminalId) return null;
  const probe = await probeSession(terminalId);
  if (!probe.state) return null; // session gone/unreachable — leave the button as-is
  setOpenCodeButton(probe.state.running);
  return probe.state;
}

terminalOpenCodeBtn.addEventListener('click', async () => {
  if (!terminalId) return;
  const state = await syncOpenCodeState();
  if (state && state.running) return; // opencode already running — don't type into its chat
  terminalOpenCodeBtn.disabled = true; // block rapid re-clicks while the TUI boots
  // Ctrl+C cancels any partial line at the shell prompt, so a half-typed
  // command can't get mangled into the launch command.
  sendTerminalInput('\x03' + openCodeCommand + '\r');
  setTimeout(() => {
    // Re-enable unless a probe has since confirmed the TUI is running (button hidden).
    if (!terminalOpenCodeBtn.classList.contains('hidden')) terminalOpenCodeBtn.disabled = false;
  }, 1500);
});

function fitTerminal() {
  if (!termInstance || !termFit) return;
  const cols = termInstance.cols;
  const rows = termInstance.rows;
  try {
    termFit.fit();
  } catch {
    return; // hidden or zero-size container — a later resize event re-fits
  }
  if (terminalId && (termInstance.cols !== cols || termInstance.rows !== rows)) {
    sendResize(termInstance.cols, termInstance.rows);
  }
}

// Keep the terminal sized to the panel (drag handle, collapse, window resize).
if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    clearTimeout(terminalFitTimer);
    terminalFitTimer = setTimeout(fitTerminal, 150);
  }).observe(terminalContainer);
}

async function selectProject(name, start = true) {
  // Clicking the already-running project — just reload the iframe
  if (start && activeProject && activeProject.name === name && activeProject.url) {
    previewFrame.src = activeProject.url;
    renderProjectList();
    return;
  }

  activeProject = { name, url: null, runType: null };
  renderProjectList();
  openTabBtn.disabled = true;

  projectTypeEl.textContent = '';
  setStatus('loading', 'starting...');
  placeholder.classList.add('hidden');
  preview.classList.remove('hidden');
  projectUrlEl.textContent = '';
  previewFrame.src = ''; // Clear old project content immediately

  if (start) {
    const result = await api(`/api/projects/${name}/select?autoStop=${autoStop}`, {
      method: 'POST',
    });
    if (autoStop) {
      projects.forEach((p) => (p.running = false));
    }

    if (result.url) {
      const p = projects.find((x) => x.name === name);
      if (p) {
        p.running = true;
        p.runType = result.runType;
      }
      activeProject.url = result.url;
      activeProject.runType = result.runType;
      projectUrlEl.textContent = result.url;
      projectTypeEl.textContent = result.runType || '';
      openTabBtn.disabled = false;

      hideNotice();
      if (result.starting) {
        // Project is spawning — start loading the iframe immediately.
        // System log events from the server will update the status text
        // with step-by-step progress (installing, waiting, etc.).
        previewFrame.src = result.url;
      } else {
        // Static server — ready immediately
        setStatus('running', 'running');
        previewFrame.src = result.url;
      }
    } else if (result.starting) {
      // Already being started (e.g. by the auto-start path on boot).
      // Keep 'loading' / 'starting...' and wait for SSE events.
      setStatus('loading', 'starting...');
      previewNoticeText.textContent = 'starting...';
      previewNotice.classList.remove('hidden');
      previewFrame.classList.add('hidden');
    } else {
      setStatus('stopped', result.error || 'stopped');
      activeProject.url = null;
      openTabBtn.disabled = true;
      previewFrame.src = '';
      showNotice(result.error || 'This project cannot be started');
    }
  } else {
    const status = await api(`/api/projects/${name}/status`);
    if (autoStop) {
      projects.forEach((p) => (p.running = false));
    }
    if (status.running) {
      const p = projects.find((x) => x.name === name);
      if (p) p.running = true;
      activeProject.url = status.url;
      activeProject.runType = status.runType;
      projectUrlEl.textContent = status.url;
      projectTypeEl.textContent = status.runType || '';
      setStatus('running', 'running');
      previewFrame.src = status.url;
      openTabBtn.disabled = false;
    } else {
      selectProject(name, true);
      return;
    }
  }
  renderProjectList();
}

async function stopProject(name) {
  const result = await api(`/api/projects/${name}/stop`, { method: 'POST' });
  if (result.stopped) {
    if (activeProject && activeProject.name === name) {
      activeProject.url = null;
      openTabBtn.disabled = true;
      setStatus('stopped', 'stopped');
      projectUrlEl.textContent = '';
      previewFrame.src = '';
      showNotice('stopped');
    }
    const p = projects.find((x) => x.name === name);
    if (p) p.running = false;
    renderProjectList();
  }
}

function renderTestResults(results, title) {
  document.querySelector('#test-all-header h3').textContent = title;
  let html = '';
  let passedCount = 0;
  let failedCount = 0;

  if (results && results.length > 0) {
    for (const r of results) {
      const isPass = r.passed;
      if (isPass) passedCount++;
      else failedCount++;

      const out = (r.output || [])
        .filter(
          (l) =>
            !l.includes('Tests passed') &&
            !l.includes('Tests failed') &&
            !l.includes('Running tests') &&
            !l.includes('Running:'),
        )
        .join('\n');

      const hasOutput = !!out;
      const rowClasses = ['test-all-row', isPass ? 'pass' : 'fail'];
      if (hasOutput) rowClasses.push('expandable');
      html += `<div class="${rowClasses.join(' ')}"${hasOutput ? ` onclick="var o=this.querySelector('.test-all-output'),a=this.querySelector('.test-all-arrow');a.textContent=o.classList.toggle('hidden')?'▼':'▲'"` : ''}>`;
      html += `<span class="test-all-icon">${isPass ? '✓' : '✗'}</span>`;
      html += `<span class="test-all-name">${r.project}</span>`;
      html += `<span class="test-all-status ${isPass ? 'pass' : 'fail'}">${isPass ? 'passed' : r.error || 'failed'}</span>`;
      if (hasOutput) {
        html += `<span class="test-all-arrow">${isPass ? '▼' : '▲'}</span>`;
        html += `<pre class="test-all-output${isPass ? ' hidden' : ''}">${escapeHtml(stripAnsi(out))}</pre>`;
      }
      html += `</div>`;
    }
    html += `<p style="margin-top:12px;">${passedCount} passed, ${failedCount} failed, ${results.length} total</p>`;
  } else {
    html = '<p>No test results.</p>';
  }

  testAllResults.innerHTML = html;
  testAllSummary.classList.remove('hidden');
}

async function runTests(name) {
  runTestsBtn.disabled = true;
  runTestsBtn.textContent = 'Running...';

  const result = await api(`/api/projects/${name}/test`, { method: 'POST' });

  const results = [
    {
      project: name,
      passed: result.passed,
      error: result.error,
      output: result.output || [],
    },
  ];
  renderTestResults(results, `Tests: ${name}`);

  if (result.passed) {
    runTestsBtn.textContent = 'Tests Passed';
  } else {
    runTestsBtn.textContent = 'Tests Failed';
  }

  setTimeout(() => {
    runTestsBtn.disabled = false;
    runTestsBtn.textContent = 'Run Tests';
  }, 3000);
}

async function testAll() {
  testAllBtn.disabled = true;
  compactTestAll.disabled = true;
  testAllBtn.textContent = 'Running...';
  testAllSummary.classList.remove('hidden');
  document.querySelector('#test-all-header h3').textContent = 'Test All';
  testAllResults.innerHTML = 'Running tests for all projects...';

  const result = await api('/api/projects/test-all', { method: 'POST' });

  renderTestResults(result.results || [], 'Test All');

  testAllBtn.disabled = false;
  compactTestAll.disabled = false;
  testAllBtn.textContent = 'Test All';
}

async function stopAll() {
  const result = await api('/api/projects/stop-all', { method: 'POST' });
  if (result.stopped) {
    // Clear active if it was among stopped projects
    if (activeProject) {
      const wasStopped = result.stopped.includes(activeProject.name);
      if (wasStopped) {
        activeProject.url = null;
        openTabBtn.disabled = true;
        setStatus('stopped', 'stopped');
        projectUrlEl.textContent = '';
        previewFrame.src = '';
      }
    }
    projects.forEach((p) => {
      if (result.stopped.includes(p.name)) p.running = false;
    });
    renderProjectList();
  }
}

function setStatus(className, label) {
  currentStatus = className;
}

function showNotice(text) {
  previewNoticeText.textContent = text;
  previewNotice.classList.remove('hidden');
  previewFrame.classList.add('hidden');
}

function hideNotice() {
  previewNotice.classList.add('hidden');
  previewFrame.classList.remove('hidden');
}

function stripAnsi(str) {
  if (!str) return '';
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showPlaceholder() {
  placeholder.classList.remove('hidden');
  preview.classList.add('hidden');
  renderProjectList();
}

openTabBtn.addEventListener('click', () => {
  if (activeProject && activeProject.url) {
    window.open(activeProject.url, '_blank');
  }
});

runTestsBtn.addEventListener('click', () => {
  if (activeProject && activeProject.name) {
    runTests(activeProject.name);
  }
});

testAllBtn.addEventListener('click', testAll);

stopAllBtn.addEventListener('click', async () => {
  const runningCount = projects.filter((p) => p.running).length;
  if (runningCount === 0) return;
  await stopAll();
  // Also stop the focused project
  if (activeProject && activeProject.url) {
    await stopProject(activeProject.name);
  }
});

autoStopCheckbox.addEventListener('change', () => {
  autoStop = autoStopCheckbox.checked;
  if (autoStop) {
    // Stop all background projects — keep only the active one
    stopAll();
  }
});

// ── SSE Event Handling ──

const evtSource = new EventSource('/api/events');
evtSource.onmessage = (e) => {
  const data = JSON.parse(e.data);

  switch (data.type) {
    case 'project-list-change':
      loadProjects();
      break;

    case 'file-change':
      if (activeProject && activeProject.url) {
        const t = Date.now();
        previewFrame.src =
          activeProject.url + (activeProject.url.includes('?') ? '&' : '?') + '_t=' + t;
      }
      break;

    case 'project-status':
      if (activeProject && activeProject.name === data.project) {
        if (data.status === 'running') {
          setStatus('running', 'running');
          projectUrlEl.textContent = data.url;
          previewFrame.src = data.url;
          hideNotice();
        } else if (data.status === 'timeout') {
          setStatus('stopped', 'not responding');
          previewFrame.src = '';
          showNotice('not responding');
        }
        // Update project list to reflect run state
        loadProjects();
      }
      break;

    case 'log':
      // Buffer all log types for the log panel
      appendLogLines(data.project, data.stream, data.lines);

      // Show system log lines as real-time progress during startup.
      // Display them prominently in the notice area (large centered overlay)
      // and also in the compact status badge.
      if (activeProject && activeProject.name === data.project && data.stream === 'system') {
        const lastLine = data.lines[data.lines.length - 1];
        if (lastLine) {
          if (currentStatus !== 'running' && currentStatus !== 'stopped') {
            // Show progress in the large central notice area during startup
            previewNoticeText.textContent = lastLine;
            previewNotice.classList.remove('hidden');
            previewFrame.classList.add('hidden');
          }
        }
      }
      break;

    case 'project-exit':
      if (activeProject && activeProject.name === data.project) {
        const label =
          data.code === -1
            ? 'failed to start'
            : data.code === 'stopped'
              ? 'stopped'
              : data.code === 0
                ? 'stopped (exit 0)'
                : `exited (${data.code})`;
        setStatus('stopped', label);
        projectUrlEl.textContent = '';
        previewFrame.src = '';
        activeProject.url = null;
        openTabBtn.disabled = true;
        showNotice(label);
        loadProjects();
      }
      break;
  }
};

// Dismiss test-all modal on background click, close button, or Escape
testAllSummary.addEventListener('click', (e) => {
  if (e.target === testAllSummary) testAllSummary.classList.add('hidden');
});
document.getElementById('test-all-close').addEventListener('click', () => {
  testAllSummary.classList.add('hidden');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') testAllSummary.classList.add('hidden');
});

loadProjects();
loadActive();

// ── Compact controls ──

const compactAutoStopInput = document.getElementById('compact-auto-stop-input');
const compactStopAll = document.getElementById('compact-stop-all');
const compactTestAll = document.getElementById('compact-test-all');

// Sync compact auto-stop with main auto-stop
compactAutoStopInput.addEventListener('change', () => {
  autoStopCheckbox.checked = compactAutoStopInput.checked;
  autoStopCheckbox.dispatchEvent(new Event('change'));
});
autoStopCheckbox.addEventListener('change', () => {
  compactAutoStopInput.checked = autoStopCheckbox.checked;
});

// Wire compact buttons to main handlers
compactStopAll.addEventListener('click', () => stopAllBtn.click());
compactTestAll.addEventListener('click', () => testAllBtn.click());

// Compact buttons start disabled until first render
compactStopAll.disabled = true;
compactTestAll.disabled = true;

// Sidebar collapse toggle with localStorage persistence
if (sidebar && sidebarToggle) {
  const saved = localStorage.getItem('workshop-sidebar-collapsed');
  if (saved === 'true') {
    sidebar.classList.add('collapsed');
    sidebarToggle.setAttribute('aria-label', 'Expand sidebar');
  }
  sidebarToggle.addEventListener('click', () => {
    const isCollapsed = sidebar.classList.toggle('collapsed');
    sidebarToggle.setAttribute('aria-label', isCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
    localStorage.setItem('workshop-sidebar-collapsed', isCollapsed);
  });
}

// Restore saved panel state: open/closed + active tab.
// Runs last so all declarations (termInstance etc.) exist before a
// terminal-tab restore may initialize the TUI.
if (localStorage.getItem(LOG_VISIBLE_KEY) === '1') {
  const savedTab = localStorage.getItem(LOG_TAB_KEY);
  setPanelTab(savedTab === 'terminal' ? 'terminal' : 'logs');
}
