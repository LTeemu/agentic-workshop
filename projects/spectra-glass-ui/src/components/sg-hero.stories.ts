import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-hero.js';
import './sg-button.js';

const meta: Meta = {
  title: 'Components/SgHero',
  component: 'sg-hero',
  argTypes: {
    align: {
      control: 'select',
      options: ['left', 'center'],
    },
    overlay: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Hero section with headline, subtitle, CTA slots, optional background media, and gradient overlay.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-hero align=${args.align || 'center'} ?overlay=${args.overlay ?? true}>
      <h1 slot="heading">Build Something Great</h1>
      <p slot="subtitle">A glass‑themed component library for modern web experiences.</p>
      <sg-button slot="cta-primary" variant="primary">Get Started</sg-button>
      <sg-button slot="cta-secondary" variant="ghost">Learn More</sg-button>
    </sg-hero>
  `,
  args: { align: 'center', overlay: true },
};

export const AlignLeft: Story = {
  render: () => html`
    <sg-hero align="left">
      <h1 slot="heading">Left‑aligned Hero</h1>
      <p slot="subtitle">Perfect for landing pages with lots of copy.</p>
      <sg-button slot="cta-primary" variant="primary">Action</sg-button>
    </sg-hero>
  `,
};

export const WithBackgroundMedia: Story = {
  render: () => html`
    <sg-hero align="center">
      <img slot="media" src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80" alt="" style="width:100%;height:100%;object-fit:cover;" />
      <h1 slot="heading">Over Background</h1>
      <p slot="subtitle">The gradient overlay keeps text readable on any image.</p>
      <sg-button slot="cta-primary" variant="primary">Explore</sg-button>
    </sg-hero>
  `,
};
