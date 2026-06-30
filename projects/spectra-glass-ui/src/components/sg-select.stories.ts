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

export const Default: Story = {
  render: (args) => html`
    <sg-select
      label=${args.label || ''}
      placeholder=${args.placeholder || 'Select an option'}
      .value=${args.value || ''}
      error=${args.error || ''}
      .options=${args.options || []}
      ?disabled=${args.disabled}
      ?multiple=${args.multiple}
      ?clearable=${args.clearable}
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
    options: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana' },
      { value: 'orange', label: 'Orange' },
      { value: 'grape', label: 'Grape' },
    ],
  },
};

export const WithLabel: Story = {
  render: () => html`
    <sg-select
      label="Favorite fruit"
      placeholder="Choose a fruit"
      .options=${[
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
        { value: 'orange', label: 'Orange' },
        { value: 'grape', label: 'Grape' },
      ]}
    ></sg-select>
  `,
};

export const Preselected: Story = {
  render: () => html`
    <sg-select
      label="Favorite fruit"
      value="banana"
      .options=${[
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
        { value: 'orange', label: 'Orange' },
        { value: 'grape', label: 'Grape' },
      ]}
    ></sg-select>
  `,
};

export const Error: Story = {
  render: () => html`
    <sg-select
      label="Country"
      placeholder="Select a country"
      .value=${''}
      error="Please select a country"
      .options=${[
        { value: 'us', label: 'United States' },
        { value: 'ca', label: 'Canada' },
        { value: 'uk', label: 'United Kingdom' },
      ]}
    ></sg-select>
  `,
};

export const Disabled: Story = {
  render: () => html`
    <sg-select
      label="Disabled"
      placeholder="Cannot interact"
      disabled
      .options=${[
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ]}
    ></sg-select>
  `,
};

export const MultiSelect: Story = {
  render: () => html`
    <sg-select
      label="Tags"
      placeholder="Select tags…"
      multiple
      .options=${[
        { value: 'design', label: 'Design' },
        { value: 'development', label: 'Development' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'product', label: 'Product' },
      ]}
    ></sg-select>
  `,
};

export const Clearable: Story = {
  render: () => html`
    <sg-select
      label="Favorite fruit"
      value="apple"
      clearable
      .options=${[
        { value: 'apple', label: 'Apple' },
        { value: 'banana', label: 'Banana' },
        { value: 'orange', label: 'Orange' },
        { value: 'grape', label: 'Grape' },
      ]}
    ></sg-select>
  `,
};
