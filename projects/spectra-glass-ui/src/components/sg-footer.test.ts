import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-footer.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders slotted columns', async () => {
  render(html`
    <sg-footer>
      <h4 slot="column-1">Product</h4>
      <a slot="column-1" href="#">Features</a>
      <h4 slot="column-2">Company</h4>
      <a slot="column-2" href="#">About</a>
    </sg-footer>
  `);
  const el = document.body.querySelector('sg-footer')!;
  await waitForLit(el);
  expect(el.textContent).toContain('Product');
  expect(el.textContent).toContain('Company');
  expect(el.textContent).toContain('Features');
  expect(el.textContent).toContain('About');
});

test('defaults to 4 columns', async () => {
  render(html`<sg-footer></sg-footer>`);
  const el = document.body.querySelector('sg-footer')!;
  await waitForLit(el);
  expect(el.columns).toBe(4);
});

test('renders copyright slot', async () => {
  render(html`
    <sg-footer>
      <span slot="copyright">&copy; 2026</span>
    </sg-footer>
  `);
  const el = document.body.querySelector('sg-footer')!;
  await waitForLit(el);
  expect(el.textContent).toContain('©');
});

test('renders social slot', async () => {
  render(html`
    <sg-footer>
      <a slot="social" href="#">Twitter</a>
    </sg-footer>
  `);
  const el = document.body.querySelector('sg-footer')!;
  await waitForLit(el);
  expect(el.textContent).toContain('Twitter');
});
