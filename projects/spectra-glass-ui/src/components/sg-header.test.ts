import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-header.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders slotted logo and nav', async () => {
  render(html`
    <sg-header>
      <span slot="logo">Logo</span>
      <a slot="nav" href="#">Link</a>
    </sg-header>
  `);
  const el = document.body.querySelector('sg-header')!;
  await waitForLit(el);
  expect(el.textContent).toContain('Logo');
  expect(el.textContent).toContain('Link');
});

test('defaults to sticky', async () => {
  render(html`<sg-header></sg-header>`);
  const el = document.body.querySelector('sg-header')!;
  await waitForLit(el);
  expect(el.getAttribute('sticky')).toBe('');
});

test('menu starts closed', async () => {
  render(html`<sg-header></sg-header>`);
  const el = document.body.querySelector('sg-header')!;
  await waitForLit(el);
  expect(el.menuOpen).toBe(false);
});

test('hamburger button toggles menuOpen', async () => {
  render(html`<sg-header></sg-header>`);
  const el = document.body.querySelector('sg-header')!;
  await waitForLit(el);

  const hamburger = el.shadowRoot?.querySelector('.hamburger') as HTMLElement;
  hamburger.click();
  await waitForLit(el);
  expect(el.menuOpen).toBe(true);

  hamburger.click();
  await waitForLit(el);
  expect(el.menuOpen).toBe(false);
});

test('nav links are mirrored into drawer body via clone', async () => {
  render(html`
    <sg-header>
      <a slot="nav" href="#features">Features</a>
      <a slot="nav" href="#showcase">Components</a>
      <a slot="nav" href="#faq">FAQ</a>
    </sg-header>
  `);
  const el = document.body.querySelector('sg-header')!;
  await waitForLit(el);

  // Clones appear immediately (populated in firstUpdated)
  const drawerBody = el.shadowRoot?.querySelector('.drawer-body')!;
  expect(drawerBody).toBeTruthy();
  expect(drawerBody.querySelectorAll('[data-nav-clone]')).toHaveLength(3);
  expect(drawerBody.textContent).toContain('Features');
  expect(drawerBody.textContent).toContain('Components');
  expect(drawerBody.textContent).toContain('FAQ');
});

test('clicking a nav clone closes the drawer', async () => {
  render(html`
    <sg-header>
      <a slot="nav" href="#features">Features</a>
    </sg-header>
  `);
  const el = document.body.querySelector('sg-header')!;
  await waitForLit(el);

  // Open
  const hamburger = el.shadowRoot?.querySelector('.hamburger') as HTMLElement;
  hamburger.click();
  await waitForLit(el);
  expect(el.menuOpen).toBe(true);

  // Click the nav clone inside the drawer
  const clone = el.shadowRoot?.querySelector('[data-nav-clone]') as HTMLElement;
  expect(clone).toBeTruthy();
  clone.click();
  await waitForLit(el);
  expect(el.menuOpen).toBe(false);
});

test('CTA items are mirrored into drawer body as clones', async () => {
  render(html`
    <sg-header>
      <a slot="nav" href="#home">Home</a>
      <sg-button slot="cta" variant="primary" size="sm">Get Started</sg-button>
      <select slot="cta" aria-label="Theme">
        <option value="default">Default</option>
        <option value="dark">Dark</option>
      </select>
    </sg-header>
  `);
  const el = document.body.querySelector('sg-header')!;
  await waitForLit(el);

  const drawerBody = el.shadowRoot?.querySelector('.drawer-body')!;
  // 1 nav link + 1 separator sg-divider + 2 CTA items = 4 data-nav-clone elements
  const clones = drawerBody.querySelectorAll('[data-nav-clone]');
  expect(clones).toHaveLength(4);
  expect(clones[0].textContent).toContain('Home');        // nav clone
  expect(clones[1].tagName).toBe('SG-DIVIDER');            // separator
  expect(clones[2].tagName).toBe('SG-BUTTON');             // button clone
  expect(clones[2].textContent).toContain('Get Started');
  expect(clones[3].tagName).toBe('SELECT');                // select clone
  expect(clones[3].querySelector('option[value="dark"]')).toBeTruthy();
});

test('clicking a CTA button clone closes the drawer', async () => {
  render(html`
    <sg-header>
      <sg-button slot="cta" variant="primary" size="sm">Get Started</sg-button>
    </sg-header>
  `);
  const el = document.body.querySelector('sg-header')!;
  await waitForLit(el);

  // Open the drawer
  const hamburger = el.shadowRoot?.querySelector('.hamburger') as HTMLElement;
  hamburger.click();
  await waitForLit(el);
  expect(el.menuOpen).toBe(true);

  // Click the button clone inside the drawer body
  const btnClone = el.shadowRoot?.querySelector('sg-button[data-nav-clone]') as HTMLElement;
  expect(btnClone).toBeTruthy();
  btnClone.click();
  await waitForLit(el);
  expect(el.menuOpen).toBe(false);
});

test('close button in drawer closes menu', async () => {
  render(html`<sg-header></sg-header>`);
  const el = document.body.querySelector('sg-header')!;
  await waitForLit(el);

  // Open
  const hamburger = el.shadowRoot?.querySelector('.hamburger') as HTMLElement;
  hamburger.click();
  await waitForLit(el);
  expect(el.menuOpen).toBe(true);

  // Close via drawer close button
  const closeBtn = el.shadowRoot?.querySelector('.drawer-header .hamburger') as HTMLElement;
  closeBtn.click();
  await waitForLit(el);
  expect(el.menuOpen).toBe(false);
});
