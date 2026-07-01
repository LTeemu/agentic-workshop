import { html, type TemplateResult } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components';
import './theme-builder.js';

const meta: Meta = {
  title: 'Tools/Theme Builder',
  component: 'sg-theme-builder',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'deep-space' },
    controls: { disable: true },
    actions: { disable: true },
  },
};

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: (): TemplateResult => html`
    <sg-theme-builder></sg-theme-builder>
  `,
};
