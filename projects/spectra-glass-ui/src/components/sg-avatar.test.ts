import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-avatar.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders initials when no src', async () => {
  render(html`<sg-avatar initials="JD"></sg-avatar>`);
  const el = document.body.querySelector('sg-avatar')!;
  await waitForLit(el);
  const span = el.shadowRoot?.querySelector('.avatar span');
  expect(span?.textContent).toBe('JD');
});

test('renders an img element when src is provided', async () => {
  render(html`<sg-avatar src="https://example.com/photo.jpg" alt="User"></sg-avatar>`);
  const el = document.body.querySelector('sg-avatar')!;
  await waitForLit(el);
  const img = el.shadowRoot?.querySelector('img');
  expect(img).toBeTruthy();
  expect(img?.getAttribute('alt')).toBe('User');
});

test('falls back to initials on image error', async () => {
  render(html`<sg-avatar src="bad-url.jpg" initials="AB"></sg-avatar>`);
  const el = document.body.querySelector('sg-avatar')!;
  await waitForLit(el);

  // Trigger image error
  const img = el.shadowRoot?.querySelector('img')!;
  img.dispatchEvent(new Event('error'));

  await waitForLit(el);
  const span = el.shadowRoot?.querySelector('.avatar span');
  expect(span?.textContent).toBe('AB');
});

test('reflects size attribute', async () => {
  render(html`<sg-avatar size="xl"></sg-avatar>`);
  const el = document.body.querySelector('sg-avatar')!;
  await waitForLit(el);
  expect(el.getAttribute('size')).toBe('xl');
});

test('shows status dot when status is set', async () => {
  render(html`<sg-avatar status="online"></sg-avatar>`);
  const el = document.body.querySelector('sg-avatar')!;
  await waitForLit(el);
  const dot = el.shadowRoot?.querySelector('.status');
  expect(dot).toBeTruthy();
});

test('hides status dot when status is empty', async () => {
  render(html`<sg-avatar></sg-avatar>`);
  const el = document.body.querySelector('sg-avatar')!;
  await waitForLit(el);
  const dot = el.shadowRoot?.querySelector('.status');
  expect(dot).toBeFalsy();
});
