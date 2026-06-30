import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-radio.js';
import './sg-radio-group.js';

const meta: Meta = {
  title: 'Components/SgRadio',
  component: 'sg-radio',
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
    value: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A glass-styled radio button with spectral gradient accent. Use within an sg-radio-group for mutual exclusion.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const SingleRadio: Story = {
  render: (args) => html`
    <sg-radio
      ?checked=${args.checked ?? false}
      ?disabled=${args.disabled ?? false}
      label=${args.label || 'Option'}
      value=${args.value || 'option'}
    ></sg-radio>
  `,
  args: { checked: false, disabled: false, label: 'Single option', value: 'single' },
};

export const RadioGroup: Story = {
  render: () => html`
    <sg-radio-group name="fruit">
      <sg-radio label="Apple" value="apple"></sg-radio>
      <sg-radio label="Banana" value="banana"></sg-radio>
      <sg-radio label="Cherry" value="cherry"></sg-radio>
    </sg-radio-group>
  `,
};

export const Preselected: Story = {
  render: () => html`
    <sg-radio-group name="os" value="linux">
      <sg-radio label="Windows" value="windows"></sg-radio>
      <sg-radio label="macOS" value="macos"></sg-radio>
      <sg-radio label="Linux" value="linux"></sg-radio>
    </sg-radio-group>
  `,
};

export const DisabledGroup: Story = {
  render: () => html`
    <sg-radio-group name="frozen" disabled>
      <sg-radio label="Option A" value="a"></sg-radio>
      <sg-radio label="Option B" value="b" checked></sg-radio>
      <sg-radio label="Option C" value="c"></sg-radio>
    </sg-radio-group>
  `,
};

export const AllStates: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:row;gap:24px;align-items:center;">
      <sg-radio label="Unchecked" value="unchecked"></sg-radio>
      <sg-radio label="Checked" value="checked" checked></sg-radio>
      <sg-radio label="Disabled" value="disabled" disabled></sg-radio>
      <sg-radio label="Disabled checked" value="disabled-checked" disabled checked></sg-radio>
    </div>
  `,
};
