import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-toggle.js';

/** Helper: wait for Lit element to finish its first update. */
async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders with label', async () => {
  const screen = render(html`<sg-toggle label="Dark mode"></sg-toggle>`);
  await expect.element(screen.getByText('Dark mode')).toBeVisible();
});

test('defaults to unchecked', async () => {
  render(html`<sg-toggle label="Test"></sg-toggle>`);
  const el = document.body.querySelector('sg-toggle')!;
  await waitForLit(el);
  expect(el.checked).toBe(false);
});

test('reflects checked attribute', async () => {
  render(html`<sg-toggle checked label="On"></sg-toggle>`);
  const el = document.body.querySelector('sg-toggle')!;
  await waitForLit(el);
  expect(el.hasAttribute('checked')).toBe(true);
});

test('toggles on click', async () => {
  render(html`<sg-toggle label="Toggle"></sg-toggle>`);
  const el = document.body.querySelector('sg-toggle')!;
  await waitForLit(el);
  const track = el.shadowRoot?.querySelector('.track') as HTMLElement;
  track.click();
  expect(el.checked).toBe(true);
  track.click();
  expect(el.checked).toBe(false);
});

test('fires change event with detail', async () => {
  let detail: any = null;
  render(html`
    <sg-toggle
      label="Test"
      @change=${(e: CustomEvent) => { detail = e.detail; }}
    ></sg-toggle>
  `);
  const el = document.body.querySelector('sg-toggle')!;
  await waitForLit(el);
  const track = el.shadowRoot?.querySelector('.track') as HTMLElement;
  track.click();
  expect(detail).toEqual({ checked: true });
});

test('does not toggle when disabled', async () => {
  render(html`<sg-toggle disabled label="Off"></sg-toggle>`);
  const el = document.body.querySelector('sg-toggle')!;
  await waitForLit(el);
  const track = el.shadowRoot?.querySelector('.track') as HTMLElement;
  track.click();
  expect(el.checked).toBe(false);
});

test('toggles on Enter key', async () => {
  render(html`<sg-toggle label="Test"></sg-toggle>`);
  const el = document.body.querySelector('sg-toggle')!;
  await waitForLit(el);
  const track = el.shadowRoot?.querySelector('.track') as HTMLElement;
  track.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(el.checked).toBe(true);
});

test('toggles on Space key', async () => {
  render(html`<sg-toggle label="Test"></sg-toggle>`);
  const el = document.body.querySelector('sg-toggle')!;
  await waitForLit(el);
  const track = el.shadowRoot?.querySelector('.track') as HTMLElement;
  track.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
  expect(el.checked).toBe(true);
});
