import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-icon.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders a named icon', async () => {
  render(html`<sg-icon name="menu"></sg-icon>`);
  const icon = document.body.querySelector('sg-icon')!;
  await waitForLit(icon);
  const svg = icon.shadowRoot?.querySelector('svg');
  expect(svg).toBeTruthy();
});

test('renders slotted SVG when no name is given', async () => {
  render(html`
    <sg-icon>
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
    </sg-icon>
  `);
  const icon = document.body.querySelector('sg-icon')!;
  await waitForLit(icon);
  const assignedSlot = icon.shadowRoot?.querySelector('slot');
  expect(assignedSlot).toBeTruthy();
});

test('reflects size attribute', async () => {
  render(html`<sg-icon name="check" size="lg"></sg-icon>`);
  const icon = document.body.querySelector('sg-icon')!;
  await waitForLit(icon);
  expect(icon.getAttribute('size')).toBe('lg');
});

test('renders nothing when name is unknown', async () => {
  render(html`<sg-icon name="nonexistent"></sg-icon>`);
  const icon = document.body.querySelector('sg-icon')!;
  await waitForLit(icon);
  // No SVG should render for unknown names
  const svg = icon.shadowRoot?.querySelector('svg');
  expect(svg).toBeFalsy();
});
