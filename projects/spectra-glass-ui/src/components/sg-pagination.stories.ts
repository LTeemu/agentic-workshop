import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-pagination.js';

const meta: Meta = {
  title: 'Components/SgPagination',
  component: 'sg-pagination',
  argTypes: {
    total: { control: { type: 'number', min: 1 } },
    current: { control: { type: 'number', min: 1 } },
    siblingCount: { control: { type: 'number', min: 0, max: 5 } },
    showFirstLast: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'md'] },
  },
  parameters: {
    docs: {
      description: {
        component: 'A pagination control with page buttons, ellipsis, and navigation arrows.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-pagination
      total=${args.total ?? 10}
      current=${args.current ?? 5}
      sibling-count=${args.siblingCount ?? 1}
      size=${args.size || 'md'}
    ></sg-pagination>
  `,
  args: { total: 10, current: 5, siblingCount: 1, size: 'md' },
};

export const FirstPage: Story = {
  render: (args) => html`
    <sg-pagination
      total=${args.total ?? 10}
      current=${args.current ?? 1}
      sibling-count=${args.siblingCount ?? 1}
      size=${args.size || 'md'}
    ></sg-pagination>
  `,
  args: { total: 10, current: 1, siblingCount: 1, size: 'md' },
};

export const LastPage: Story = {
  render: (args) => html`
    <sg-pagination
      total=${args.total ?? 10}
      current=${args.current ?? 10}
      sibling-count=${args.siblingCount ?? 1}
      size=${args.size || 'md'}
    ></sg-pagination>
  `,
  args: { total: 10, current: 10, siblingCount: 1, size: 'md' },
};

export const ManyPages: Story = {
  render: (args) => html`
    <sg-pagination
      total=${args.total ?? 20}
      current=${args.current ?? 10}
      sibling-count=${args.siblingCount ?? 2}
      size=${args.size || 'md'}
    ></sg-pagination>
  `,
  args: { total: 20, current: 10, siblingCount: 2, size: 'md' },
};

export const FewPages: Story = {
  render: (args) => html`
    <sg-pagination
      total=${args.total ?? 3}
      current=${args.current ?? 2}
      sibling-count=${args.siblingCount ?? 1}
      size=${args.size || 'md'}
    ></sg-pagination>
  `,
  args: { total: 3, current: 2, siblingCount: 1, size: 'md' },
};

export const ShowFirstLast: Story = {
  render: (args) => html`
    <sg-pagination
      total=${args.total ?? 10}
      current=${args.current ?? 5}
      sibling-count=${args.siblingCount ?? 1}
      ?show-first-last=${args.showFirstLast}
      size=${args.size || 'md'}
    ></sg-pagination>
  `,
  args: { total: 10, current: 5, siblingCount: 1, showFirstLast: true, size: 'md' },
};

export const Small: Story = {
  render: (args) => html`
    <sg-pagination
      total=${args.total ?? 10}
      current=${args.current ?? 5}
      sibling-count=${args.siblingCount ?? 1}
      size=${'sm'}
    ></sg-pagination>
  `,
  args: { total: 10, current: 5, siblingCount: 1, size: 'sm' },
  argTypes: {
    size: { table: { disable: true } },
  },
};
