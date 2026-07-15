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
  render: (args) => html`
    <sg-input
      variant=${args.variant || 'outlined'}
      label=${args.label || 'Full name'}
      placeholder=${args.placeholder || 'Enter your name'}
      .value=${args.value || 'Jane Doe'}
      error=${args.error || ''}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
    ></sg-input>
  `,
  args: { variant: 'outlined', label: 'Full name', placeholder: 'Enter your name', value: 'Jane Doe', error: '', disabled: false, readonly: false },
};

export const Variants: Story = {
  parameters: { controls: { disable: true } },
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-input variant="outlined" label="Outlined" placeholder="Outlined variant"></sg-input>
      <sg-input variant="ghost" label="Ghost" placeholder="Ghost variant"></sg-input>
    </div>
  `,
};

export const Error: Story = {
  render: (args) => html`
    <sg-input
      variant=${args.variant || 'outlined'}
      label=${args.label || 'Email'}
      placeholder=${args.placeholder || 'your@email.com'}
      .value=${args.value || 'invalid'}
      error=${args.error || 'Please enter a valid email address'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
    ></sg-input>
  `,
  args: { variant: 'outlined', label: 'Email', placeholder: 'your@email.com', value: 'invalid', error: 'Please enter a valid email address', disabled: false, readonly: false },
};

export const Disabled: Story = {
  render: (args) => html`
    <sg-input
      variant=${args.variant || 'outlined'}
      label=${args.label || 'Disabled'}
      placeholder=${args.placeholder || "Can't edit this"}
      .value=${args.value || 'Read-only value'}
      error=${args.error || ''}
      ?disabled=${args.disabled ?? true}
      ?readonly=${args.readonly}
    ></sg-input>
  `,
  args: { variant: 'outlined', label: 'Disabled', placeholder: "Can't edit this", value: 'Read-only value', error: '', disabled: true, readonly: false },
};

export const WithSlots: Story = {
  render: () => html`
    <sg-input variant="outlined" label="Search" placeholder="Search…">
      <span slot="prefix" style="font-size:0.875rem;">🔍</span>
      <span slot="suffix" style="font-size:0.75rem;cursor:pointer;">✕</span>
    </sg-input>
  `,
  parameters: { controls: { disable: true } },
};
