import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-footer.js';
import './sg-icon.js';

const meta: Meta = {
  title: 'Components/SgFooter',
  component: 'sg-footer',
  argTypes: {
    columns: {
      control: { type: 'number', min: 1, max: 4 },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Multi-column footer with link columns, social icons slot, and copyright bar. Responsive — collapses from 4 to 2 to 1 columns.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-footer columns=${args.columns ?? 4}>
      <div slot="column-1">
        <h4>Product</h4>
        <a href="#">Features</a>
        <a href="#">Pricing</a>
        <a href="#">Changelog</a>
      </div>
      <div slot="column-2">
        <h4>Company</h4>
        <a href="#">About</a>
        <a href="#">Blog</a>
        <a href="#">Careers</a>
      </div>
      <div slot="column-3">
        <h4>Resources</h4>
        <a href="#">Documentation</a>
        <a href="#">API Reference</a>
        <a href="#">Community</a>
      </div>
      <div slot="column-4">
        <h4>Legal</h4>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Cookies</a>
      </div>
      <a slot="social" href="#" aria-label="Twitter"><sg-icon name="external-link" size="sm"></sg-icon></a>
      <a slot="social" href="#" aria-label="GitHub"><sg-icon name="external-link" size="sm"></sg-icon></a>
      <span slot="copyright">&copy; 2026 Spectra Glass UI. All rights reserved.</span>
    </sg-footer>
  `,
  args: { columns: 4 },
};
