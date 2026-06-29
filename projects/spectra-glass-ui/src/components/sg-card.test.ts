import { render } from 'vitest-browser-lit';
import { html } from 'lit';
import { expect, test } from 'vitest';
import './sg-card.js';

test('renders with default properties', async () => {
  const screen = render(html`<sg-card>Hello</sg-card>`);

  await expect.element(screen.getByText('Hello')).toBeVisible();
});

test('renders slotted header content', async () => {
  const screen = render(html`
    <sg-card>
      <span slot="header">Header Text</span>
      Body
    </sg-card>
  `);

  await expect.element(screen.getByText('Header Text')).toBeVisible();
  await expect.element(screen.getByText('Body')).toBeVisible();
});

test('renders slotted footer content', async () => {
  const screen = render(html`
    <sg-card>
      Body
      <span slot="footer">Footer Text</span>
    </sg-card>
  `);

  await expect.element(screen.getByText('Footer Text')).toBeVisible();
  await expect.element(screen.getByText('Body')).toBeVisible();
});

test('renders full composition with header, body, and footer', async () => {
  const screen = render(html`
    <sg-card>
      <span slot="header">Title</span>
      Main content
      <span slot="footer">Actions</span>
    </sg-card>
  `);

  await expect.element(screen.getByText('Title')).toBeVisible();
  await expect.element(screen.getByText('Main content')).toBeVisible();
  await expect.element(screen.getByText('Actions')).toBeVisible();
});

test('adds variant attribute to host', async () => {
  render(html`<sg-card variant="outlined">Test</sg-card>`);

  const card = document.body.querySelector('sg-card');
  expect(card?.getAttribute('variant')).toBe('outlined');
});

test('adds padding attribute', async () => {
  render(html`<sg-card padding="lg">Test</sg-card>`);

  const card = document.body.querySelector('sg-card');
  expect(card?.getAttribute('padding')).toBe('lg');
});

test('reflects accent property as attribute', async () => {
  render(html`<sg-card accent>Test</sg-card>`);

  const card = document.body.querySelector('sg-card');
  expect(card?.hasAttribute('accent')).toBe(true);
});

test('defaults to elevated variant and md padding', async () => {
  render(html`<sg-card>Test</sg-card>`);

  const card = document.body.querySelector('sg-card');
  await expect.element(card!).toBeVisible();

  expect(card?.getAttribute('variant')).toBe('elevated');
  expect(card?.getAttribute('padding')).toBe('md');
});

test('reflects selected property as attribute', async () => {
  render(html`<sg-card selected>Test</sg-card>`);

  const card = document.body.querySelector('sg-card');
  expect(card?.hasAttribute('selected')).toBe(true);
});

test('selected defaults to false', async () => {
  render(html`<sg-card>Test</sg-card>`);

  const card = document.body.querySelector('sg-card');
  expect(card?.hasAttribute('selected')).toBe(false);
});

test('is focusable by default', async () => {
  render(html`<sg-card>Test</sg-card>`);

  const card = document.body.querySelector('sg-card');
  expect(card?.tabIndex).toBe(0);
});
