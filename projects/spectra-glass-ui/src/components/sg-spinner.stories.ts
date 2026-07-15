import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-spinner.js';

const meta: Meta = {
  title: 'Components/SgSpinner',
  component: 'sg-spinner',
  argTypes: {
    variant: { control: 'select', options: ['spectral', 'glass'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
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
    <sg-spinner size=${args.size || 'md'} variant=${'spectral'}></sg-spinner>
  `,
  args: { variant: 'spectral', size: 'md' },
  argTypes: {
    variant: { table: { disable: true } },
  },
};

export const Glass: Story = {
  render: (args) => html`
    <sg-spinner size=${args.size || 'md'} variant=${'glass'}></sg-spinner>
  `,
  args: { variant: 'glass', size: 'md' },
  argTypes: {
    variant: { table: { disable: true } },
  },
};

export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => html`
    <div style="display:flex;align-items:center;gap:16px;">
      <sg-spinner size="sm" variant="spectral"></sg-spinner>
      <sg-spinner size="md" variant="spectral"></sg-spinner>
      <sg-spinner size="lg" variant="spectral"></sg-spinner>
    </div>
  `,
};

export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => html`
    <div style="display:flex;align-items:center;gap:16px;">
      <sg-spinner size="md" variant="spectral"></sg-spinner>
      <sg-spinner size="md" variant="glass"></sg-spinner>
    </div>
  `,
};
