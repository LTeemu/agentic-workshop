import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-footer.js';
import './sg-icon.js';

const meta: Meta = {
  title: 'Components/SgFooter',
  component: 'sg-footer',
  argTypes: {
    columns: {
      control: { type: 'number', min: 1, max: 6 },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Multi-column footer with link columns, social icons slot, and copyright bar. Responsive — collapses from 6 to 2 to 1 columns.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-footer columns=${args.columns ?? 4}>
      <h4 slot="column-1">Product</h4>
      <a slot="column-1" href="#">Features</a>
      <a slot="column-1" href="#">Pricing</a>
      <a slot="column-1" href="#">Changelog</a>
      <a slot="column-1" href="#">Integrations</a>

      <h4 slot="column-2">Company</h4>
      <a slot="column-2" href="#">About</a>
      <a slot="column-2" href="#">Blog</a>
      <a slot="column-2" href="#">Careers</a>
      <a slot="column-2" href="#">Contact</a>

      <h4 slot="column-3">Resources</h4>
      <a slot="column-3" href="#">Documentation</a>
      <a slot="column-3" href="#">API Reference</a>
      <a slot="column-3" href="#">Community</a>
      <a slot="column-3" href="#">Tutorials</a>

      <h4 slot="column-4">Legal</h4>
      <a slot="column-4" href="#">Privacy</a>
      <a slot="column-4" href="#">Terms</a>
      <a slot="column-4" href="#">Cookies</a>

      <a slot="social" href="#" aria-label="Twitter"><sg-icon name="home" size="sm"></sg-icon></a>
      <a slot="social" href="#" aria-label="GitHub"><sg-icon name="user" size="sm"></sg-icon></a>
      <a slot="social" href="#" aria-label="Email"><sg-icon name="mail" size="sm"></sg-icon></a>
      <span slot="copyright">&copy; 2026 Spectra Glass UI. All rights reserved.</span>
    </sg-footer>
  `,
  args: { columns: 4 },
};
