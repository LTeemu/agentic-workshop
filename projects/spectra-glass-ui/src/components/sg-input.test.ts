import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-input.js';

/** Helper: wait for Lit element to finish its update. */
async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders with placeholder', async () => {
  const screen = render(html`<sg-input placeholder="Enter text"></sg-input>`);
  const el = document.body.querySelector('sg-input')!;
  await waitForLit(el);
  const input = el.shadowRoot?.querySelector('input');
  expect(input?.getAttribute('placeholder')).toBe('Enter text');
});

test('renders label when provided', async () => {
  const screen = render(html`<sg-input label="Name"></sg-input>`);
  await expect.element(screen.getByText('Name')).toBeVisible();
});

test('reflects value changes on input', async () => {
  render(html`<sg-input></sg-input>`);
  const el = document.body.querySelector('sg-input')! as any;
  await waitForLit(el);
  const input = el.shadowRoot?.querySelector('input')!;
  input.value = 'hello';
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  await waitForLit(el);
  expect(el.value).toBe('hello');
});

test('shows error message when error prop set', async () => {
  const screen = render(html`<sg-input error="Required field"></sg-input>`);
  await expect.element(screen.getByText('Required field')).toBeVisible();
});

test('sets aria-invalid when error present', async () => {
  render(html`<sg-input error="Invalid"></sg-input>`);
  const el = document.body.querySelector('sg-input')!;
  await waitForLit(el);
  const input = el.shadowRoot?.querySelector('input');
  expect(input?.getAttribute('aria-invalid')).toBe('true');
});

test('disables input when disabled', async () => {
  render(html`<sg-input disabled></sg-input>`);
  const el = document.body.querySelector('sg-input')!;
  await waitForLit(el);
  const input = el.shadowRoot?.querySelector('input');
  expect(input?.disabled).toBe(true);
});

test('defaults to outlined variant', async () => {
  render(html`<sg-input></sg-input>`);
  const el = document.body.querySelector('sg-input')!;
  await waitForLit(el);
  expect(el.getAttribute('variant')).toBe('outlined');
});
