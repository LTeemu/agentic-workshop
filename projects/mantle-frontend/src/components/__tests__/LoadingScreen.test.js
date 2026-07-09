import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import LoadingScreen from '../LoadingScreen.vue';

describe('LoadingScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the Mantle brand text', () => {
    const wrapper = mount(LoadingScreen);
    expect(wrapper.text()).toContain('MANTLE');
  });

  it('renders the loading mark', () => {
    const wrapper = mount(LoadingScreen);
    expect(wrapper.find('.loading-mark').text()).toBe('M');
  });

  it('shows the loading bar', () => {
    const wrapper = mount(LoadingScreen);
    expect(wrapper.find('.loading-bar-track').exists()).toBe(true);
    expect(wrapper.find('.loading-bar-fill').exists()).toBe(true);
  });

  it('is visible on mount', () => {
    const wrapper = mount(LoadingScreen);
    expect(wrapper.find('.loading-screen').exists()).toBe(true);
  });

  it('emits loaded event after timeout', () => {
    const wrapper = mount(LoadingScreen);

    // After initial timeout (2200ms) + CSS transition delay (800ms)
    vi.advanceTimersByTime(3000);

    expect(wrapper.emitted('loaded')).toBeTruthy();
  });

  it('hides the loading screen after the first timeout', async () => {
    const wrapper = mount(LoadingScreen);

    // First timeout fires → visible.value = false
    vi.advanceTimersByTime(2200);
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.loading-screen').exists()).toBe(false);
  });
});
