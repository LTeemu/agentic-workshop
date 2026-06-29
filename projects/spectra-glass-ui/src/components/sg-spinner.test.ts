import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-spinner.js';

/** Helper: wait for Lit element to finish its first update. */
async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders with aria-label', async () => {
  const screen = render(html`<sg-spinner></sg-spinner>`);
  const el = document.body.querySelector('sg-spinner')!;
  await waitForLit(el);
  const spinner = el.shadowRoot?.querySelector('[role="status"]');
  expect(spinner?.getAttribute('aria-label')).toBe('Loading');
});

test('defaults to md size and spectral variant', async () => {
  render(html`<sg-spinner></sg-spinner>`);
  const el = document.body.querySelector('sg-spinner')!;
  await waitForLit(el);
  expect(el.getAttribute('size')).toBe('md');
  expect(el.getAttribute('variant')).toBe('spectral');
});

test('reflects size attribute', async () => {
  render(html`<sg-spinner size="lg"></sg-spinner>`);
  const el = document.body.querySelector('sg-spinner')!;
  await waitForLit(el);
  expect(el.getAttribute('size')).toBe('lg');
});

test('reflects variant attribute', async () => {
  render(html`<sg-spinner variant="glass"></sg-spinner>`);
  const el = document.body.querySelector('sg-spinner')!;
  await waitForLit(el);
  expect(el.getAttribute('variant')).toBe('glass');
});
