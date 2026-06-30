import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-toast.js';
import './sg-toast-container.js';

const meta: Meta = {
  title: 'Components/SgToast',
  component: 'sg-toast',
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'error'] },
    open: { control: 'boolean' },
    dismissible: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component: 'A glassmorphic toast notification with variant icons and optional dismiss.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Info: Story = {
  render: (args) => html`
    <sg-toast
      variant=${args.variant || 'info'}
      ?open=${args.open}
      ?dismissible=${args.dismissible}
      duration="0"
    >
      Your changes have been saved successfully.
    </sg-toast>
  `,
  args: { variant: 'info', open: true, dismissible: true },
};

export const Success: Story = {
  render: (args) => html`
    <sg-toast
      variant=${args.variant || 'success'}
      ?open=${args.open}
      ?dismissible=${args.dismissible}
      duration="0"
    >
      Operation completed successfully.
    </sg-toast>
  `,
  args: { variant: 'success', open: true, dismissible: true },
};

export const Warning: Story = {
  render: (args) => html`
    <sg-toast
      variant=${args.variant || 'warning'}
      ?open=${args.open}
      ?dismissible=${args.dismissible}
      duration="0"
    >
      Your session is about to expire.
    </sg-toast>
  `,
  args: { variant: 'warning', open: true, dismissible: true },
};

export const Error: Story = {
  render: (args) => html`
    <sg-toast
      variant=${args.variant || 'error'}
      ?open=${args.open}
      ?dismissible=${args.dismissible}
      duration="0"
    >
      Something went wrong. Please try again.
    </sg-toast>
  `,
  args: { variant: 'error', open: true, dismissible: true },
};

export const AllVariants: Story = {
  render: () => html`
    <sg-toast-container position="top-right" style="position:relative;min-height:260px;">
      <sg-toast variant="info" open duration="0">
        Your changes have been saved successfully.
      </sg-toast>
      <sg-toast variant="success" open duration="0">
        Operation completed successfully.
      </sg-toast>
      <sg-toast variant="warning" open duration="0">
        Your session is about to expire.
      </sg-toast>
      <sg-toast variant="error" open duration="0">
        Something went wrong. Please try again.
      </sg-toast>
    </sg-toast-container>
  `,
};

export const NotDismissible: Story = {
  render: (args) => html`
    <sg-toast
      variant=${args.variant || 'info'}
      ?open=${args.open}
      ?dismissible=${args.dismissible}
      duration="0"
    >
      This notification cannot be dismissed.
    </sg-toast>
  `,
  args: { variant: 'info', open: true, dismissible: false },
};
