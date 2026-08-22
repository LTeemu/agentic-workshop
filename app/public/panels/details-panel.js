/**
 * Details panel — project metadata, scripts, deps.
 * Depends on window.FormatUtils.
 */
(function () {
  'use strict';
  const detailsPanel = document.getElementById('details-panel');
  const detailsTitle = document.getElementById('details-title');
  const detailsClose = document.getElementById('details-close');
  const detailsDescription = document.getElementById('details-description');
  const detailsScriptsList = document.getElementById('details-scripts-list');
  const detailsDepsList = document.getElementById('details-deps-list');
  const detailsDevdepsList = document.getElementById('details-devdeps-list');
  const PANEL_ANIMATION_MS = 200;
  const { escapeHtml } = window.FormatUtils;
  async function api(url, opts = {}) {
    const r = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
    return r.json();
  }
  let closeTimer = null;
  async function showDetails(name) {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    detailsPanel.classList.remove('slide-out');
    const data = await api('/api/projects/' + name + '/details');
    detailsTitle.textContent = data.name;
    detailsTitle.dataset.project = name;
    if (data.description) {
      detailsDescription.textContent = data.description;
      detailsDescription.classList.remove('hidden');
    } else detailsDescription.classList.add('hidden');
    const entries = Object.entries(data.scripts || {});
    if (entries.length > 0) {
      detailsScriptsList.innerHTML = '';
      for (const [k, v] of entries) {
        const row = document.createElement('div');
        row.className = 'detail-script-row';
        row.innerHTML =
          '<span class="detail-script-name">' +
          k +
          '</span><code class="detail-script-cmd">' +
          escapeHtml(v) +
          '</code><button class="copy-btn" data-cmd="' +
          escapeHtml(v) +
          '" title="Copy command"></button>';
        row.querySelector('.copy-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(v).catch(() => {});
        });
        detailsScriptsList.appendChild(row);
      }
    } else detailsScriptsList.innerHTML = '<p class="detail-empty">No scripts</p>';
    renderDepList(detailsDepsList, data.dependencies || {});
    renderDepList(detailsDevdepsList, data.devDependencies || {});
    detailsPanel.classList.remove('hidden');
  }
  function renderDepList(container, deps) {
    const entries = Object.entries(deps);
    if (entries.length > 0) {
      container.innerHTML = '';
      for (const [k, v] of entries) {
        const row = document.createElement('div');
        row.className = 'detail-dep-row';
        row.innerHTML =
          '<span class="detail-dep-name">' +
          k +
          '</span><span class="detail-dep-ver">' +
          v +
          '</span>';
        container.appendChild(row);
      }
      container.closest('section').classList.remove('hidden');
    } else container.closest('section').classList.add('hidden');
  }
  function closeDetails() {
    if (detailsPanel.classList.contains('hidden') || closeTimer) return;
    detailsPanel.classList.add('slide-out');
    closeTimer = setTimeout(() => {
      detailsPanel.classList.remove('slide-out');
      detailsPanel.classList.add('hidden');
      closeTimer = null;
    }, PANEL_ANIMATION_MS);
  }
  detailsClose.addEventListener('click', closeDetails);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetails();
  });
  detailsPanel.addEventListener('click', (e) => {
    if (e.target === detailsPanel) closeDetails();
  });
  function toggleProjectDetails(name) {
    const hidden = detailsPanel.classList.contains('hidden');
    const same = detailsTitle.dataset.project === name;
    if (!hidden && same) closeDetails();
    else showDetails(name);
  }
  window.DetailsPanel = { showDetails, closeDetails, toggleProjectDetails };
})();
