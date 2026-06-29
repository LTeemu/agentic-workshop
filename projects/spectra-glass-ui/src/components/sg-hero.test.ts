import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-hero.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders slotted heading and subtitle', async () => {
  render(html`
    <sg-hero>
      <h1 slot="heading">Hero Title</h1>
      <p slot="subtitle">Hero subtitle text</p>
    </sg-hero>
  `);
  const el = document.body.querySelector('sg-hero')!;
  await waitForLit(el);
  expect(el.textContent).toContain('Hero Title');
  expect(el.textContent).toContain('Hero subtitle text');
});

test('defaults to center alignment', async () => {
  render(html`<sg-hero></sg-hero>`);
  const el = document.body.querySelector('sg-hero')!;
  await waitForLit(el);
  expect(el.align).toBe('center');
});

test('shows overlay by default', async () => {
  render(html`<sg-hero></sg-hero>`);
  const el = document.body.querySelector('sg-hero')!;
  await waitForLit(el);
  const overlay = el.shadowRoot?.querySelector('.overlay');
  expect(overlay).toBeTruthy();
});

test('hides overlay when overlay is false', async () => {
  render(html`<sg-hero></sg-hero>`);
  const el = document.body.querySelector('sg-hero')!;
  el.overlay = false;
  await waitForLit(el);
  const overlay = el.shadowRoot?.querySelector('.overlay');
  expect(overlay).toBeFalsy();
});
