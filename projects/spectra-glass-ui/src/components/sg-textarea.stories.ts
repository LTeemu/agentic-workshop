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
  render: (args) => html`
    <sg-textarea
      variant=${args.variant || 'outlined'}
      label=${args.label || 'Description'}
      placeholder=${args.placeholder || 'Enter a detailed description\u2026'}
      .value=${args.value || ''}
      error=${args.error || ''}
      rows=${args.rows ?? 4}
      maxlength=${args.maxlength ?? 0}
      resize=${args.resize || 'vertical'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      ?clearable=${args.clearable}
    ></sg-textarea>
  `,
  args: {
    variant: 'outlined',
    label: 'Description',
    placeholder: 'Enter a detailed description\u2026',
    value: '',
    error: '',
    rows: 4,
    maxlength: 0,
    resize: 'vertical',
    disabled: false,
    readonly: false,
    clearable: false,
  },
};

export const Ghost: Story = {
  render: (args) => html`
    <sg-textarea
      variant=${'ghost'}
      label=${args.label || 'Notes'}
      placeholder=${args.placeholder || 'Ghost variant notes\u2026'}
      .value=${args.value || ''}
      error=${args.error || ''}
      rows=${args.rows ?? 4}
      maxlength=${args.maxlength ?? 0}
      resize=${args.resize || 'vertical'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      ?clearable=${args.clearable}
    ></sg-textarea>
  `,
  args: {
    variant: 'ghost',
    label: 'Notes',
    placeholder: 'Ghost variant notes\u2026',
    value: '',
    error: '',
    rows: 4,
    maxlength: 0,
    resize: 'vertical',
    disabled: false,
    readonly: false,
    clearable: false,
  },
  argTypes: {
    variant: { table: { disable: true } },
  },
};

export const WithError: Story = {
  render: (args) => html`
    <sg-textarea
      variant=${args.variant || 'outlined'}
      label=${args.label || 'Message'}
      placeholder=${args.placeholder || 'Type your message'}
      .value=${args.value || 'This is too short'}
      error=${args.error || 'Message must be at least 20 characters'}
      rows=${args.rows ?? 4}
      maxlength=${args.maxlength ?? 0}
      resize=${args.resize || 'vertical'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      ?clearable=${args.clearable}
    ></sg-textarea>
  `,
  args: {
    variant: 'outlined',
    label: 'Message',
    placeholder: 'Type your message',
    value: 'This is too short',
    error: 'Message must be at least 20 characters',
    rows: 4,
    maxlength: 0,
    resize: 'vertical',
    disabled: false,
    readonly: false,
    clearable: false,
  },
};

export const Disabled: Story = {
  render: (args) => html`
    <sg-textarea
      variant=${args.variant || 'outlined'}
      label=${args.label || 'Disabled'}
      placeholder=${args.placeholder || 'Cannot edit'}
      .value=${args.value || 'This textarea is disabled'}
      error=${args.error || ''}
      rows=${args.rows ?? 4}
      maxlength=${args.maxlength ?? 0}
      resize=${args.resize || 'vertical'}
      ?disabled=${args.disabled ?? true}
      ?readonly=${args.readonly}
      ?clearable=${args.clearable}
    ></sg-textarea>
  `,
  args: {
    variant: 'outlined',
    label: 'Disabled',
    placeholder: 'Cannot edit',
    value: 'This textarea is disabled',
    error: '',
    rows: 4,
    maxlength: 0,
    resize: 'vertical',
    disabled: true,
    readonly: false,
    clearable: false,
  },
};

export const Clearable: Story = {
  render: (args) => html`
    <sg-textarea
      variant=${args.variant || 'outlined'}
      label=${args.label || 'Tags'}
      placeholder=${args.placeholder || 'Add tags\u2026'}
      .value=${args.value || 'design, ui, components'}
      error=${args.error || ''}
      rows=${args.rows ?? 4}
      maxlength=${args.maxlength ?? 0}
      resize=${args.resize || 'vertical'}
      ?disabled=${args.disabled}
      ?readonly=${args.readonly}
      ?clearable=${args.clearable ?? true}
    ></sg-textarea>
  `,
  args: {
    variant: 'outlined',
    label: 'Tags',
    placeholder: 'Add tags\u2026',
    value: 'design, ui, components',
    error: '',
    rows: 4,
    maxlength: 0,
    resize: 'vertical',
    disabled: false,
    readonly: false,
    clearable: true,
  },
};
