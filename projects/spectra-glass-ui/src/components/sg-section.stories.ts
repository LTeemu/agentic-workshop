import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-section.js';

const meta: Meta = {
  title: 'Components/SgSection',
  component: 'sg-section',
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
    },
    maxWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'full'],
    },
    glass: { control: 'boolean' },
    accent: {
      control: 'select',
      options: ['none', 'top', 'bottom', 'both'],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Responsive layout container with consistent padding, max-width, optional glass background, and decorative gradient accent edges.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-section
      padding=${args.padding || 'lg'}
      max-width=${args.maxWidth || 'lg'}
      ?glass=${args.glass ?? false}
      accent=${args.accent || 'none'}
    >
      <div style="padding:2rem;background:rgba(255,255,255,0.05);border-radius:12px;text-align:center;">
        Section content
      </div>
    </sg-section>
  `,
  args: { padding: 'lg', maxWidth: 'lg', glass: false, accent: 'none' },
};

export const Glass: Story = {
  render: () => html`
    <sg-section glass>
      <div style="padding:2rem;text-align:center;">Glass section with blur</div>
    </sg-section>
  `,
};

export const WithAccent: Story = {
  render: () => html`
    <sg-section accent="both" padding="md">
      <div style="padding:2rem;text-align:center;">Section with gradient top and bottom edges</div>
    </sg-section>
  `,
};

export const PaddingCompare: Story = {
  render: () => html`
    <sg-section padding="sm" glass>
      <div style="text-align:center;">Small padding</div>
    </sg-section>
    <sg-section padding="xl" glass>
      <div style="text-align:center;">Extra-large padding</div>
    </sg-section>
  `,
};
