import { createApp } from 'vue';
import App from './App.vue';

/**
 * Mount the Vue catalog microfrontend into a DOM element.
 * @param {HTMLElement} el
 * @returns {{ unmount: () => void }}
 */
export function mount(el) {
  const app = createApp(App);
  app.mount(el);
  return { unmount: () => app.unmount() };
}
