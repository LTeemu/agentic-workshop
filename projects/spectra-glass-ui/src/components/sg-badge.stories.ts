import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-badge.js';

const meta: Meta = {
  title: 'Components/SgBadge',
  component: 'sg-badge',
  argTypes: {
    variant: { control: 'select', options: ['default', 'success', 'warning', 'error', 'info', 'spectral'] },
    size: { control: 'select', options: ['sm', 'md'] },
    removable: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A small badge/chip with spectral color variants and optional dismiss.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-badge
      variant=${args.variant || 'default'}
      size=${args.size || 'md'}
      ?removable=${args.removable}
    >
      Label
    </sg-badge>
  `,
  args: { variant: 'default', size: 'md', removable: false },
};

export const Variants: Story = {
  render: () => html`
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <sg-badge variant="default">Default</sg-badge>
      <sg-badge variant="success">Success</sg-badge>
      <sg-badge variant="warning">Warning</sg-badge>
      <sg-badge variant="error">Error</sg-badge>
      <sg-badge variant="info">Info</sg-badge>
      <sg-badge variant="spectral">Spectral</sg-badge>
    </div>
  `,
  parameters: { controls: { disable: true } },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:8px;">
      <sg-badge variant="spectral" size="sm">Small</sg-badge>
      <sg-badge variant="spectral" size="md">Medium</sg-badge>
    </div>
  `,
  parameters: { controls: { disable: true } },
};

export const Removable: Story = {
  render: () => html`
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <sg-badge variant="default" removable>Default</sg-badge>
      <sg-badge variant="success" removable>Success</sg-badge>
      <sg-badge variant="error" removable>Error</sg-badge>
      <sg-badge variant="spectral" removable>Spectral</sg-badge>
    </div>
  `,
  parameters: { controls: { disable: true } },
};
