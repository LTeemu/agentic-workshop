import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-toggle.js';

const meta: Meta = {
  title: 'Components/SgToggle',
  component: 'sg-toggle',
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    labelPosition: { control: 'select', options: ['left', 'right'] },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A toggle switch with spectral gradient active track. Supports keyboard interaction (Space/Enter) and emits a `change` event.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Off: Story = {
  render: (args) => html`
    <sg-toggle
      ?checked=${args.checked}
      ?disabled=${args.disabled}
      label=${args.label || 'Toggle me'}
      label-position=${args.labelPosition || 'right'}
    ></sg-toggle>
  `,
  args: { checked: false, disabled: false, label: 'Toggle me', labelPosition: 'right' },
};

export const On: Story = {
  render: (args) => html`
    <sg-toggle
      ?checked=${args.checked}
      ?disabled=${args.disabled}
      label=${args.label || 'Active'}
      label-position=${args.labelPosition || 'right'}
    ></sg-toggle>
  `,
  args: { checked: true, disabled: false, label: 'Active', labelPosition: 'right' },
};

export const LabelPositions: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-toggle label="Label on right" label-position="right" checked></sg-toggle>
      <sg-toggle label="Label on left" label-position="left" checked></sg-toggle>
      <sg-toggle label="No label"></sg-toggle>
    </div>
  `,
};

export const States: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-toggle label="Unchecked"></sg-toggle>
      <sg-toggle label="Checked" checked></sg-toggle>
      <sg-toggle label="Disabled unchecked" disabled></sg-toggle>
      <sg-toggle label="Disabled checked" disabled checked></sg-toggle>
    </div>
  `,
};
