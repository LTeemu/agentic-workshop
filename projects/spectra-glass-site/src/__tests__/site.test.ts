import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Mount the real page body so main.ts initializes the actual demo components
// (selects, breadcrumbs, dialog, theme switcher) instead of skipping them.
const pageBody = readFileSync(resolve(__dirname, '../../index.html'), 'utf8').match(
  /<body>([\s\S]*)<\/body>/,
)![1];

describe('Spectra Glass site', () => {
  it('loads the UI and marks the page ready', async () => {
    document.body.innerHTML = pageBody;
    await import('../main');

    // The site's own "done" signal — index.html only fades the page in when
    // body.ready is set after all components are initialized.
    expect(document.body.classList.contains('ready')).toBe(true);

    // The library import registered the components the page uses.
    expect(customElements.get('sg-button')).toBeDefined();
    expect(customElements.get('sg-dialog')).toBeDefined();

    // Theme discovery ran: the switcher is populated with real theme files.
    const switcher = document.querySelector<HTMLSelectElement>('#theme-switcher');
    expect(switcher?.options.length).toBeGreaterThan(0);
  });
});
