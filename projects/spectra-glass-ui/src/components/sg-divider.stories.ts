import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-divider.js';

const meta: Meta = {
  title: 'Components/SgDivider',
  component: 'sg-divider',
  argTypes: {
    variant: { control: 'select', options: ['solid', 'glass', 'gradient'] },
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
          'A horizontal divider with optional label. Defaults to the spectral gradient variant.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-divider
      variant=${args.variant || 'gradient'}
      label=${args.label ?? ''}
      .labelPosition=${args.labelPosition || 'center'}
    ></sg-divider>
  `,
  args: { variant: 'gradient' },
};

export const WithLabel: Story = {
  render: (args) => html`
    <sg-divider
      variant=${args.variant || 'gradient'}
      label=${args.label || 'Section'}
      .labelPosition=${args.labelPosition || 'center'}
    ></sg-divider>
  `,
  args: { label: 'Section', variant: 'gradient', labelPosition: 'center' },
};

export const Gradient: Story = {
  render: () => html`<sg-divider variant="gradient" label="Spectra"></sg-divider>`,
  parameters: { controls: { disable: true } },
};

export const Variants: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:24px;padding:1rem;">
      <sg-divider variant="solid" label="Solid"></sg-divider>
      <sg-divider variant="glass" label="Glass"></sg-divider>
      <sg-divider variant="gradient" label="Gradient"></sg-divider>
    </div>
  `,
  parameters: { controls: { disable: true } },
};
