import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-accordion.js';

const meta: Meta = {
  title: 'Components/SgAccordion',
  component: 'sg-accordion',
  argTypes: {
    multiple: { control: 'boolean' },
  },
  parameters: {
    docs: {
      description: {
        component:
          'Expand/collapse accordion container. Set `multiple` to allow several items open simultaneously.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-accordion ?multiple=${args.multiple ?? false} style="max-width:600px;">
      <sg-accordion-item heading="What is Spectra Glass?">
        A Web Component library with glassmorphism aesthetics and spectral gradients, built with Lit.
      </sg-accordion-item>
      <sg-accordion-item heading="Can I use it with React?">
        Yes — Web Components work with any framework. Import the elements and use them as HTML tags.
      </sg-accordion-item>
      <sg-accordion-item heading="How do I customise the theme?">
        Override CSS custom properties like <code>--sg-glass-bg</code> and <code>--sg-spectral-color1</code>.
      </sg-accordion-item>
    </sg-accordion>
  `,
  args: { multiple: false },
};

export const MultipleOpen: Story = {
  render: () => html`
    <sg-accordion multiple style="max-width:600px;">
      <sg-accordion-item heading="First item" open>
        This item starts open. Others can be opened independently.
      </sg-accordion-item>
      <sg-accordion-item heading="Second item">
        Clicking this won't close the first one because <code>multiple</code> is set.
      </sg-accordion-item>
    </sg-accordion>
  `,
};
