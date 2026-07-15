import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-progress.js';

const meta: Meta = {
  title: 'Components/SgProgress',
  component: 'sg-progress',
  argTypes: {
    variant: { control: 'select', options: ['spectral', 'default'] },
    value: { control: { type: 'number', min: 0, max: 100 } },
    max: { control: { type: 'number', min: 1 } },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    indeterminate: { control: 'boolean' },
    label: { control: 'text' },
    showValue: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component: 'A progress bar with spectral gradient fill and optional label.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-progress
      value=${args.value ?? 60}
      max=${args.max ?? 100}
      variant=${args.variant || 'spectral'}
      size=${args.size || 'md'}
      ?indeterminate=${args.indeterminate}
    ></sg-progress>
  `,
  args: { variant: 'spectral', value: 60, max: 100, size: 'md', indeterminate: false },
};

export const WithLabel: Story = {
  render: (args) => html`
    <sg-progress
      value=${args.value ?? 73}
      max=${args.max ?? 100}
      variant=${args.variant || 'spectral'}
      size=${args.size || 'md'}
      label=${args.label || 'Upload progress'}
      ?show-value=${args.showValue}
    ></sg-progress>
  `,
  args: { variant: 'spectral', value: 73, max: 100, size: 'md', label: 'Upload progress', showValue: true },
};

export const Small: Story = {
  render: (args) => html`
    <sg-progress
      value=${args.value ?? 60}
      max=${args.max ?? 100}
      variant="spectral"
      size=${'sm'}
    ></sg-progress>
  `,
  args: { value: 60, max: 100, size: 'sm' },
  argTypes: {
    size: { table: { disable: true } },
  },
};

export const Large: Story = {
  render: (args) => html`
    <sg-progress
      value=${args.value ?? 60}
      max=${args.max ?? 100}
      variant="spectral"
      size=${'lg'}
    ></sg-progress>
  `,
  args: { value: 60, max: 100, size: 'lg' },
  argTypes: {
    size: { table: { disable: true } },
  },
};

export const Determinate: Story = {
  render: (args) => html`
    <sg-progress
      value=${args.value ?? 42}
      max=${args.max ?? 100}
      variant=${args.variant || 'default'}
      size=${args.size || 'md'}
    ></sg-progress>
  `,
  args: { variant: 'default', value: 42, max: 100, size: 'md' },
};

export const Indeterminate: Story = {
  render: (args) => html`
    <sg-progress
      variant=${args.variant || 'spectral'}
      size=${args.size || 'md'}
      ?indeterminate=${args.indeterminate}
    ></sg-progress>
  `,
  args: { variant: 'spectral', size: 'md', indeterminate: true },
};

export const AllSizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;max-width:400px;">
      <sg-progress value="60" max="100" variant="spectral" size="sm"></sg-progress>
      <sg-progress value="60" max="100" variant="spectral" size="md"></sg-progress>
      <sg-progress value="60" max="100" variant="spectral" size="lg"></sg-progress>
    </div>
  `,
};

export const Multiple: Story = {
  parameters: { controls: { disable: true } },
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;max-width:400px;">
      <sg-progress value="25" max="100" variant="spectral" size="md" label="Task 1" show-value></sg-progress>
      <sg-progress value="50" max="100" variant="spectral" size="md" label="Task 2" show-value></sg-progress>
      <sg-progress value="75" max="100" variant="spectral" size="md" label="Task 3" show-value></sg-progress>
      <sg-progress value="100" max="100" variant="spectral" size="md" label="Task 4" show-value></sg-progress>
    </div>
  `,
};
