import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-icon.js';

const meta: Meta = {
  title: 'Components/SgIcon',
  component: 'sg-icon',
  argTypes: {
    name: {
      control: 'select',
      options: ['menu', 'close', 'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right', 'check', 'external-link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Feather-style SVG icon wrapper. Use the `name` prop for built-in icons, or slot a custom SVG for ad-hoc icons.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`<sg-icon name=${args.name || 'menu'} size=${args.size || 'md'}></sg-icon>`,
  args: { name: 'menu', size: 'md' },
};

export const AllIcons: Story = {
  render: () => html`
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;padding:1rem;">
      ${['menu', 'close', 'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right', 'check', 'external-link'].map(
        (name) => html`
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <sg-icon name=${name} size="lg"></sg-icon>
            <span style="font-size:0.75rem;color:rgba(255,255,255,0.5);">${name}</span>
          </div>
        `
      )}
    </div>
  `,
};

export const Sizes: Story = {
  render: () => html`
    <div style="display:flex;gap:16px;align-items:center;padding:1rem;">
      <sg-icon name="check" size="sm"></sg-icon>
      <sg-icon name="check" size="md"></sg-icon>
      <sg-icon name="check" size="lg"></sg-icon>
    </div>
  `,
};
