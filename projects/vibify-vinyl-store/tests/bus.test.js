import { describe, it, expect, beforeEach } from 'vitest';
import { on, emit, once, clearBus, createNamespace } from '../shared/bus.js';

describe('EventBus', () => {
  beforeEach(() => {
    clearBus();
  });

  it('subscribes and receives emitted events', () => {
    const results = [];
    on('test:event', (data) => results.push(data));
    emit('test:event', { foo: 'bar' });
    expect(results).toEqual([{ foo: 'bar' }]);
  });

  it('supports wildcard listeners', () => {
    const results = [];
    on('cart.*', (data) => results.push(data));
    emit('cart.add', { id: 1 });
    emit('cart.remove', { id: 2 });
    expect(results).toHaveLength(2);
  });

  it('once listener fires only once', () => {
    let count = 0;
    once('test:once', () => count++);
    emit('test:once', {});
    emit('test:once', {});
    expect(count).toBe(1);
  });

  it('returns unsubscribe function that prevents further calls', () => {
    const results = [];
    const unsub = on('test:unsub', (data) => results.push(data));
    unsub();
    emit('test:unsub', {});
    expect(results).toHaveLength(0);
  });

  it('handles invalid event names gracefully', () => {
    const result = emit('', {});
    expect(result).toEqual([]);
  });

  it('supports deep wildcard patterns', () => {
    const results = [];
    on('vibify.**', (data) => results.push(data));
    emit('vibify.cart.add', { id: 1 });
    emit('vibify.player.play', { id: 2 });
    expect(results).toHaveLength(2);
  });

  it('executes listeners in priority order', () => {
    const order = [];
    on('test', () => order.push('low'), { priority: 0 });
    on('test', () => order.push('high'), { priority: 10 });
    emit('test', {});
    expect(order).toEqual(['high', 'low']);
  });
});

describe('createNamespace', () => {
  beforeEach(() => {
    clearBus();
  });

  it('prefixes events with the namespace', () => {
    const ns = createNamespace('checkout');
    const results = [];
    on('checkout.add', (data) => results.push(data));
    ns.emit('add', { id: 1 });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ id: 1 });
  });

  it('returns filtered history for the namespace', () => {
    const ns = createNamespace('cart');
    ns.emit('add', { id: 1 });
    ns.emit('remove', { id: 1 });
    const history = ns.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].event).toBe('cart.add');
  });
});
