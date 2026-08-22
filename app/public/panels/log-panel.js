/**
 * Log panel — buffered logs, filter, resize, tab coordination.
 * Depends on window.FormatUtils, window.ResizeUtils.
 */
(function () {
  'use strict';
  const logPanel = document.getElementById('log-panel');
  const logOutput = document.getElementById('log-output');
  const logFilter = document.getElementById('log-filter');
  const logAutoScroll = document.getElementById('log-auto-scroll');
  const logClear = document.getElementById('log-clear');
  const logToggle = document.getElementById('log-toggle');
  const resizeHandle = document.querySelector('.resize-handle');
  const logPanelHeader = document.getElementById('log-panel-header');
  const panelTabs = document.getElementById('panel-tabs');
  const terminalTab = document.getElementById('terminal-tab');
  const LOG_HEIGHT_KEY = 'workshop-log-height';
  const LOG_VISIBLE_KEY = 'workshop-log-visible';
  const LOG_TAB_KEY = 'workshop-log-tab';
  const LOG_MIN_HEIGHT = 180;
  const PANEL_ANIMATION_MS = 200;
  const { stripAnsi, escapeHtml } = window.FormatUtils;
  let logBuffers = {}; // {project: [{ts,stream,line}]}
  let logVisible = false;
  let logCollapseTimer = null;
  let isResizing = false,
    resizeStartY = 0,
    resizeStartHeight = 0;
  function savedLogHeight() {
    const h = parseInt(localStorage.getItem(LOG_HEIGHT_KEY), 10);
    return Number.isFinite(h) ? Math.max(LOG_MIN_HEIGHT, h) : 200;
  }
  function restoreLogHeight() {
    logPanel.style.height = savedLogHeight() + 'px';
  }
  function collapsedLogHeight() {
    return logPanelHeader.offsetHeight + 1;
  }
  function commitLogPanelHeight() {
    logPanel.style.height = logPanel.getBoundingClientRect().height + 'px';
  }
  function animateLogPanelHeightTo(px) {
    void logPanel.offsetHeight;
    logPanel.style.height = px + 'px';
  }
  function setLogPanelOpen(open) {
    logVisible = open;
    logToggle.textContent = open ? '\u25BC' : '\u25B2';
  }
  function cancelLogCollapse() {
    if (logCollapseTimer) {
      clearTimeout(logCollapseTimer);
      logCollapseTimer = null;
    }
  }
  function showLogPanel() {
    cancelLogCollapse();
    commitLogPanelHeight();
    logPanel.classList.remove('collapsed');
    animateLogPanelHeightTo(savedLogHeight());
    setLogPanelOpen(true);
    const proj = window.activeProject && window.activeProject.name;
    if (proj) renderLogs(proj);
  }
  function hideLogPanel() {
    if (logPanel.classList.contains('collapsed') || logCollapseTimer) {
      setLogPanelOpen(false);
      return;
    }
    commitLogPanelHeight();
    animateLogPanelHeightTo(collapsedLogHeight());
    setLogPanelOpen(false);
    logCollapseTimer = setTimeout(() => {
      logPanel.classList.add('collapsed');
      logCollapseTimer = null;
    }, PANEL_ANIMATION_MS);
  }
  function renderLogs(projectName) {
    const name = projectName || (window.activeProject && window.activeProject.name);
    if (!name) return;
    const buffer = logBuffers[name] || [];
    const filter = (logFilter.value || '').toLowerCase();
    let html = '';
    for (const entry of buffer) {
      if (filter && !entry.line.toLowerCase().includes(filter)) continue;
      const cls =
        entry.stream === 'stderr' ? 'log-stderr' : entry.stream === 'system' ? 'log-system' : '';
      html +=
        '<span class="log-line ' + cls + '">' + escapeHtml(stripAnsi(entry.line)) + '\n</span>';
    }
    logOutput.innerHTML = html;
    if (logAutoScroll.checked) logOutput.scrollTop = logOutput.scrollHeight;
  }
  function appendLogLines(project, stream, lines) {
    if (!logBuffers[project]) logBuffers[project] = [];
    for (const line of lines) logBuffers[project].push({ ts: Date.now(), stream, line });
    if (logBuffers[project].length > 1000) logBuffers[project] = logBuffers[project].slice(-1000);
    if (window.activeProject && window.activeProject.name === project) renderLogs(project);
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
    const p = window.activeProject && window.activeProject.name;
    if (p) renderLogs(p);
  });
  logClear.addEventListener('click', () => {
    const p = window.activeProject && window.activeProject.name;
    if (p && logBuffers[p]) {
      logBuffers[p] = [];
      logOutput.innerHTML = '';
    }
  });
  restoreLogHeight();
  resizeHandle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    resizeHandle.setPointerCapture(e.pointerId);
    isResizing = true;
    logPanel.classList.add('no-transition');
    if (logCollapseTimer) {
      cancelLogCollapse();
      setLogPanelOpen(true);
      restoreLogHeight();
    }
    resizeStartY = e.clientY;
    resizeStartHeight = logPanel.getBoundingClientRect().height;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('pointermove', (e) => {
    if (!isResizing) return;
    const dy = resizeStartY - e.clientY;
    const nh = Math.max(LOG_MIN_HEIGHT, resizeStartHeight + dy);
    logPanel.style.height = nh + 'px';
  });
  function endResize() {
    if (!isResizing) return;
    isResizing = false;
    logPanel.classList.remove('no-transition');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    const h = logPanel.style.height;
    if (h) localStorage.setItem(LOG_HEIGHT_KEY, parseInt(h, 10));
  }
  document.addEventListener('pointerup', endResize);
  document.addEventListener('pointercancel', endResize);
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
    if (!logVisible) showLogPanel();
    localStorage.setItem(LOG_VISIBLE_KEY, '1');
    bumpPanelHeight();
    if (tab === 'terminal')
      window.dispatchEvent(new CustomEvent('workshop:panel-tab', { detail: 'terminal' }));
  }
  panelTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.panel-tab');
    if (btn) setPanelTab(btn.dataset.tab);
  });
  // Restore saved panel state
  if (localStorage.getItem(LOG_VISIBLE_KEY) === '1') {
    const t = localStorage.getItem(LOG_TAB_KEY);
    setPanelTab(t === 'terminal' ? 'terminal' : 'logs');
  }
  window.LogPanel = {
    appendLogLines,
    renderLogs,
    showLogPanel,
    hideLogPanel,
    setPanelTab,
    activatePanelTab,
    bumpPanelHeight,
    get buffers() {
      return logBuffers;
    },
    set buffers(v) {
      logBuffers = v;
    },
  };
  // Expose for app.js SSE handling
  window._logPanel = { appendLogLines, renderLogs };
})();
