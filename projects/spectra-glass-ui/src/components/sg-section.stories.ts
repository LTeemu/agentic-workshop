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
      ?glass=${args.glass ?? true}
      accent=${args.accent || 'none'}
    >
      <div style="padding:2rem;text-align:center;">Section content with glass background</div>
    </sg-section>
  `,
  args: { padding: 'lg', maxWidth: 'lg', glass: true, accent: 'none' },
};

export const Glass: Story = {
  render: (args) => html`
    <sg-section
      ?glass=${args.glass ?? true}
      padding=${args.padding || 'lg'}
      max-width=${args.maxWidth || 'lg'}
      accent=${args.accent || 'none'}
    >
      <div style="padding:2rem;text-align:center;">Glass section with blur</div>
    </sg-section>
  `,
  args: { glass: true, padding: 'lg', maxWidth: 'lg', accent: 'none' },
  argTypes: {
    glass: { control: 'boolean' },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
    maxWidth: { control: 'select', options: ['sm', 'md', 'lg', 'full'] },
    accent: { control: 'select', options: ['none', 'top', 'bottom', 'both'] },
  },
};

export const WithAccent: Story = {
  render: (args) => html`
    <sg-section
      accent=${args.accent || 'both'}
      padding=${args.padding || 'md'}
      max-width=${args.maxWidth || 'lg'}
      ?glass=${args.glass ?? false}
    >
      <div style="padding:2rem;text-align:center;">Section with gradient top and bottom edges</div>
    </sg-section>
  `,
  args: { accent: 'both', padding: 'md', maxWidth: 'lg', glass: false },
  argTypes: {
    accent: { control: 'select', options: ['none', 'top', 'bottom', 'both'] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg', 'xl'] },
    maxWidth: { control: 'select', options: ['sm', 'md', 'lg', 'full'] },
    glass: { control: 'boolean' },
  },
};

export const PaddingCompare: Story = {
  render: (args) => html`
    <sg-section
      padding="sm"
      max-width=${args.maxWidth || 'lg'}
      ?glass=${args.glass ?? true}
      accent=${args.accent || 'none'}
    >
      <div style="text-align:center;">Small padding (sm)</div>
    </sg-section>
    <sg-section
      padding="xl"
      max-width=${args.maxWidth || 'lg'}
      ?glass=${args.glass ?? true}
      accent=${args.accent || 'none'}
    >
      <div style="text-align:center;">Extra-large padding (xl)</div>
    </sg-section>
  `,
  args: { maxWidth: 'lg', glass: true, accent: 'none' },
  argTypes: {
    padding: { table: { disable: true } },
    maxWidth: { control: 'select', options: ['sm', 'md', 'lg', 'full'] },
    glass: { control: 'boolean' },
    accent: { control: 'select', options: ['none', 'top', 'bottom', 'both'] },
  },
};
