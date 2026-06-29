import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-section.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders slotted content', async () => {
  render(html`<sg-section><p>Content</p></sg-section>`);
  const el = document.body.querySelector('sg-section')!;
  await waitForLit(el);
  expect(el.textContent).toContain('Content');
});

test('renders as section tag by default', async () => {
  render(html`<sg-section></sg-section>`);
  const el = document.body.querySelector('sg-section')!;
  await waitForLit(el);
  const section = el.shadowRoot?.querySelector('section');
  expect(section).toBeTruthy();
});

test('accepts custom tag', async () => {
  render(html`<sg-section tag="div"></sg-section>`);
  const el = document.body.querySelector('sg-section')!;
  await waitForLit(el);
  const div = el.shadowRoot?.querySelector('div.section');
  expect(div?.tagName).toBe('DIV');
});

test('defaults to large padding', async () => {
  render(html`<sg-section></sg-section>`);
  const el = document.body.querySelector('sg-section')!;
  await waitForLit(el);
  expect(el.padding).toBe('lg');
});

test('applies glass class when glass is true', async () => {
  render(html`<sg-section glass></sg-section>`);
  const el = document.body.querySelector('sg-section')!;
  await waitForLit(el);
  const section = el.shadowRoot?.querySelector('.section');
  expect(section?.classList.contains('section--glass')).toBe(true);
});

test('applies accent class for top accent', async () => {
  render(html`<sg-section accent="top"></sg-section>`);
  const el = document.body.querySelector('sg-section')!;
  await waitForLit(el);
  const section = el.shadowRoot?.querySelector('.section');
  expect(section?.classList.contains('section--accent-top')).toBe(true);
});
