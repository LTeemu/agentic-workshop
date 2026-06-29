import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-avatar.js';

const meta: Meta = {
  title: 'Components/SgAvatar',
  component: 'sg-avatar',
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    initials: { control: 'text' },
    status: {
      control: 'select',
      options: ['', 'online', 'away'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Circular avatar with image, initials fallback on error, and optional online/away status dot.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-avatar
      src=${args.src || ''}
      alt=${args.alt || ''}
      size=${args.size || 'md'}
      initials=${args.initials || 'JD'}
      status=${args.status || ''}
    ></sg-avatar>
  `,
  args: { initials: 'JD', size: 'md', status: '' },
};

export const WithImage: Story = {
  render: () => html`
    <sg-avatar
      src="https://i.pravatar.cc/80?img=11"
      alt="Jane Doe"
      size="lg"
    ></sg-avatar>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:center;padding:1rem;">
      <sg-avatar initials="XS" size="sm"></sg-avatar>
      <sg-avatar initials="MD" size="md"></sg-avatar>
      <sg-avatar initials="LG" size="lg"></sg-avatar>
      <sg-avatar initials="XL" size="xl"></sg-avatar>
    </div>
  `,
};

export const StatusOnline: Story = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:center;padding:1rem;">
      <sg-avatar initials="ON" size="lg" status="online"></sg-avatar>
      <sg-avatar initials="AW" size="lg" status="away"></sg-avatar>
    </div>
  `,
};
