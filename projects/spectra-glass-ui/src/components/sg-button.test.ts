import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-button.js';
import './sg-spinner.js';

/** Helper: wait for Lit element to finish its first update. */
async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders slotted content', async () => {
  const screen = render(html`<sg-button>Click me</sg-button>`);
  await expect.element(screen.getByText('Click me')).toBeVisible();
});

test('defaults to primary variant', async () => {
  render(html`<sg-button>Btn</sg-button>`);
  await waitForLit(document.body.querySelector('sg-button')!);
  const btn = document.body.querySelector('sg-button');
  expect(btn?.getAttribute('variant')).toBe('primary');
});

test('reflects variant attribute', async () => {
  render(html`<sg-button variant="secondary">Btn</sg-button>`);
  await waitForLit(document.body.querySelector('sg-button')!);
  const btn = document.body.querySelector('sg-button');
  expect(btn?.getAttribute('variant')).toBe('secondary');
});

test('reflects size attribute', async () => {
  render(html`<sg-button size="lg">Btn</sg-button>`);
  await waitForLit(document.body.querySelector('sg-button')!);
  const btn = document.body.querySelector('sg-button');
  expect(btn?.getAttribute('size')).toBe('lg');
});

test('disables the native button when disabled', async () => {
  render(html`<sg-button disabled>Btn</sg-button>`);
  await waitForLit(document.body.querySelector('sg-button')!);
  const btn = document.body.querySelector('sg-button');
  const nativeBtn = btn?.shadowRoot?.querySelector('button');
  expect(nativeBtn?.disabled).toBe(true);
});

test('shows spinner when loading', async () => {
  render(html`<sg-button loading>Btn</sg-button>`);
  await waitForLit(document.body.querySelector('sg-button')!);
  const btn = document.body.querySelector('sg-button');
  const spinner = btn?.shadowRoot?.querySelector('sg-spinner');
  expect(spinner).toBeTruthy();
});

test('disables native button when loading', async () => {
  render(html`<sg-button loading>Btn</sg-button>`);
  await waitForLit(document.body.querySelector('sg-button')!);
  const btn = document.body.querySelector('sg-button');
  const nativeBtn = btn?.shadowRoot?.querySelector('button');
  expect(nativeBtn?.disabled).toBe(true);
});

test('sets aria-busy when loading', async () => {
  render(html`<sg-button loading>Btn</sg-button>`);
  await waitForLit(document.body.querySelector('sg-button')!);
  const btn = document.body.querySelector('sg-button');
  const nativeBtn = btn?.shadowRoot?.querySelector('button');
  expect(nativeBtn?.getAttribute('aria-busy')).toBe('true');
});
