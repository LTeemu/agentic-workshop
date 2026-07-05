const projectList = document.getElementById('project-list');
const newProjectInput = document.getElementById('new-project-name');
const addBtn = document.getElementById('add-project');
const placeholder = document.getElementById('placeholder');
const preview = document.getElementById('preview');
const previewFrame = document.getElementById('preview-frame');
const projectNameEl = document.getElementById('project-name');
const projectStatusEl = document.getElementById('project-status');
const projectTypeEl = document.getElementById('project-type');
const projectUrlEl = document.getElementById('project-url');
const openTabBtn = document.getElementById('open-tab');
const autoStopCheckbox = document.getElementById('auto-stop');
const stopAllBtn = document.getElementById('stop-all');
const previewNotice = document.getElementById('preview-notice');
const previewNoticeText = document.getElementById('preview-notice-text');

let projects = [];
let activeProject = null; // { name, url, runType }
let autoStop = true;

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
    const typeLabel = p.runType ? `<span class="run-type">${p.runType}</span>` : '';
    item.innerHTML = `<span class="dot ${dotClass}"></span><span>${p.name}${typeLabel}</span><button class="remove" data-name="${p.name}">×</button>`;
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove')) return;
      if (p.running && activeProject && activeProject.name === p.name) {
        stopProject(p.name);
      } else {
        selectProject(p.name);
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

  projectNameEl.textContent = name;
  projectTypeEl.textContent = '';
  setStatus('loading', 'starting...');
  placeholder.classList.add('hidden');
  preview.classList.remove('hidden');
  projectUrlEl.textContent = '';

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
  projectStatusEl.className = className;
  projectStatusEl.textContent = label;
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

function showPlaceholder() {
  placeholder.classList.remove('hidden');
  preview.classList.add('hidden');
  renderProjectList();
}

addBtn.addEventListener('click', async () => {
  const name = newProjectInput.value.trim();
  if (!name) return;
  newProjectInput.value = '';
  const result = await api('/api/projects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  if (result.name) {
    await loadProjects();
    selectProject(result.name);
  } else {
    alert(result.error || 'Failed to create project');
  }
});

newProjectInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBtn.click();
});

openTabBtn.addEventListener('click', () => {
  if (activeProject && activeProject.url) {
    window.open(activeProject.url, '_blank');
  }
});

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
      // Show system log lines as real-time progress during startup.
      // Display them prominently in the notice area (large centered overlay)
      // and also in the compact status badge.
      if (activeProject && activeProject.name === data.project && data.stream === 'system') {
        const lastLine = data.lines[data.lines.length - 1];
        if (lastLine) {
          if (projectStatusEl.className !== 'running' && projectStatusEl.className !== 'stopped') {
            // Update the compact status badge
            projectStatusEl.textContent = lastLine;
            // Show progress in the large central notice area during startup
            previewNoticeText.textContent = lastLine;
            previewNotice.classList.remove('hidden');
            previewFrame.classList.add('hidden');
          } else if (projectStatusEl.className === 'running') {
            // Project is running — just update the badge for post-startup logs
            projectStatusEl.textContent = lastLine;
          }
        }
      }
      break;

    case 'project-exit':
      if (activeProject && activeProject.name === data.project) {
        setStatus('stopped', `exited (${data.code})`);
        projectUrlEl.textContent = '';
        previewFrame.src = '';
        activeProject.url = null;
        openTabBtn.disabled = true;
        showNotice(`exited (${data.code})`);
        loadProjects();
      }
      break;
  }
};

// Also handle older SSE format (plain message)
evtSource.addEventListener('message', (e) => {
  // Already handled by onmessage above
});

loadProjects();
loadActive();
