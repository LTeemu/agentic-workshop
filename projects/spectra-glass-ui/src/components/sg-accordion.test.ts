import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-accordion.js';

async function waitForLit(el: Element) {
  const litEl = el as any;
  if (litEl.updateComplete) await litEl.updateComplete;
}

test('renders accordion items', async () => {
  render(html`
    <sg-accordion>
      <sg-accordion-item heading="Item 1">Content 1</sg-accordion-item>
      <sg-accordion-item heading="Item 2">Content 2</sg-accordion-item>
    </sg-accordion>
  `);
  const accordion = document.body.querySelector('sg-accordion')!;
  await waitForLit(accordion);
  const items = accordion.querySelectorAll('sg-accordion-item');
  expect(items.length).toBe(2);
});

test('items default to closed', async () => {
  render(html`
    <sg-accordion>
      <sg-accordion-item heading="A">Content</sg-accordion-item>
    </sg-accordion>
  `);
  const item = document.body.querySelector('sg-accordion-item')!;
  await waitForLit(item);
  expect(item.open).toBe(false);
});

test('clicking header toggles item open', async () => {
  render(html`
    <sg-accordion>
      <sg-accordion-item heading="Toggle">Body</sg-accordion-item>
    </sg-accordion>
  `);
  const item = document.body.querySelector('sg-accordion-item')!;
  await waitForLit(item);

  const headerBtn = item.shadowRoot?.querySelector('.header') as HTMLElement;
  headerBtn.click();
  await waitForLit(item);
  expect(item.open).toBe(true);

  headerBtn.click();
  await waitForLit(item);
  expect(item.open).toBe(false);
});

test('single mode closes other items when one opens', async () => {
  render(html`
    <sg-accordion>
      <sg-accordion-item heading="A">A content</sg-accordion-item>
      <sg-accordion-item heading="B">B content</sg-accordion-item>
    </sg-accordion>
  `);
  const [itemA, itemB] = document.body.querySelectorAll('sg-accordion-item');
  await waitForLit(itemA);

  // Open A
  const btnA = itemA.shadowRoot?.querySelector('.header') as HTMLElement;
  btnA.click();
  await waitForLit(itemA);
  expect(itemA.open).toBe(true);

  // Open B — should close A
  const btnB = itemB.shadowRoot?.querySelector('.header') as HTMLElement;
  btnB.click();
  await waitForLit(itemB);
  expect(itemB.open).toBe(true);
  expect(itemA.open).toBe(false);
});

test('multiple mode allows simultaneous open items', async () => {
  render(html`
    <sg-accordion multiple>
      <sg-accordion-item heading="A">A</sg-accordion-item>
      <sg-accordion-item heading="B">B</sg-accordion-item>
    </sg-accordion>
  `);
  const [itemA, itemB] = document.body.querySelectorAll('sg-accordion-item');
  await waitForLit(itemA);

  const btnA = itemA.shadowRoot?.querySelector('.header') as HTMLElement;
  btnA.click();
  await waitForLit(itemA);

  const btnB = itemB.shadowRoot?.querySelector('.header') as HTMLElement;
  btnB.click();
  await waitForLit(itemB);

  expect(itemA.open).toBe(true);
  expect(itemB.open).toBe(true);
});
