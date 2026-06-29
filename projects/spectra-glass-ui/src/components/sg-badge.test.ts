import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-badge.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders slotted content', async () => {
  const screen = render(html`<sg-badge>New</sg-badge>`);
  await expect.element(screen.getByText('New')).toBeVisible();
});

test('defaults to default variant and md size', async () => {
  render(html`<sg-badge>Tag</sg-badge>`);
  const badge = document.body.querySelector('sg-badge')!;
  await waitForLit(badge);
  expect(badge.getAttribute('variant')).toBe('default');
  expect(badge.getAttribute('size')).toBe('md');
});

test('reflects variant attribute', async () => {
  render(html`<sg-badge variant="success">Ok</sg-badge>`);
  const badge = document.body.querySelector('sg-badge')!;
  await waitForLit(badge);
  expect(badge.getAttribute('variant')).toBe('success');
});

test('shows dismiss button when removable', async () => {
  render(html`<sg-badge removable>Dismiss me</sg-badge>`);
  const badge = document.body.querySelector('sg-badge')!;
  await waitForLit(badge);
  const dismissBtn = badge.shadowRoot?.querySelector('.badge__dismiss');
  expect(dismissBtn).toBeTruthy();
});

test('fires dismiss event when removable button clicked', async () => {
  let fired = false;
  render(html`
    <sg-badge removable @dismiss=${() => { fired = true; }}>X</sg-badge>
  `);
  const badge = document.body.querySelector('sg-badge')!;
  await waitForLit(badge);
  const dismissBtn = badge.shadowRoot?.querySelector('.badge__dismiss') as HTMLElement | null;
  dismissBtn?.click();
  expect(fired).toBe(true);
});
