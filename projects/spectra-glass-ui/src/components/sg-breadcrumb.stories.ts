import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-breadcrumb.js';

const meta: Meta = {
  title: 'Components/SgBreadcrumb',
  component: 'sg-breadcrumb',
  argTypes: {
    items: { control: 'object' },
    separator: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component: 'A breadcrumb navigation trail with configurable separator.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-breadcrumb
      .items=${args.items}
      separator=${args.separator || '/'}
    ></sg-breadcrumb>
  `,
  args: {
    items: [
      { label: 'Home' },
      { label: 'Products' },
      { label: 'Category' },
      { label: 'Item' },
    ],
    separator: '/',
  },
};

export const WithLinks: Story = {
  render: (args) => html`
    <sg-breadcrumb
      .items=${args.items}
      separator=${args.separator || '/'}
    ></sg-breadcrumb>
  `,
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Documentation', href: '/docs' },
      { label: 'Components', href: '/docs/components' },
      { label: 'Breadcrumb' },
    ],
    separator: '/',
  },
};

export const Short: Story = {
  render: (args) => html`
    <sg-breadcrumb
      .items=${args.items}
      separator=${args.separator || '/'}
    ></sg-breadcrumb>
  `,
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Current Page' },
    ],
    separator: '/',
  },
};

export const Long: Story = {
  render: (args) => html`
    <sg-breadcrumb
      .items=${args.items}
      separator=${args.separator || '/'}
    ></sg-breadcrumb>
  `,
  args: {
    items: [
      { label: 'Home', href: '/' },
      { label: 'Library', href: '/library' },
      { label: 'Components', href: '/library/components' },
      { label: 'Navigation' },
      { label: 'Breadcrumb' },
      { label: 'Examples' },
    ],
    separator: '/',
  },
};
