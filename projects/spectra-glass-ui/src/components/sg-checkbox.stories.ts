import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-checkbox.js';

const meta: Meta = {
  title: 'Components/SgCheckbox',
  component: 'sg-checkbox',
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    label: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A glass-styled checkbox with spectral gradient accent. Supports checked, indeterminate, and disabled states with keyboard interaction.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-checkbox
      ?checked=${args.checked ?? false}
      ?disabled=${args.disabled ?? false}
      ?indeterminate=${args.indeterminate ?? false}
      label=${args.label || 'Accept terms'}
    ></sg-checkbox>
  `,
  args: { checked: false, disabled: false, indeterminate: false, label: 'Accept terms' },
};

export const Checked: Story = {
  render: () => html`
    <sg-checkbox label="I agree to the terms" checked></sg-checkbox>
  `,
};

export const Indeterminate: Story = {
  render: () => html`
    <sg-checkbox label="Select all items" indeterminate></sg-checkbox>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <sg-checkbox label="Disabled option" disabled></sg-checkbox>
  `,
};

export const DisabledChecked: Story = {
  render: () => html`
    <sg-checkbox label="Already selected (read-only)" disabled checked></sg-checkbox>
  `,
};

export const AllStates: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:12px;">
      <sg-checkbox label="Unchecked"></sg-checkbox>
      <sg-checkbox label="Checked" checked></sg-checkbox>
      <sg-checkbox label="Indeterminate" indeterminate></sg-checkbox>
      <sg-checkbox label="Disabled" disabled></sg-checkbox>
      <sg-checkbox label="Disabled checked" disabled checked></sg-checkbox>
      <sg-checkbox label="Disabled indeterminate" disabled indeterminate></sg-checkbox>
    </div>
  `,
};
