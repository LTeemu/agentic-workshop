/* ─── Spectra Glass Site — Entry Point ───
   Importing the library registers all custom elements.
   All component property initialization and event wiring runs here
   (after components are upgraded) so the body can fade in fully ready. */

import 'spectra-glass-ui';

// ═══════════════════════════════════════════════════════════════════════════
// Property initialization — runs after components are upgraded by Lit,
// so .options, .tabs, .items etc. go through @property setters correctly.
// ═══════════════════════════════════════════════════════════════════════════

// ── Select options ──
const demoSelect = document.getElementById('demo-select') as any;
if (demoSelect) {
  demoSelect.options = [
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
    { value: 'svelte', label: 'Svelte' },
    { value: 'lit', label: 'Lit' },
  ];
}

const demoSelectMulti = document.getElementById('demo-select-multi') as any;
if (demoSelectMulti) {
  demoSelectMulti.options = [
    { value: 'ts', label: 'TypeScript' },
    { value: 'js', label: 'JavaScript' },
    { value: 'py', label: 'Python' },
    { value: 'rs', label: 'Rust' },
  ];
}

const demoSelectAccent = document.getElementById('demo-select-accent') as any;
if (demoSelectAccent) {
  demoSelectAccent.options = [
    { value: 'opt1', label: 'Option One' },
    { value: 'opt2', label: 'Option Two' },
    { value: 'opt3', label: 'Option Three' },
  ];
}

// ── Tabs ──
const demoTabs = document.getElementById('demo-tabs') as any;
if (demoTabs) {
  demoTabs.tabs = [
    { id: 'preview', label: 'Preview' },
    { id: 'code', label: 'Code' },
    { id: 'settings', label: 'Settings', disabled: true },
  ];
}

// ── Breadcrumbs ──
const demoBreadcrumb1 = document.getElementById('demo-breadcrumb-1') as any;
if (demoBreadcrumb1) {
  demoBreadcrumb1.items = [
    { label: 'Home', href: '#' },
    { label: 'Products', href: '#' },
    { label: 'Category', href: '#' },
    { label: 'Item' },
  ];
}

const demoBreadcrumb2 = document.getElementById('demo-breadcrumb-2') as any;
if (demoBreadcrumb2) {
  demoBreadcrumb2.items = [
    { label: 'Dashboard', href: '#' },
    { label: 'Settings' },
  ];
}

const demoBreadcrumb3 = document.getElementById('demo-breadcrumb-3') as any;
if (demoBreadcrumb3) {
  demoBreadcrumb3.items = [
    { label: 'Docs', href: '#' },
    { label: 'API', href: '#' },
    { label: 'Reference' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// Event wiring
// ═══════════════════════════════════════════════════════════════════════════

// ── Smooth scroll CTA (delegation — works on originals and drawer clones) ──
document.addEventListener('click', (e: Event) => {
  const path = e.composedPath();
  if (
    path.some((el) => (el as Element)?.id === 'header-cta') ||
    path.some((el) => (el as Element)?.id === 'hero-cta')
  ) {
    document.getElementById('showcase')?.scrollIntoView({ behavior: 'smooth' });
  }
});

// ── Dialog ──
const demoDialog = document.getElementById('demo-dialog') as any;
const openBtn = document.getElementById('open-dialog-btn');
const closeBtn = document.getElementById('close-dialog-btn');

if (demoDialog && openBtn && closeBtn) {
  openBtn.addEventListener('click', () => {
    demoDialog.open = true;
  });
  const closeDialog = () => {
    demoDialog.open = false;
  };
  closeBtn.addEventListener('click', closeDialog);
  // Confirm button also closes the dialog
  const confirmBtn = demoDialog.querySelector('[slot="footer"] sg-button:last-child');
  if (confirmBtn) confirmBtn.addEventListener('click', closeDialog);
}

// ── Toast demo ──
const toastContainer = document.getElementById('demo-toast-container') as any;
const infoBtn = document.getElementById('toast-info-btn');
const successBtn = document.getElementById('toast-success-btn');
const warningBtn = document.getElementById('toast-warning-btn');
const errorBtn = document.getElementById('toast-error-btn');

function showToast(variant: string, message: string) {
  if (!toastContainer) return;
  const toast = document.createElement('sg-toast') as any;
  toast.variant = variant;
  toast.duration = 3000;
  toast.dismissible = true;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  requestAnimationFrame(() => {
    toast.open = true;
  });
}

infoBtn?.addEventListener('click', () => showToast('info', 'This is an informational message.'));
successBtn?.addEventListener('click', () => showToast('success', 'Operation completed successfully!'));
warningBtn?.addEventListener('click', () => showToast('warning', 'Please review your input before continuing.'));
errorBtn?.addEventListener('click', () => showToast('error', 'Something went wrong. Please try again.'));

// ═══════════════════════════════════════════════════════════════════════════
// Theme Switcher
// ═══════════════════════════════════════════════════════════════════════════

const themeModules = import.meta.glob(
  '../node_modules/spectra-glass-ui/dist/themes/sg-theme-spectra-*.css',
  { query: '?inline', eager: true, import: 'default' },
) as Record<string, string>;

/** Friendly display name from a theme key e.g. "spectra-ocean" → "Spectra Ocean". */
function displayName(key: string): string {
  return key
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
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
  } catch {
    /* noop */
  }
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
  } catch {
    /* noop */
  }
  // Sync selection on all theme switcher selects (light DOM and shadow DOM clones)
  document.querySelectorAll<HTMLSelectElement>('.theme-switcher').forEach((el) => {
    el.value = name;
  });
  document.querySelectorAll('sg-header').forEach((header) => {
    const clone = header.shadowRoot?.querySelector<HTMLSelectElement>('select[data-nav-clone]');
    if (clone) clone.value = name;
  });
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
// and cloned (shadow DOM) selects.
document.addEventListener('change', (e: Event) => {
  const path = e.composedPath();
  const select = path.find(
    (el) => (el as Element)?.matches?.('.theme-switcher'),
  ) as HTMLSelectElement | undefined;
  if (select) {
    applyTheme(select.value);
  }
});

initThemeSwitcher();

// ═══════════════════════════════════════════════════════════════════════════
// Reveal body — components are upgraded, properties are set, theme is applied.
// ═══════════════════════════════════════════════════════════════════════════

document.body.classList.add('ready');
