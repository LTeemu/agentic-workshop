/* ─── Spectra Glass Site — Entry Point ───
   Importing the library registers all custom elements. */

import 'spectra-glass-ui';

/* ─── Theme Switcher ───
   Import theme CSS as strings via Vite's ?inline query — the content
   is embedded at build time without being injected into the page.
   We inject/swap a <style id="sg-site-theme"> element on change. */

import defaultThemeCSS from 'spectra-glass-ui/themes/sg-theme-spectra-default.css?inline';
import darkThemeCSS from 'spectra-glass-ui/themes/sg-theme-spectra-dark.css?inline';

const THEMES: Record<string, string> = {
  'spectra-default': defaultThemeCSS,
  'spectra-dark': darkThemeCSS,
};

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
  style.textContent = THEMES[name] || '';
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch { /* noop */ }
}

function initThemeSwitcher(): void {
  const saved = getSavedTheme();
  // Set value on all .theme-switcher selects in light DOM
  document.querySelectorAll<HTMLSelectElement>('.theme-switcher').forEach((el) => {
    el.value = saved;
  });
  // Also update clones inside component shadow roots (document.querySelectorAll
  // doesn't penetrate shadow DOM)
  document.querySelectorAll('sg-header').forEach((header) => {
    const clone = header.shadowRoot?.querySelector<HTMLSelectElement>('select[data-nav-clone]');
    if (clone) clone.value = saved;
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
