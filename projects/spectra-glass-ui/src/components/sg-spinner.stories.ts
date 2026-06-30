import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-spinner.js';

const meta: Meta = {
  title: 'Components/SgSpinner',
  component: 'sg-spinner',
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['spectral', 'glass'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'An animated loading spinner. The `spectral` variant uses a conic-gradient ring that sweeps the spectral palette as it spins.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Spectral: Story = {
  render: (args) => html`
    <sg-spinner size=${args.size || 'md'} variant=${args.variant || 'spectral'}></sg-spinner>
  `,
  args: { size: 'md', variant: 'spectral' },
};

export const Glass: Story = {
  render: (args) => html`
    <sg-spinner size=${args.size || 'md'} variant=${args.variant || 'glass'}></sg-spinner>
  `,
  args: { size: 'md', variant: 'glass' },
};

export const Sizes: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:16px;">
      <sg-spinner size="sm" variant="spectral"></sg-spinner>
      <sg-spinner size="md" variant="spectral"></sg-spinner>
      <sg-spinner size="lg" variant="spectral"></sg-spinner>
    </div>
  `,
};

export const Variants: Story = {
  render: () => html`
    <div style="display:flex;align-items:center;gap:16px;">
      <sg-spinner size="md" variant="spectral"></sg-spinner>
      <sg-spinner size="md" variant="glass"></sg-spinner>
    </div>
  `,
};
