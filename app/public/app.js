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
const LOG_MIN_HEIGHT = 100;

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
  projects = await api('/api/projects');
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
    item.innerHTML = `<span class="dot ${dotClass}"></span><span>${p.name}${typeLabel}</span><div class="project-item-actions"><button class="details-btn" data-name="${p.name}" title="Project details">&#8505;</button><button class="remove" data-name="${p.name}">×</button></div>`;
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
    item.querySelector('.remove').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Remove "${p.name}"?`)) return;
      await api(`/api/projects/${p.name}`, { method: 'DELETE' });
      if (activeProject && activeProject.name === p.name) {
        activeProject = null;
        showPlaceholder();
      }
      loadProjects();
    });
    projectList.appendChild(item);
  });
  stopAllBtn.disabled = !anyRunning;
}

// ── Details Panel ──

async function showDetails(name) {
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

function closeDetails() {
  detailsPanel.classList.add('hidden');
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

function showLogPanel() {
  // Restore saved height before removing collapsed for smooth transition
  const savedH = localStorage.getItem(LOG_HEIGHT_KEY);
  if (savedH) {
    logPanel.style.height = savedH + 'px';
  } else {
    logPanel.style.height = '200px';
  }
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
  } else {
    showLogPanel();
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
const savedHeight = localStorage.getItem(LOG_HEIGHT_KEY);
if (savedHeight) {
  logPanel.style.height = savedHeight + 'px';
} else {
  logPanel.style.height = '200px';
}

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

  // Show log panel if it has content for this project
  if (logBuffers[name] && logBuffers[name].length > 0) {
    showLogPanel();
    renderLogs();
  }

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
  testAllBtn.textContent = 'Running...';
  testAllSummary.classList.remove('hidden');
  document.querySelector('#test-all-header h3').textContent = 'Test All';
  testAllResults.innerHTML = 'Running tests for all projects...';

  const result = await api('/api/projects/test-all', { method: 'POST' });

  renderTestResults(result.results || [], 'Test All');

  testAllBtn.disabled = false;
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

      // Auto-show log panel when logs arrive for the active project
      if (
        activeProject &&
        activeProject.name === data.project &&
        logPanel.classList.contains('collapsed')
      ) {
        showLogPanel();
      }

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

// Also handle older SSE format (plain message)
evtSource.addEventListener('message', (e) => {
  // Already handled by onmessage above
});

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
