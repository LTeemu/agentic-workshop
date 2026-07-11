import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-select.js';

const meta: Meta = {
  title: 'Components/SgSelect',
  component: 'sg-select',
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    value: { control: 'text' },
    error: { control: 'text' },
    disabled: { control: 'boolean' },
    multiple: { control: 'boolean' },
    clearable: { control: 'boolean' },
    accent: { control: 'boolean' },
    options: { control: 'object' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A glass-styled select dropdown with spectral gradient focus ring. Supports single and multiple selection, clearable, and error states.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const SHARED_OPTIONS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'orange', label: 'Orange' },
  { value: 'grape', label: 'Grape' },
] as const;

export const Default: Story = {
  render: (args) => html`
    <sg-select
      label=${args.label || ''}
      placeholder=${args.placeholder || 'Select an option'}
      .value=${args.value || ''}
      error=${args.error || ''}
      .options=${[...(args.options ?? [])]}
      ?disabled=${args.disabled}
      ?multiple=${args.multiple}
      ?clearable=${args.clearable}
      ?accent=${args.accent}
    ></sg-select>
  `,
  args: {
    label: '',
    placeholder: 'Select an option',
    value: '',
    error: '',
    disabled: false,
    multiple: false,
    clearable: false,
    accent: false,
    options: [...SHARED_OPTIONS],
  },
};

export const WithLabel: Story = {
  render: (args) => html`
    <sg-select
      label=${args.label || 'Favorite fruit'}
      placeholder=${args.placeholder || 'Choose a fruit'}
      .value=${args.value || ''}
      .options=${[...(args.options ?? [...SHARED_OPTIONS])]}
      ?disabled=${args.disabled}
      ?multiple=${args.multiple}
      ?clearable=${args.clearable}
      ?accent=${args.accent}
    ></sg-select>
  `,
  args: {
    label: 'Favorite fruit',
    placeholder: 'Choose a fruit',
    value: '',
    disabled: false,
    multiple: false,
    clearable: false,
    accent: false,
    options: [...SHARED_OPTIONS],
  },
};

export const Preselected: Story = {
  render: (args) => html`
    <sg-select
      label=${args.label || 'Favorite fruit'}
      placeholder=${args.placeholder || 'Choose a fruit'}
      .value=${args.value || 'banana'}
      .options=${[...(args.options ?? [...SHARED_OPTIONS])]}
      ?disabled=${args.disabled}
      ?accent=${args.accent}
    ></sg-select>
  `,
  args: {
    label: 'Favorite fruit',
    placeholder: 'Choose a fruit',
    value: 'banana',
    disabled: false,
    accent: false,
    options: [...SHARED_OPTIONS],
  },
};

export const Error: Story = {
  render: (args) => html`
    <sg-select
      label=${args.label || 'Country'}
      placeholder=${args.placeholder || 'Select a country'}
      .value=${args.value || ''}
      error=${args.error || 'Please select a country'}
      .options=${[...(args.options ?? [
        { value: 'us', label: 'United States' },
        { value: 'ca', label: 'Canada' },
        { value: 'uk', label: 'United Kingdom' },
      ])]}
      ?disabled=${args.disabled}
      ?accent=${args.accent}
    ></sg-select>
  `,
  args: {
    label: 'Country',
    placeholder: 'Select a country',
    value: '',
    error: 'Please select a country',
    disabled: false,
    accent: false,
    options: [
      { value: 'us', label: 'United States' },
      { value: 'ca', label: 'Canada' },
      { value: 'uk', label: 'United Kingdom' },
    ],
  },
};

export const Disabled: Story = {
  render: (args) => html`
    <sg-select
      label=${args.label || 'Disabled'}
      placeholder=${args.placeholder || 'Cannot interact'}
      .value=${args.value || ''}
      ?disabled=${args.disabled ?? true}
      .options=${[...(args.options ?? [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ])]}
      ?multiple=${args.multiple}
      ?clearable=${args.clearable}
      ?accent=${args.accent}
    ></sg-select>
  `,
  args: {
    label: 'Disabled',
    placeholder: 'Cannot interact',
    value: '',
    disabled: true,
    multiple: false,
    clearable: false,
    accent: false,
    options: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
    ],
  },
};

export const MultiSelect: Story = {
  render: (args) => html`
    <sg-select
      label=${args.label || 'Tags'}
      placeholder=${args.placeholder || 'Select tags\u2026'}
      .value=${args.value || ''}
      ?multiple=${args.multiple ?? true}
      .options=${[...(args.options ?? [
        { value: 'design', label: 'Design' },
        { value: 'development', label: 'Development' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'product', label: 'Product' },
      ])]}
      ?disabled=${args.disabled}
      ?clearable=${args.clearable}
      ?accent=${args.accent}
    ></sg-select>
  `,
  args: {
    label: 'Tags',
    placeholder: 'Select tags\u2026',
    value: '',
    multiple: true,
    disabled: false,
    clearable: false,
    accent: false,
    options: [
      { value: 'design', label: 'Design' },
      { value: 'development', label: 'Development' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'product', label: 'Product' },
    ],
  },
};

export const Clearable: Story = {
  render: (args) => html`
    <sg-select
      label=${args.label || 'Favorite fruit'}
      placeholder=${args.placeholder || 'Choose a fruit'}
      .value=${args.value || 'apple'}
      ?clearable=${args.clearable ?? true}
      .options=${[...(args.options ?? [...SHARED_OPTIONS])]}
      ?disabled=${args.disabled}
      ?multiple=${args.multiple}
      ?accent=${args.accent}
    ></sg-select>
  `,
  args: {
    label: 'Favorite fruit',
    placeholder: 'Choose a fruit',
    value: 'apple',
    clearable: true,
    disabled: false,
    multiple: false,
    accent: false,
    options: [...SHARED_OPTIONS],
  },
};
