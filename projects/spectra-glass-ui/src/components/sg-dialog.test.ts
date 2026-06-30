import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-dialog.js';

/** Helper: wait for Lit element to finish its update. */
async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

/** Helper: wait for portal to appear in document.body. */
async function waitForPortal() {
  await new Promise(r => requestAnimationFrame(r));
}

test('is hidden by default', async () => {
  render(html`<sg-dialog title="Test">Content</sg-dialog>`);
  const el = document.body.querySelector('sg-dialog')!;
  await waitForLit(el);
  expect(el.open).toBe(false);
});

test('shows when open attribute set', async () => {
  render(html`<sg-dialog open title="Test">Content</sg-dialog>`);
  const el = document.body.querySelector('sg-dialog')!;
  await waitForLit(el);
  expect(el.open).toBe(true);
});

test('renders title', async () => {
  render(html`<sg-dialog open title="My Dialog">Body</sg-dialog>`);
  await waitForLit(document.body.querySelector('sg-dialog')!);
  await waitForPortal();
  const titleEl = document.body.querySelector('.header__title');
  expect(titleEl?.textContent).toContain('My Dialog');
});

test('renders body content', async () => {
  render(html`<sg-dialog open title="Test">Hello world</sg-dialog>`);
  await waitForLit(document.body.querySelector('sg-dialog')!);
  await waitForPortal();
  const bodyEl = document.body.querySelector('.body');
  expect(bodyEl?.textContent).toContain('Hello world');
});

test('shows close button when closable', async () => {
  render(html`<sg-dialog open title="Test" closable>Body</sg-dialog>`);
  const el = document.body.querySelector('sg-dialog')!;
  await waitForLit(el);
  await waitForPortal();
  const closeBtn = document.body.querySelector('.header__close');
  expect(closeBtn).toBeTruthy();
});

test('hides close button when not closable', async () => {
  render(html`<sg-dialog open title="Test" .closable=${false}>Body</sg-dialog>`);
  const el = document.body.querySelector('sg-dialog')!;
  await waitForLit(el);
  await waitForPortal();
  const closeBtn = document.body.querySelector('.header__close');
  expect(closeBtn).toBeNull();
});

test('closes on close button click', async () => {
  render(html`<sg-dialog open title="Test" closable>Body</sg-dialog>`);
  const el = document.body.querySelector('sg-dialog')!;
  await waitForLit(el);
  await waitForPortal();
  const closeBtn = document.body.querySelector('.header__close') as HTMLElement;
  closeBtn.click();
  expect(el.open).toBe(false);
});

test('closes on backdrop click when backdropDismiss is true', async () => {
  render(html`<sg-dialog open title="Test" backdrop-dismiss>Body</sg-dialog>`);
  const el = document.body.querySelector('sg-dialog')!;
  await waitForLit(el);
  await waitForPortal();
  const backdrop = document.body.querySelector('.backdrop') as HTMLElement;
  backdrop.click();
  expect(el.open).toBe(false);
});

test('does not close on backdrop click when backdropDismiss is false', async () => {
  render(html`<sg-dialog open title="Test" .backdropDismiss=${false}>Body</sg-dialog>`);
  const el = document.body.querySelector('sg-dialog')!;
  await waitForLit(el);
  await waitForPortal();
  const backdrop = document.body.querySelector('.backdrop') as HTMLElement;
  backdrop.click();
  expect(el.open).toBe(true);
});

test('fires close event on dismiss', async () => {
  let fired = false;
  render(html`
    <sg-dialog open title="Test" @close=${() => { fired = true; }}>Body</sg-dialog>
  `);
  const el = document.body.querySelector('sg-dialog')!;
  await waitForLit(el);
  await waitForPortal();
  const closeBtn = document.body.querySelector('.header__close') as HTMLElement;
  closeBtn.click();
  expect(fired).toBe(true);
});

test('closes on Escape key', async () => {
  render(html`<sg-dialog open title="Test">Body</sg-dialog>`);
  const el = document.body.querySelector('sg-dialog')!;
  await waitForLit(el);
  await waitForPortal();
  const backdrop = document.body.querySelector('.backdrop') as HTMLElement;
  backdrop.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  expect(el.open).toBe(false);
});

test('renders footer slot content', async () => {
  render(html`
    <sg-dialog open title="Test">
      Body
      <span slot="footer">Actions</span>
    </sg-dialog>
  `);
  await waitForLit(document.body.querySelector('sg-dialog')!);
  await waitForPortal();
  const footerEl = document.body.querySelector('.footer');
  expect(footerEl?.textContent).toContain('Actions');
});
