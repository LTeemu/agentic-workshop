import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-input.js';

const meta: Meta = {
  title: 'Components/SgInput',
  component: 'sg-input',
  argTypes: {
    variant: { control: 'select', options: ['outlined', 'ghost'] },
    type: { control: 'select', options: ['text', 'email', 'password', 'number', 'search'] },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A glass-styled text input with a spectral gradient focus ring and optional prefix/suffix slots.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-input
      variant=${args.variant || 'outlined'}
      label=${args.label || ''}
      placeholder=${args.placeholder || 'Type something…'}
      .value=${args.value || ''}
      error=${args.error || ''}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
    ></sg-input>
  `,
  args: {
    variant: 'outlined',
    label: 'Label',
    placeholder: 'Type something…',
    value: '',
    error: '',
    disabled: false,
    readonly: false,
  },
};

export const WithValue: Story = {
  render: () => html`
    <sg-input
      label="Full name"
      placeholder="Enter your name"
      value="Jane Doe"
    ></sg-input>
  `,
};

export const Variants: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-input label="Outlined" placeholder="Outlined variant"></sg-input>
      <sg-input label="Ghost" placeholder="Ghost variant" variant="ghost"></sg-input>
    </div>
  `,
};

export const Error: Story = {
  render: () => html`
    <sg-input
      label="Email"
      placeholder="your@email.com"
      value="invalid"
      error="Please enter a valid email address"
    ></sg-input>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <sg-input
      label="Disabled"
      placeholder="Can't edit this"
      value="Read-only value"
      disabled
    ></sg-input>
  `,
};

export const WithSlots: Story = {
  render: () => html`
    <sg-input label="Search" placeholder="Search…" variant="outlined">
      <span slot="prefix" style="font-size:0.875rem;">🔍</span>
      <span slot="suffix" style="font-size:0.75rem;cursor:pointer;">✕</span>
    </sg-input>
  `,
};
