/* ─── Spectra Glass Site — Entry Point ───
   Importing the library registers all custom elements. */

import 'spectra-glass-ui';

/* ─── Theme Switcher ───
   Auto-discover all sg-theme-spectra-*.css files via Vite's
   import.meta.glob — no manual imports needed when new themes
   are added to spectra-glass-ui.  The ?inline query imports the
   CSS as a string so we can inject/swap a <style> element. */

const themeModules = import.meta.glob(
  '../node_modules/spectra-glass-ui/dist/themes/sg-theme-spectra-*.css',
  { query: '?inline', eager: true, import: 'default' },
) as Record<string, string>;

/** Friendly display name from a theme key e.g. "spectra-ocean" → "Spectra Ocean". */
function displayName(key: string): string {
  return key
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Theme key → CSS content, derived automatically from file paths. */
const THEMES: Record<string, string> = {};
for (const [path, css] of Object.entries(themeModules)) {
  const match = path.match(/sg-theme-spectra-(.+)\.css$/);
  if (match) THEMES[match[1]!] = css;
}

/**
 * Display order: default first (if it exists), rest alphabetically.
 * New themes auto-slot without any code changes.
 */
const THEME_ORDER = (() => {
  const keys = Object.keys(THEMES);
  const idx = keys.indexOf('default');
  if (idx !== -1) keys.splice(idx, 1);
  keys.sort();
  if (idx !== -1) keys.unshift('default');
  return keys;
})();

const STORAGE_KEY = 'sg-site-theme';

function getSavedTheme(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in THEMES) return saved;
  } catch { /* noop */ }
  return 'spectra-default';
}

function applyTheme(name: string): void {
  let style = document.getElementById('sg-site-theme') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'sg-site-theme';
    document.head.appendChild(style);
  }
  style.textContent = THEMES[name] ?? '';
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch { /* noop */ }
}

/** Populate a <select> with options for every discovered theme. */
function populateThemeSelect(select: HTMLSelectElement, active: string): void {
  select.innerHTML = '';
  for (const key of THEME_ORDER) {
    if (!(key in THEMES)) continue;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = displayName(key);
    if (key === active) opt.selected = true;
    select.appendChild(opt);
  }
}

function initThemeSwitcher(): void {
  const saved = getSavedTheme();
  // Populate all .theme-switcher selects in light DOM
  document.querySelectorAll<HTMLSelectElement>('.theme-switcher').forEach((el) => {
    populateThemeSelect(el, saved);
  });
  // Also populate clones inside component shadow roots (document.querySelectorAll
  // doesn't penetrate shadow DOM)
  document.querySelectorAll('sg-header').forEach((header) => {
    const clone = header.shadowRoot?.querySelector<HTMLSelectElement>('select[data-nav-clone]');
    if (clone) populateThemeSelect(clone, saved);
  });
  applyTheme(saved);
}

// Use event delegation for theme changes — works on both original (light DOM)
// and cloned (shadow DOM) selects.  We use composedPath() instead of e.target
// because e.target is retargeted to the shadow host when crossing shadow boundaries.
document.addEventListener('change', (e: Event) => {
  const path = e.composedPath();
  const select = path.find((el) => (el as Element)?.matches?.('.theme-switcher')) as HTMLSelectElement | undefined;
  if (select) {
    applyTheme(select.value);
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeSwitcher);
} else {
  initThemeSwitcher();
}
