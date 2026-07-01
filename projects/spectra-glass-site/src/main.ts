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
  const switcher = document.getElementById('theme-switcher') as HTMLSelectElement | null;
  if (switcher) {
    switcher.value = saved;
    switcher.addEventListener('change', () => applyTheme(switcher.value));
  }
  applyTheme(saved);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeSwitcher);
} else {
  initThemeSwitcher();
}
