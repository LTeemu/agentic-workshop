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
  render: (args) => html`
    <sg-checkbox
      ?checked=${args.checked ?? true}
      ?disabled=${args.disabled ?? false}
      ?indeterminate=${args.indeterminate ?? false}
      label=${args.label || 'I agree to the terms'}
    ></sg-checkbox>
  `,
  args: { checked: true, disabled: false, indeterminate: false, label: 'I agree to the terms' },
};

export const Indeterminate: Story = {
  render: (args) => html`
    <sg-checkbox
      ?checked=${args.checked ?? false}
      ?disabled=${args.disabled ?? false}
      ?indeterminate=${args.indeterminate ?? true}
      label=${args.label || 'Select all items'}
    ></sg-checkbox>
  `,
  args: { checked: false, disabled: false, indeterminate: true, label: 'Select all items' },
};

export const Disabled: Story = {
  render: (args) => html`
    <sg-checkbox
      ?checked=${args.checked ?? false}
      ?disabled=${args.disabled ?? true}
      ?indeterminate=${args.indeterminate ?? false}
      label=${args.label || 'Disabled option'}
    ></sg-checkbox>
  `,
  args: { checked: false, disabled: true, indeterminate: false, label: 'Disabled option' },
};

export const DisabledChecked: Story = {
  render: (args) => html`
    <sg-checkbox
      ?checked=${args.checked ?? true}
      ?disabled=${args.disabled ?? true}
      ?indeterminate=${args.indeterminate ?? false}
      label=${args.label || 'Already selected (read-only)'}
    ></sg-checkbox>
  `,
  args: { checked: true, disabled: true, indeterminate: false, label: 'Already selected (read-only)' },
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
  parameters: { controls: { disable: true } },
};
