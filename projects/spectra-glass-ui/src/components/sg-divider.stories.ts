import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-divider.js';

const meta: Meta = {
  title: 'Components/SgDivider',
  component: 'sg-divider',
  argTypes: {
    variant: {
      control: 'select',
      options: ['solid', 'glass', 'gradient'],
    },
    label: { control: 'text' },
    labelPosition: {
      control: 'select',
      options: ['left', 'center', 'right'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A horizontal divider with optional label. Use `variant="gradient"` for the spectral gradient line.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`<sg-divider variant=${args.variant || 'glass'} label=${args.label || ''} label-position=${args.labelPosition || 'center'}></sg-divider>`,
  args: { variant: 'glass', label: '', labelPosition: 'center' },
};

export const WithLabel: Story = {
  render: () => html`<sg-divider label="Section"></sg-divider>`,
};

export const Gradient: Story = {
  render: () => html`<sg-divider variant="gradient" label="Spectra"></sg-divider>`,
};

export const Variants: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:24px;padding:1rem;">
      <sg-divider variant="solid" label="Solid"></sg-divider>
      <sg-divider variant="glass" label="Glass"></sg-divider>
      <sg-divider variant="gradient" label="Gradient"></sg-divider>
    </div>
  `,
};
