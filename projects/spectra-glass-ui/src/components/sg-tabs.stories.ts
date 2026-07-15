import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import './sg-tabs.js';

const meta: Meta = {
  title: 'Components/SgTabs',
  component: 'sg-tabs',
  argTypes: {
    variant: { control: 'select', options: ['glass', 'underline', 'pills'] },
    tabs: { control: 'object' },
    activeTab: { control: 'text' },
  },
  parameters: {
    docs: {
      description: {
        component: 'A tabbed container with glassmorphism styling.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: (args) => html`
    <sg-tabs
      .tabs=${args.tabs}
      .activeTab=${args.activeTab}
      variant=${args.variant || 'glass'}
    >
      <div slot="tab1">Welcome to the dashboard. Here you'll find an overview of your recent activity and quick actions.</div>
      <div slot="tab2">Your profile settings including preferences, notifications, and account details.</div>
      <div slot="tab3">Security settings to manage your password, two-factor authentication, and session history.</div>
    </sg-tabs>
  `,
  args: {
    variant: 'glass',
    tabs: [
      { id: 'tab1', label: 'Overview' },
      { id: 'tab2', label: 'Settings' },
      { id: 'tab3', label: 'Security' },
    ],
  },
};

export const Underline: Story = {
  render: (args) => html`
    <sg-tabs
      .tabs=${args.tabs}
      .activeTab=${args.activeTab}
      variant=${'underline'}
    >
      <div slot="tab1">Underline style — simple and clean.</div>
      <div slot="tab2">An underline indicator shows the active tab.</div>
      <div slot="tab3">No glass background on the active tab.</div>
    </sg-tabs>
  `,
  args: {
    variant: 'underline',
    tabs: [
      { id: 'tab1', label: 'Design' },
      { id: 'tab2', label: 'Code' },
      { id: 'tab3', label: 'Deploy' },
    ],
  },
  argTypes: {
    variant: { table: { disable: true } },
  },
};

export const Pills: Story = {
  render: (args) => html`
    <sg-tabs
      .tabs=${args.tabs}
      .activeTab=${args.activeTab}
      variant=${'pills'}
    >
      <div slot="tab1">Pills variant with rounded active indicator.</div>
      <div slot="tab2">Active tab has a solid background fill.</div>
      <div slot="tab3">Great for filter-style navigation.</div>
    </sg-tabs>
  `,
  args: {
    variant: 'pills',
    tabs: [
      { id: 'tab1', label: 'All' },
      { id: 'tab2', label: 'Active' },
      { id: 'tab3', label: 'Archived' },
    ],
  },
  argTypes: {
    variant: { table: { disable: true } },
  },
};

export const Preselected: Story = {
  render: (args) => html`
    <sg-tabs
      .tabs=${args.tabs}
      .activeTab=${args.activeTab}
      variant=${args.variant || 'glass'}
    >
      <div slot="general">General settings panel.</div>
      <div slot="advanced">Advanced configuration options for power users.</div>
      <div slot="admin">Admin-only controls and system preferences.</div>
    </sg-tabs>
  `,
  args: {
    variant: 'glass',
    tabs: [
      { id: 'general', label: 'General' },
      { id: 'advanced', label: 'Advanced' },
      { id: 'admin', label: 'Admin' },
    ],
    activeTab: 'advanced',
  },
};

export const WithDisabled: Story = {
  render: (args) => html`
    <sg-tabs
      .tabs=${args.tabs}
      .activeTab=${args.activeTab}
      variant=${args.variant || 'glass'}
    >
      <div slot="public">Public profile visible to everyone.</div>
      <div slot="private">Private information — requires authentication.</div>
      <div slot="hidden">Hidden content only accessible via direct link.</div>
    </sg-tabs>
  `,
  args: {
    variant: 'glass',
    tabs: [
      { id: 'public', label: 'Public' },
      { id: 'private', label: 'Private', disabled: true },
      { id: 'hidden', label: 'Hidden' },
    ],
  },
};
