import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-card.js';

const meta: Meta = {
  title: 'Components/SgCard',
  component: 'sg-card',
  argTypes: {
    variant: {
      control: 'select',
      options: ['elevated', 'outlined', 'ghost'],
    },
    padding: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    accent: {
      control: 'boolean',
    },
    selected: {
      control: 'boolean',
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A glassmorphic card with spectral gradient interactions. Focus-visible shows a gradient ring, hover adds a spectral glow, and selected/accent render a gradient border.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-card
      variant=${args.variant || 'elevated'}
      padding=${args.padding || 'md'}
      ?accent=${args.accent ?? false}
      ?selected=${args.selected ?? false}
    >
      <div>This is the card body content.</div>
    </sg-card>
  `,
  args: {
    variant: 'elevated',
    padding: 'md',
    accent: false,
    selected: false,
  },
};

export const WithHeader: Story = {
  render: (args) => html`
    <sg-card
      variant=${args.variant || 'elevated'}
      padding=${args.padding || 'md'}
      ?accent=${args.accent ?? false}
      ?selected=${args.selected ?? false}
    >
      <span slot="header">Card Title</span>
      <div>Body content goes here. The header is separated by a subtle divider.</div>
    </sg-card>
  `,
  args: {
    variant: 'elevated',
    padding: 'md',
    accent: false,
    selected: false,
  },
};

export const WithFooter: Story = {
  render: (args) => html`
    <sg-card
      variant=${args.variant || 'elevated'}
      padding=${args.padding || 'md'}
      ?accent=${args.accent ?? false}
      ?selected=${args.selected ?? false}
    >
      <div>Main content area.</div>
      <span slot="footer">Updated 2 minutes ago</span>
    </sg-card>
  `,
  args: {
    variant: 'elevated',
    padding: 'md',
    accent: false,
    selected: false,
  },
};

export const FullComposition: Story = {
  render: (args) => html`
    <sg-card
      variant=${args.variant || 'elevated'}
      padding=${args.padding || 'md'}
      ?accent=${args.accent ?? false}
      ?selected=${args.selected ?? false}
    >
      <span slot="header">Profile Card</span>
      <div style="display:flex;gap:16px;align-items:center;">
        <div
          style="width:48px;height:48px;border-radius:50%;background:var(--sg-gradient-spectral, linear-gradient(135deg,rgba(212,134,159,0.5),rgba(122,128,192,0.5)));flex-shrink:0;"
        ></div>
        <div>
          <div style="font-weight:600;">Alex Rivera</div>
          <div style="font-size:0.875rem;opacity:0.6;">Design Engineer</div>
        </div>
      </div>
      <span slot="footer" style="display:flex;gap:8px;justify-content:flex-end;">
        <button style="padding:6px 16px;border-radius:8px;border:1px solid var(--sg-glass-border, rgba(255,255,255,0.12));background:transparent;color:inherit;cursor:pointer;">Profile</button>
        <button style="padding:6px 16px;border-radius:8px;border:none;background:var(--sg-gradient-spectral, linear-gradient(135deg,rgba(212,134,159,0.5),rgba(122,128,192,0.5)));color:#fff;cursor:pointer;">Message</button>
      </span>
    </sg-card>
  `,
  args: {
    variant: 'elevated',
    padding: 'md',
    accent: true,
    selected: false,
  },
};

export const Variants: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-card variant="elevated" padding="md">
        <div><strong>Elevated</strong> — glass surface + spectral glow on hover</div>
      </sg-card>
      <sg-card variant="outlined" padding="md">
        <div><strong>Outlined</strong> — transparent with subtle glow on hover</div>
      </sg-card>
      <sg-card variant="ghost" padding="md">
        <div><strong>Ghost</strong> — minimal, appears on hover</div>
      </sg-card>
    </div>
  `,
};

export const AccentBorder: Story = {
  render: () => html`
    <sg-card variant="elevated" padding="md" accent>
      <div>
        <strong>Spectral accent border</strong><br />
        A 1px gradient border overlay using the full spectrum.
      </div>
    </sg-card>
  `,
};

export const Selected: Story = {
  render: () => html`
    <sg-card variant="elevated" padding="md" selected>
      <div>
        <strong>Selected state</strong><br />
        A thicker (1.5px) gradient border to indicate selection.
      </div>
    </sg-card>
  `,
};

export const SelectedVariants: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-card variant="elevated" padding="md" selected>
        <div>Elevated — selected</div>
      </sg-card>
      <sg-card variant="outlined" padding="md" selected>
        <div>Outlined — selected</div>
      </sg-card>
      <sg-card variant="ghost" padding="md" selected>
        <div>Ghost — selected</div>
      </sg-card>
    </div>
  `,
};

export const PaddingSizes: Story = {
  render: () => html`
    <div style="display:flex;flex-direction:column;gap:16px;">
      <sg-card variant="elevated" padding="sm">
        <div>Small padding (12px)</div>
      </sg-card>
      <sg-card variant="elevated" padding="md">
        <div>Medium padding (20px)</div>
      </sg-card>
      <sg-card variant="elevated" padding="lg">
        <div>Large padding (28px)</div>
      </sg-card>
    </div>
  `,
};
