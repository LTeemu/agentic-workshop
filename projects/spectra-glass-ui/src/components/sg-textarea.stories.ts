import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-textarea.js';

const meta: Meta = {
  title: 'Components/SgTextarea',
  component: 'sg-textarea',
  argTypes: {
    variant: { control: 'select', options: ['outlined', 'ghost'] },
    resize: { control: 'select', options: ['none', 'vertical', 'both'] },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    rows: { control: 'number' },
    maxlength: { control: 'number' },
    clearable: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A glass-styled textarea with spectral gradient focus ring, configurable resize behavior, and optional clearable functionality.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-textarea
      variant=${args.variant || 'outlined'}
      placeholder=${args.placeholder || 'Write something…'}
      .value=${args.value || ''}
      label=${args.label || ''}
      error=${args.error || ''}
      rows=${args.rows ?? 3}
      maxlength=${args.maxlength ?? 0}
      resize=${args.resize || 'vertical'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      ?clearable=${args.clearable}
    ></sg-textarea>
  `,
  args: {
    variant: 'outlined',
    placeholder: 'Write something…',
    label: '',
    value: '',
    error: '',
    rows: 3,
    maxlength: 0,
    resize: 'vertical',
    disabled: false,
    readonly: false,
    clearable: false,
  },
};

export const WithLabel: Story = {
  render: () => html`
    <sg-textarea
      label="Description"
      placeholder="Enter a detailed description…"
    ></sg-textarea>
  `,
};

export const Ghost: Story = {
  render: () => html`
    <sg-textarea
      label="Notes"
      placeholder="Ghost variant notes…"
      variant="ghost"
    ></sg-textarea>
  `,
};

export const WithError: Story = {
  render: () => html`
    <sg-textarea
      label="Message"
      placeholder="Type your message"
      value="This is too short"
      error="Message must be at least 20 characters"
    ></sg-textarea>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <sg-textarea
      label="Disabled"
      placeholder="Cannot edit"
      value="This textarea is disabled"
      disabled
    ></sg-textarea>
  `,
};

export const Clearable: Story = {
  render: () => html`
    <sg-textarea
      label="Tags"
      placeholder="Add tags…"
      value="design, ui, components"
      clearable
    ></sg-textarea>
  `,
};
