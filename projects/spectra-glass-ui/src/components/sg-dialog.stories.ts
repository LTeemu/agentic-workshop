import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-dialog.js';
import './sg-button.js';

const meta: Meta = {
  title: 'Components/SgDialog',
  component: 'sg-dialog',
  argTypes: {
    open: { control: 'boolean' },
    closable: { control: 'boolean' },
    backdropDismiss: { control: 'boolean' },
    title: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A glassmorphic modal with backdrop blur. Press Escape or click the backdrop to close.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Closed: Story = {
  render: (args) => html`
    <sg-dialog
      ?open=${args.open}
      ?closable=${args.closable}
      ?backdrop-dismiss=${args.backdropDismiss}
      title=${args.title || 'Dialog Title'}
    >
      <p>This is the dialog body content. It supports any HTML or slotted content.</p>
      <p>
        Press <strong>Escape</strong> or click the backdrop to close.
      </p>
      <span slot="footer">
        <sg-button variant="ghost" size="sm">Cancel</sg-button>
        <sg-button variant="primary" size="sm">Confirm</sg-button>
      </span>
    </sg-dialog>
  `,
  args: {
    open: false,
    closable: true,
    backdropDismiss: true,
    title: 'Dialog Title',
  },
};

export const Open: Story = {
  render: (args) => html`
    <sg-dialog
      ?open=${args.open}
      ?closable=${args.closable}
      ?backdrop-dismiss=${args.backdropDismiss}
      title=${args.title || 'Dialog Title'}
    >
      <p>This dialog is open by default. It demonstrates the glass surface with backdrop blur.</p>
      <span slot="footer">
        <sg-button variant="ghost" size="sm">Cancel</sg-button>
        <sg-button variant="primary" size="sm">Save</sg-button>
      </span>
    </sg-dialog>
  `,
  args: {
    open: true,
    closable: true,
    backdropDismiss: true,
    title: 'Dialog Title',
  },
};

export const NoFooter: Story = {
  render: () => html`
    <sg-dialog open title="Information">
      <p>A simple dialog with no footer actions, just a close button.</p>
    </sg-dialog>
  `,
};

export const LongContent: Story = {
  render: () => html`
    <sg-dialog open title="Terms of Service">
      <p>1. Acceptance of Terms</p>
      <p>By accessing and using this service, you accept and agree to be bound by the terms and conditions.</p>
      <p>2. Description of Service</p>
      <p>We provide a platform for demonstrating web components built with the Spectra Glass design system.</p>
      <p>3. Intellectual Property</p>
      <p>All components, styles, and documentation are provided under the MIT license.</p>
      <p>4. Limitation of Liability</p>
      <p>In no event shall the authors be liable for any claim, damages, or other liability.</p>
      <span slot="footer">
        <sg-button variant="secondary" size="sm">Decline</sg-button>
        <sg-button variant="primary" size="sm">Accept</sg-button>
      </span>
    </sg-dialog>
  `,
};
