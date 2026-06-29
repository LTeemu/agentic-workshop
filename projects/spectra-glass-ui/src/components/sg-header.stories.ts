import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-header.js';
import './sg-button.js';

const meta: Meta = {
  title: 'Components/SgHeader',
  component: 'sg-header',
  argTypes: {
    sticky: { control: 'boolean' },
    menuOpen: { control: 'boolean' },
    mobileBreakpoint: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Responsive navigation bar with sticky support, desktop nav slot, and mobile slide-out drawer with backdrop.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-header ?sticky=${args.sticky ?? true} mobile-breakpoint=${args.mobileBreakpoint || '768px'}>
      <span slot="logo" style="font-weight:700;font-size:1.25rem;color:rgba(255,255,255,0.9);">
        Spectra
      </span>
      <a slot="nav" href="#" style="color:rgba(255,255,255,0.6);text-decoration:none;padding:0 12px;">Features</a>
      <a slot="nav" href="#" style="color:rgba(255,255,255,0.6);text-decoration:none;padding:0 12px;">Pricing</a>
      <a slot="nav" href="#" style="color:rgba(255,255,255,0.6);text-decoration:none;padding:0 12px;">Docs</a>
      <sg-button slot="cta" variant="primary" size="sm">Get Started</sg-button>
    </sg-header>
  `,
  args: { sticky: true, mobileBreakpoint: '768px' },
};
