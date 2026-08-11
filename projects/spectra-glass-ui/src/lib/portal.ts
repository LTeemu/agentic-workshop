import { render } from 'lit';

/**
 * Shared portal lifecycle helpers for floating layer components
 * (dialog, select, tooltip, toast-container).
 *
 * Each component owns its portal element reference; these helpers only cover
 * the repeated creation/destruction/listener mechanics, not positioning.
 */

/** Create a portal div with the shared fixed-position / z-index defaults. */
export function createPortalEl(extra: (el: HTMLDivElement) => void = () => {}): HTMLDivElement {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.zIndex = '10000';
  extra(el);
  return el;
}

/**
 * Remove a portal from the DOM and clear its lit render output.
 * When `moveChildrenTo` is given, children are first moved back to that node
 * (used by containers that own their portal children).
 */
export function destroyPortalEl(portal: HTMLDivElement | null, moveChildrenTo?: Node): void {
  if (!portal) return;
  if (moveChildrenTo) {
    while (portal.firstChild) moveChildrenTo.appendChild(portal.firstChild);
  }
  if (portal.parentNode) portal.parentNode.removeChild(portal);
  render(null, portal);
}

/**
 * Register the 'scroll' (capture) + 'resize' viewport listeners used by
 * floating portals; returns a disposer that removes exactly those listeners.
 */
export function trackViewportChange(onChange: () => void): () => void {
  document.addEventListener('scroll', onChange, true);
  window.addEventListener('resize', onChange);
  return () => {
    document.removeEventListener('scroll', onChange, true);
    window.removeEventListener('resize', onChange);
  };
}
