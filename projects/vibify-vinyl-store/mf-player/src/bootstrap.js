import { mount as svelteMount, unmount } from 'svelte';
import Player from './Player.svelte';

/**
 * Mount the Svelte player microfrontend into a DOM element.
 * @param {HTMLElement} el
 * @returns {{ unmount: () => void }}
 */
export function mount(el) {
  const app = svelteMount(Player, { target: el });
  return { unmount: () => unmount(app) };
}
