import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-tooltip.js';

const meta: Meta = {
  title: 'Components/SgTooltip',
  component: 'sg-tooltip',
  argTypes: {
    label: { control: 'text' },
    position: { control: 'select', options: ['auto', 'top', 'bottom', 'left', 'right'] },
  },
  parameters: {
    docs: {
      description: {
        component: 'A glassmorphic tooltip that appears on hover or focus.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Top: Story = {
  render: (args) => html`
    <div style="display:flex;justify-content:center;padding:60px 0;">
      <sg-tooltip label=${args.label || 'Tooltip on top'} position=${'top'}>
        <button style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);cursor:pointer;font-family:inherit;">Hover me</button>
      </sg-tooltip>
    </div>
  `,
  args: { label: 'Tooltip on top', position: 'top' },
  argTypes: {
    position: { table: { disable: true } },
  },
};

export const Bottom: Story = {
  render: (args) => html`
    <div style="display:flex;justify-content:center;padding:60px 0;">
      <sg-tooltip label=${args.label || 'Tooltip on bottom'} position=${'bottom'}>
        <button style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);cursor:pointer;font-family:inherit;">Hover me</button>
      </sg-tooltip>
    </div>
  `,
  args: { label: 'Tooltip on bottom', position: 'bottom' },
  argTypes: {
    position: { table: { disable: true } },
  },
};

export const Left: Story = {
  render: (args) => html`
    <div style="display:flex;justify-content:center;padding:60px 0;">
      <sg-tooltip label=${args.label || 'Tooltip on left'} position=${'left'}>
        <button style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);cursor:pointer;font-family:inherit;">Hover me</button>
      </sg-tooltip>
    </div>
  `,
  args: { label: 'Tooltip on left', position: 'left' },
  argTypes: {
    position: { table: { disable: true } },
  },
};

export const Right: Story = {
  render: (args) => html`
    <div style="display:flex;justify-content:center;padding:60px 0;">
      <sg-tooltip label=${args.label || 'Tooltip on right'} position=${'right'}>
        <button style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);cursor:pointer;font-family:inherit;">Hover me</button>
      </sg-tooltip>
    </div>
  `,
  args: { label: 'Tooltip on right', position: 'right' },
  argTypes: {
    position: { table: { disable: true } },
  },
};

export const AllPositions: Story = {
  render: () => html`
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:80px;padding:80px 40px;max-width:500px;margin:0 auto;">
      <div style="display:flex;justify-content:center;">
        <sg-tooltip label="Top tooltip" position="top">
          <button style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);cursor:pointer;font-family:inherit;">Top</button>
        </sg-tooltip>
      </div>
      <div style="display:flex;justify-content:center;">
        <sg-tooltip label="Bottom tooltip" position="bottom">
          <button style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);cursor:pointer;font-family:inherit;">Bottom</button>
        </sg-tooltip>
      </div>
      <div style="display:flex;justify-content:center;">
        <sg-tooltip label="Left tooltip" position="left">
          <button style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);cursor:pointer;font-family:inherit;">Left</button>
        </sg-tooltip>
      </div>
      <div style="display:flex;justify-content:center;">
        <sg-tooltip label="Right tooltip" position="right">
          <button style="padding:8px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);cursor:pointer;font-family:inherit;">Right</button>
        </sg-tooltip>
      </div>
    </div>
  `,
  parameters: { controls: { disable: true } },
};
