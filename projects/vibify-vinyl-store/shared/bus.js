/**
 * Vibify — shared event bus for cross-microfrontend communication.
 * Enhanced pub/sub with debugging, wildcards, and better error handling.
 */

const BUS =
  window.__vibify_bus ||
  (window.__vibify_bus = {
    listeners: {},
    onceListeners: {},
    history: [],
    debug: false,
  });

// Enable debug mode in development
if (import.meta.env?.DEV) {
  BUS.debug = true;
}

/**
 * Subscribe to an event
 * @param {string} event - Event name (supports wildcards with *)
 * @param {Function} fn - Callback function
 * @param {Object} options - { once: boolean, priority: number }
 * @returns {Function} Unsubscribe function
 */
export function on(event, fn, options = {}) {
  const { once = false, priority = 0 } = options;

  // Validate
  if (typeof event !== 'string' || !event) {
    console.warn('[Bus] Invalid event name:', event);
    return () => {};
  }

  if (typeof fn !== 'function') {
    console.warn('[Bus] Invalid listener function for event:', event);
    return () => {};
  }

  // Store listeners with priority for ordered execution
  const listeners = once ? BUS.onceListeners : BUS.listeners;

  if (!listeners[event]) {
    listeners[event] = [];
  }

  // Insert with priority (higher priority = executed first)
  const listener = { fn, priority, id: Date.now() + Math.random() };

  const index = listeners[event].findIndex((l) => l.priority < priority);
  if (index === -1) {
    listeners[event].push(listener);
  } else {
    listeners[event].splice(index, 0, listener);
  }

  if (BUS.debug) {
    console.log(`[Bus] Subscribed to "${event}"`, { once, priority });
  }

  // Return unsubscribe function
  return () => {
    listeners[event] = listeners[event]?.filter((l) => l !== listener);
    if (BUS.debug) {
      console.log(`[Bus] Unsubscribed from "${event}"`);
    }
  };
}

/**
 * Subscribe to an event once
 */
export function once(event, fn, options = {}) {
  return on(event, fn, { ...options, once: true });
}

/**
 * Emit an event
 * @param {string} event - Event name
 * @param {*} data - Event data
 * @param {Object} options - { sender: string, async: boolean }
 * @returns {Promise<Array>|Array} - Results from all listeners
 */
export function emit(event, data, options = {}) {
  const { sender = 'unknown', async = false } = options;

  if (typeof event !== 'string' || !event) {
    console.warn('[Bus] Invalid event name for emit:', event);
    return async ? Promise.resolve([]) : [];
  }

  // Create event envelope
  const envelope = {
    event,
    data,
    sender,
    timestamp: Date.now(),
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  // Log to history for debugging
  if (BUS.debug) {
    BUS.history.push(envelope);
    if (BUS.history.length > 1000) {
      BUS.history.shift();
    }
    console.log(`[Bus] Emitting "${event}"`, { sender, data });
  }

  // Get all matching listeners (including wildcards)
  const listeners = getAllMatchingListeners(event);

  if (listeners.length === 0 && BUS.debug) {
    console.warn(`[Bus] No listeners for event "${event}"`);
  }

  // Execute listeners
  const results = [];

  const executeListener = (listener) => {
    try {
      const result = listener.fn(data, envelope);
      results.push({ success: true, result });
      return result;
    } catch (error) {
      // Don't swallow errors in development
      if (BUS.debug) {
        console.error(`[Bus] Error in listener for "${event}":`, error);
      }
      results.push({ success: false, error });
    }
  };

  if (async) {
    return Promise.all(listeners.map(executeListener));
  } else {
    listeners.forEach(executeListener);
    return results;
  }
}

/**
 * Get all matching listeners (supports wildcards)
 */
function getAllMatchingListeners(event) {
  const allListeners = [];

  // Get exact matches
  const exact = BUS.listeners[event] || [];
  allListeners.push(...exact);

  // Get once listeners
  const onceListeners = BUS.onceListeners[event] || [];
  allListeners.push(...onceListeners);

  // Get wildcard matches
  Object.keys(BUS.listeners).forEach((key) => {
    if (key.includes('*') && matchesWildcard(event, key)) {
      allListeners.push(...BUS.listeners[key]);
    }
  });

  Object.keys(BUS.onceListeners).forEach((key) => {
    if (key.includes('*') && matchesWildcard(event, key)) {
      allListeners.push(...BUS.onceListeners[key]);
    }
  });

  // Sort by priority
  allListeners.sort((a, b) => b.priority - a.priority);

  // Clean up once listeners
  if (BUS.onceListeners[event]) {
    BUS.onceListeners[event] = [];
  }

  return allListeners;
}

/**
 * Check if event matches wildcard pattern
 * Supports: * (wildcard) and ** (deep wildcard)
 */
function matchesWildcard(event, pattern) {
  if (pattern === '*') return true;

  const eventParts = event.split('.');
  const patternParts = pattern.split('.');

  if (patternParts[patternParts.length - 1] === '**') {
    // Deep wildcard matches all remaining parts
    const prefixParts = patternParts.slice(0, -1);
    return (
      eventParts.length >= prefixParts.length &&
      prefixParts.every((p, i) => p === '*' || p === eventParts[i])
    );
  }

  if (eventParts.length !== patternParts.length) return false;

  return patternParts.every((p, i) => p === '*' || p === eventParts[i]);
}

/**
 * Clear all listeners (useful for testing)
 */
export function clearBus() {
  BUS.listeners = {};
  BUS.onceListeners = {};
  BUS.history = [];
  if (BUS.debug) {
    console.log('[Bus] Cleared all listeners');
  }
}

/**
 * Get event history (debugging)
 */
export function getHistory() {
  return BUS.history;
}

/**
 * Get list of active listeners (debugging)
 */
export function getListeners() {
  const all = {};
  Object.keys(BUS.listeners).forEach((key) => {
    all[key] = BUS.listeners[key].length;
  });
  Object.keys(BUS.onceListeners).forEach((key) => {
    all[key] = (all[key] || 0) + BUS.onceListeners[key].length;
  });
  return all;
}

/**
 * Create a namespaced bus (for specific microfrontends)
 */
export function createNamespace(namespace) {
  return {
    on: (event, fn, options) => on(`${namespace}.${event}`, fn, options),
    once: (event, fn, options) => once(`${namespace}.${event}`, fn, options),
    emit: (event, data, options) =>
      emit(`${namespace}.${event}`, data, { ...options, sender: namespace }),
    getHistory: () => getHistory().filter((e) => e.event.startsWith(`${namespace}.`)),
  };
}
