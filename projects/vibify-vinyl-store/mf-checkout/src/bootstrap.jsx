import CartCheckout from './components/CartCheckout.jsx';

const rootMap = new WeakMap();

/**
 * Mount the React checkout microfrontend into a DOM element.
 *
 * Receives `createRoot` from the host so that ReactDOM uses the host's React
 * internals, preventing the "Invalid hook call" error caused by duplicate
 * React instances (the micro-frontend bundles its own react-dom inline).
 *
 * @param {HTMLElement} el
 * @param {{ createRoot: Function }} options - must provide createRoot
 * @returns {{ unmount: () => void }}
 */
export function mount(el, { createRoot }) {
  let root = rootMap.get(el);
  if (!root) {
    root = createRoot(el);
    rootMap.set(el, root);
  }
  root.render(<CartCheckout />);
  return { unmount: () => root.unmount() };
}
