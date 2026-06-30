import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-skeleton.js';

const meta: Meta = {
  title: 'Components/SgSkeleton',
  component: 'sg-skeleton',
  argTypes: {
    variant: { control: 'select', options: ['text', 'circle', 'rect', 'card'] },
    width: { control: 'text' },
    height: { control: 'text' },
    lines: { control: { type: 'number', min: 1, max: 10 } },
  },
  parameters: {
    docs: {
      description: {
        component: 'A shimmer loading skeleton for placeholder content.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Text: Story = {
  render: (args) => html`
    <sg-skeleton
      variant=${args.variant || 'text'}
      width=${args.width || '280px'}
      .lines=${args.lines ?? 3}
    ></sg-skeleton>
  `,
  args: { variant: 'text', width: '280px', lines: 3 },
};

export const Circle: Story = {
  render: (args) => html`
    <sg-skeleton
      variant=${args.variant || 'circle'}
      width=${args.width || '40px'}
      height=${args.height || '40px'}
    ></sg-skeleton>
  `,
  args: { variant: 'circle', width: '40px', height: '40px' },
};

export const Rect: Story = {
  render: (args) => html`
    <sg-skeleton
      variant=${args.variant || 'rect'}
      width=${args.width || '200px'}
      height=${args.height || '120px'}
    ></sg-skeleton>
  `,
  args: { variant: 'rect', width: '200px', height: '120px' },
};

export const Card: Story = {
  render: (args) => html`
    <sg-skeleton
      variant=${args.variant || 'card'}
      width=${args.width || '280px'}
      .lines=${args.lines ?? 3}
    ></sg-skeleton>
  `,
  args: { variant: 'card', width: '280px', lines: 3 },
};

export const TextLinesCustom: Story = {
  render: () => html`
    <sg-skeleton
      variant="text"
      width="300px"
      .lines=${5}
      last-line-width="40%"
    ></sg-skeleton>
  `,
};

export const AllVariants: Story = {
  render: () => html`
    <div style="display:flex;gap:32px;flex-wrap:wrap;align-items:flex-start;">
      <div>
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-bottom:8px;">Text</div>
        <sg-skeleton variant="text" width="160px" .lines=${3}></sg-skeleton>
      </div>
      <div>
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-bottom:8px;">Circle</div>
        <sg-skeleton variant="circle" width="40px" height="40px"></sg-skeleton>
      </div>
      <div>
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-bottom:8px;">Rect</div>
        <sg-skeleton variant="rect" width="200px" height="80px"></sg-skeleton>
      </div>
      <div>
        <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);margin-bottom:8px;">Card</div>
        <sg-skeleton variant="card" width="200px" .lines=${2}></sg-skeleton>
      </div>
    </div>
  `,
};
