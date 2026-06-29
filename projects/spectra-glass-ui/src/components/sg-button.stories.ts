import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-button.js';
import './sg-spinner.js';

const meta: Meta = {
  title: 'Components/SgButton',
  component: 'sg-button',
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A glassmorphic button with spectral gradient background (primary), glass surface (secondary), or minimal style (ghost).',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Primary: Story = {
  render: (args) => html`
    <sg-button
      variant=${args.variant || 'primary'}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      ?loading=${args.loading}
    >
      Button
    </sg-button>
  `,
  args: { variant: 'primary', size: 'md', disabled: false, loading: false },
};

export const Secondary: Story = {
  render: (args) => html`
    <sg-button
      variant=${args.variant || 'secondary'}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      ?loading=${args.loading}
    >
      Button
    </sg-button>
  `,
  args: { variant: 'secondary', size: 'md', disabled: false, loading: false },
};

export const Ghost: Story = {
  render: (args) => html`
    <sg-button
      variant=${args.variant || 'ghost'}
      size=${args.size || 'md'}
      ?disabled=${args.disabled}
      ?loading=${args.loading}
    >
      Button
    </sg-button>
  `,
  args: { variant: 'ghost', size: 'md', disabled: false, loading: false },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
      <sg-button variant="primary" size="sm">Small</sg-button>
      <sg-button variant="primary" size="md">Medium</sg-button>
      <sg-button variant="primary" size="lg">Large</sg-button>
    </div>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:12px;">
        <sg-button variant="primary">Primary</sg-button>
        <sg-button variant="secondary">Secondary</sg-button>
        <sg-button variant="ghost">Ghost</sg-button>
      </div>
      <div style="display:flex;gap:12px;">
        <sg-button variant="primary" disabled>Primary</sg-button>
        <sg-button variant="secondary" disabled>Secondary</sg-button>
        <sg-button variant="ghost" disabled>Ghost</sg-button>
      </div>
      <div style="display:flex;gap:12px;">
        <sg-button variant="primary" loading>Primary</sg-button>
        <sg-button variant="secondary" loading>Secondary</sg-button>
        <sg-button variant="ghost" loading>Ghost</sg-button>
      </div>
    </div>
  `,
};

export const Loading: Story = {
  render: () => html`
    <sg-button variant="primary" size="md" loading>Processing</sg-button>
  `,
};
