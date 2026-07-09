import { describe, it, expect, beforeEach } from 'vitest';
import {
  addToCart,
  removeFromCart,
  getCart,
  clearCart,
  getTotal,
  getItemCount,
  getTotalQty,
  isInCart,
  setItemQty,
} from '../shared/cart.js';

describe('Cart', () => {
  const album = { id: 'album-1', name: 'Test Album', price: 9.99 };

  beforeEach(() => {
    clearCart();
  });

  it('starts empty', () => {
    expect(getCart()).toHaveLength(0);
    expect(getItemCount()).toBe(0);
    expect(getTotalQty()).toBe(0);
    expect(getTotal()).toBe(0);
  });

  it('adds an item', () => {
    addToCart(album);
    expect(getCart()).toHaveLength(1);
    expect(getItemCount()).toBe(1);
    expect(getTotalQty()).toBe(1);
  });

  it('increments quantity for duplicate items', () => {
    addToCart(album);
    addToCart(album);
    expect(getItemCount()).toBe(1);
    expect(getTotalQty()).toBe(2);
    expect(getTotal()).toBe(19.98);
  });

  it('removes an item by id', () => {
    addToCart(album);
    removeFromCart(album.id);
    expect(getCart()).toHaveLength(0);
    expect(getItemCount()).toBe(0);
  });

  it('checks if an item is in the cart', () => {
    expect(isInCart(album.id)).toBe(false);
    addToCart(album);
    expect(isInCart(album.id)).toBe(true);
  });

  it('removes nothing when removing a non-existent item', () => {
    addToCart(album);
    removeFromCart('nonexistent');
    expect(getItemCount()).toBe(1);
  });

  it('clears all items', () => {
    addToCart(album);
    addToCart({ id: 'album-2', name: 'Album 2', price: 5 });
    clearCart();
    expect(getCart()).toHaveLength(0);
    expect(getTotal()).toBe(0);
  });

  it('sets item quantity', () => {
    addToCart(album);
    setItemQty(album.id, 3);
    expect(getTotalQty()).toBe(3);
    expect(getTotal()).toBe(29.97);
  });

  it('removes item when quantity set to zero', () => {
    addToCart(album);
    setItemQty(album.id, 0);
    expect(getItemCount()).toBe(0);
  });

  it('does nothing when setting quantity on non-existent item', () => {
    setItemQty('nonexistent', 3);
    expect(getCart()).toHaveLength(0);
  });

  it('returns a copy of the cart array', () => {
    addToCart(album);
    const cart = getCart();
    cart.length = 0;
    // Original should be unaffected
    expect(getItemCount()).toBe(1);
  });
});
