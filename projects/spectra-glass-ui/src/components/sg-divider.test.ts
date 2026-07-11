import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-divider.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders without label', async () => {
  render(html`<sg-divider></sg-divider>`);
  const el = document.body.querySelector('sg-divider')!;
  await waitForLit(el);
  const divider = el.shadowRoot?.querySelector('.divider');
  expect(divider).toBeTruthy();
});

test('renders label text', async () => {
  render(html`<sg-divider label="Section"></sg-divider>`);
  const el = document.body.querySelector('sg-divider')!;
  await waitForLit(el);
  const label = el.shadowRoot?.querySelector('.label');
  expect(label?.textContent).toBe('Section');
});

test('defaults to gradient variant', async () => {
  render(html`<sg-divider></sg-divider>`);
  const el = document.body.querySelector('sg-divider')!;
  await waitForLit(el);
  expect(el.variant).toBe('gradient');
});

test('reflects label-position attribute', async () => {
  render(html`<sg-divider label="X" label-position="right"></sg-divider>`);
  const el = document.body.querySelector('sg-divider')!;
  await waitForLit(el);
  expect(el.getAttribute('label-position')).toBe('right');
});

test('updates label when property changes after mount', async () => {
  render(html`<sg-divider></sg-divider>`);
  const el = document.body.querySelector('sg-divider')!;
  await waitForLit(el);
  expect(el.shadowRoot?.querySelector('.label')).toBeFalsy();

  el.label = 'Updated';
  await waitForLit(el);
  const label = el.shadowRoot?.querySelector('.label');
  expect(label).toBeTruthy();
  expect(label?.textContent).toBe('Updated');
});
