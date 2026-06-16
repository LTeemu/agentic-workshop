/**
 * Vibify — shared cart state backed by window global.
 *
 * All MFs bundle this module independently, but they read/write the same
 * `window.__vibify_cart` array. This guarantees cart state survives MF
 * unmount/remount across tab switches.
 *
 * Mutations emit bus events so that any mounted MF (e.g. Checkout's React
 * component) can react in real time.
 */
import { emit } from './bus.js';

/** Internal: lazily initialise the global cart array. */
function cart() {
  return (window.__vibify_cart ??= []);
}

/**
 * Add an album to the cart (or increment qty if already present).
 * Emits `cart:add` on the bus.
 */
export function addToCart(album) {
  const items = cart();
  const existing = items.find((i) => i.id === album.id);
  if (existing) {
    existing.qty += 1;
  } else {
    items.push({ ...album, qty: 1 });
  }
  emit('cart:add', album);
}

/**
 * Remove an item from the cart by album id.
 * Emits `cart:remove` on the bus.
 */
export function removeFromCart(id) {
  const items = cart();
  const idx = items.findIndex((i) => i.id === id);
  if (idx !== -1) {
    items.splice(idx, 1);
    emit('cart:remove', { id });
  }
}

/** Return a shallow copy of the current cart items. */
export function getCart() {
  return [...cart()];
}

/** Total number of unique items in the cart. */
export function getItemCount() {
  return cart().length;
}

/** Total quantity across all items. */
export function getTotalQty() {
  return cart().reduce((sum, i) => sum + i.qty, 0);
}

/** Sum of price × qty for all items. */
export function getTotal() {
  return cart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

/**
 * Check if an album id is already in the cart.
 */
export function isInCart(id) {
  return cart().some((i) => i.id === id);
}

/**
 * Set the quantity of an item. If qty ≤ 0 the item is removed.
 * Emits `cart:add` or `cart:remove` as appropriate.
 */
export function setItemQty(id, qty) {
  const items = cart();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  if (qty <= 0) {
    items.splice(idx, 1);
    emit('cart:remove', { id });
  } else {
    items[idx].qty = qty;
    emit('cart:add', items[idx]);
  }
}

/**
 * Clear the cart entirely.
 * Emits `cart:clear` on the bus.
 */
export function clearCart() {
  cart().length = 0;
  emit('cart:clear', {});
}
