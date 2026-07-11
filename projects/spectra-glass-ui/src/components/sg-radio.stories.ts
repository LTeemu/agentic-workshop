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
  parameters: {
    docs: {
      description: { story: 'Standalone radio — `checked` control works directly.' },
    },
  },
};

export const RadioGroup: Story = {
  render: (args) => html`
    <sg-radio-group
      name=${args.name ?? 'group'}
      value=${args.value ?? ''}
      ?disabled=${args.disabled ?? false}
      label=${args.label || ''}
    >
      <sg-radio label="Option A" value="a"></sg-radio>
      <sg-radio label="Option B" value="b"></sg-radio>
      <sg-radio label="Option C" value="c"></sg-radio>
    </sg-radio-group>
  `,
  args: {
    label: 'Choose an option',
    name: 'group',
    value: 'a',
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    name: { control: 'text' },
    value: {
      control: 'select',
      options: ['', 'a', 'b', 'c'],
    },
    disabled: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        story: 'Use the **`value`** control to toggle which radio is checked — the group overrides individual `checked` attributes.',
      },
    },
  },
};

export const Preselected: Story = {
  render: (args) => html`
    <sg-radio-group
      name=${args.name ?? 'os'}
      value=${args.value ?? 'linux'}
      ?disabled=${args.disabled ?? false}
      label=${args.label || ''}
    >
      <sg-radio label="Windows" value="windows"></sg-radio>
      <sg-radio label="macOS" value="macos"></sg-radio>
      <sg-radio label="Linux" value="linux"></sg-radio>
    </sg-radio-group>
  `,
  args: {
    label: 'Select your OS',
    name: 'os',
    value: 'linux',
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    name: { control: 'text' },
    value: {
      control: 'select',
      options: ['', 'windows', 'macos', 'linux'],
    },
    disabled: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        story: '**`value`** controls the checked radio. Change it to a different OS to switch selection.',
      },
    },
  },
};

export const DisabledGroup: Story = {
  render: (args) => html`
    <sg-radio-group
      name=${args.name ?? 'frozen'}
      value=${args.value ?? 'b'}
      ?disabled=${args.disabled ?? true}
      label=${args.label || ''}
    >
      <sg-radio label="Option A" value="a"></sg-radio>
      <sg-radio label="Option B" value="b"></sg-radio>
      <sg-radio label="Option C" value="c"></sg-radio>
    </sg-radio-group>
  `,
  args: {
    label: 'Frozen settings',
    name: 'frozen',
    value: 'b',
    disabled: true,
  },
  argTypes: {
    label: { control: 'text' },
    name: { control: 'text' },
    value: {
      control: 'select',
      options: ['', 'a', 'b', 'c'],
    },
    disabled: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        story: 'When **`disabled`** is on, all radios are non-interactive. **`value`** still controls which appears checked.',
      },
    },
  },
};

export const AllStates: Story = {
  render: (args) => html`
    <div style="display:flex;flex-direction:row;gap:24px;align-items:center;">
      <sg-radio
        label="Unchecked"
        value="unchecked"
        ?disabled=${args.disabled ?? false}
      ></sg-radio>
      <sg-radio
        label="Checked"
        value="checked"
        checked
        ?disabled=${args.disabled ?? false}
      ></sg-radio>
      <sg-radio
        label="Disabled"
        value="disabled"
        disabled
      ></sg-radio>
      <sg-radio
        label="Disabled checked"
        value="disabled-checked"
        disabled
        checked
      ></sg-radio>
    </div>
  `,
  args: {
    disabled: false,
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
};
