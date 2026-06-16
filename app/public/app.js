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

let projects = [];
let activeProject = null; // { name, url, runType }

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
  projects.forEach((p) => {
    const item = document.createElement('div');
    item.className =
      'project-item' + (activeProject && activeProject.name === p.name ? ' active' : '');
    const dotClass = p.running ? 'running' : '';
    const typeLabel = p.runType ? `<span class="run-type">${p.runType}</span>` : '';
    item.innerHTML = `<span class="dot ${dotClass}"></span><span>${p.name}${typeLabel}</span><button class="remove" data-name="${p.name}">×</button>`;
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove')) return;
      selectProject(p.name);
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

  projectNameEl.textContent = name;
  projectTypeEl.textContent = '';
  setStatus('loading', 'starting...');
  placeholder.classList.add('hidden');
  preview.classList.remove('hidden');
  projectUrlEl.textContent = '';

  if (start) {
    const result = await api(`/api/projects/${name}/select`, { method: 'POST' });
    projects.forEach((p) => (p.running = false));

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
    }
  } else {
    const status = await api(`/api/projects/${name}/status`);
    projects.forEach((p) => (p.running = false));
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

function setStatus(className, label) {
  projectStatusEl.className = className;
  projectStatusEl.textContent = label;
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
        } else if (data.status === 'timeout') {
          setStatus('stopped', 'not responding');
        }
        // Update project list to reflect run state
        loadProjects();
      }
      break;

    case 'log':
      // Show system log lines as real-time status during transitional states.
      // Don't overwrite definitive terminal states (running, stopped).
      if (
        activeProject &&
        activeProject.name === data.project &&
        data.stream === 'system' &&
        projectStatusEl.className !== 'running' &&
        projectStatusEl.className !== 'stopped'
      ) {
        const lastLine = data.lines[data.lines.length - 1];
        if (lastLine) projectStatusEl.textContent = lastLine;
      }
      break;

    case 'project-exit':
      if (activeProject && activeProject.name === data.project) {
        setStatus('stopped', `exited (${data.code})`);
        projectUrlEl.textContent = '';
        previewFrame.src = '';
        activeProject.url = null;
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
