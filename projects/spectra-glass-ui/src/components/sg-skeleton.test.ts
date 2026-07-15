import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-skeleton.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders rect variant with explicit dimensions', async () => {
  render(html`<sg-skeleton variant="rect" width="200px" height="120px"></sg-skeleton>`);
  const el = document.body.querySelector('sg-skeleton')!;
  await waitForLit(el);

  const rect = el.shadowRoot?.querySelector('.skeleton--rect') as HTMLElement | null;
  expect(rect).toBeTruthy();
  expect(rect?.style.width).toBe('200px');
  expect(rect?.style.height).toBe('120px');
});

test('renders rect variant with CSS fallback dimensions when no width/height given', async () => {
  render(html`<sg-skeleton variant="rect"></sg-skeleton>`);
  const el = document.body.querySelector('sg-skeleton')!;
  await waitForLit(el);

  const rect = el.shadowRoot?.querySelector('.skeleton--rect') as HTMLElement | null;
  expect(rect).toBeTruthy();
  // No inline style since no width/height attributes were set
  expect(rect?.style.width).toBe('');
  expect(rect?.style.height).toBe('');
  // CSS fallback should give it a visible size
  const style = getComputedStyle(rect!);
  expect(style.height).toBe('120px');
});
