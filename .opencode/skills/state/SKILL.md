---
name: state
description: 'Client-side state management — observable stores, event-driven state, computed/derived values, immutable updates, subscriptions, DOM binding, localStorage persistence, middleware.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [state, store, reactive, observable, state-management, frontend]
tools: [opencode, claude, cursor, gemini]
---

# State Management

You are a **state management specialist**. You design client-side state systems that are predictable, debuggable, and performant — without framework lock-in.

## Store Patterns

### Simple reactive store (event emitter)

```javascript
function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();

  return {
    getState() {
      return state;
    },
    setState(partial) {
      const prev = state;
      state = { ...state, ...partial };
      for (const fn of listeners) fn(state, prev);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    reset() {
      state = { ...initial };
      for (const fn of listeners) fn(state, state);
    },
  };
}

const store = createStore({ count: 0, user: null });
const unsub = store.subscribe((state, prev) => {
  console.log('State changed:', prev, '→', state);
});
store.setState({ count: 1 });
```

### With computed / derived values

```javascript
function createComputedStore(initial, computeds) {
  const store = createStore(initial);
  const cache = new Map();

  function compute(key) {
    if (!cache.has(key)) {
      cache.set(key, computeds[key](store.getState()));
    }
    return cache.get(key);
  }

  const origSubscribe = store.subscribe;
  store.subscribe = function (fn) {
    return origSubscribe(() => {
      cache.clear();
      fn(store.getState());
    });
  };

  store.compute = compute;
  return store;
}

const cartStore = createComputedStore(
  { items: [], taxRate: 0.08 },
  {
    total: (s) => s.items.reduce((sum, i) => sum + i.price * i.qty, 0),
    tax: (s) => s.items.reduce((sum, i) => sum + i.price * i.qty * s.taxRate, 0),
    grandTotal: (s) => s.computed.total + s.computed.tax,
    itemCount: (s) => s.items.reduce((sum, i) => sum + i.qty, 0),
  },
);
```

### With undo history

```javascript
function createUndoStore(initial, maxHistory = 50) {
  const store = createStore(initial);
  const past = [];
  let future = [];

  return {
    ...store,
    setState(partial) {
      past.push({ ...store.getState() });
      if (past.length > maxHistory) past.shift();
      future = [];
      store.setState(partial);
    },
    undo() {
      if (!past.length) return;
      const current = store.getState();
      const prev = past.pop();
      future.push(current);
      store.setState(prev);
    },
    redo() {
      if (!future.length) return;
      const current = store.getState();
      const next = future.pop();
      past.push(current);
      store.setState(next);
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
```

### Store composition (slices)

```javascript
function combineStores(slices) {
  const keys = Object.keys(slices);
  const combined = createStore(Object.fromEntries(keys.map((k) => [k, slices[k].getState()])));

  const unsubs = keys.map((k) =>
    slices[k].subscribe((sliceState) => {
      combined.setState({ [k]: sliceState });
    }),
  );

  combined.destroy = () => unsubs.forEach((fn) => fn());
  return combined;
}

// Usage
const auth = createStore({ user: null, token: null });
const cart = createStore({ items: [] });
const app = combineStores({ auth, cart });
```

## State Update Patterns

### Immutable update helpers

```javascript
// Update nested property safely
function setIn(obj, path, value) {
  const keys = Array.isArray(path) ? path : path.split('.');
  if (keys.length === 0) return value;
  const [head, ...rest] = keys;
  return {
    ...obj,
    [head]: setIn(obj[head] || {}, rest, value),
  };
}

// Toggle item in array (add/remove)
function toggleItem(arr, item, key = 'id') {
  const exists = arr.find((i) => i[key] === item[key]);
  return exists ? arr.filter((i) => i[key] !== item[key]) : [...arr, item];
}

// Update item in array by key
function updateItem(arr, id, changes, key = 'id') {
  return arr.map((i) => (i[key] === id ? { ...i, ...changes } : i));
}

// Remove item from array by key
function removeItem(arr, id, key = 'id') {
  return arr.filter((i) => i[key] !== id);
}
```

### Batch updates (reduce renders)

```javascript
function batchStore(store) {
  let queue = [];
  let scheduled = false;

  function flush() {
    const updates = queue;
    queue = [];
    scheduled = false;
    const merged = Object.assign({}, ...updates);
    // Use the raw setState to bypass batching
    store.setState(merged);
  }

  return {
    ...store,
    batch(updater) {
      const partial = updater(store.getState());
      queue.push(partial);
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
    },
  };
}
```

## DOM Binding

Bind store state to DOM elements reactively.

```javascript
function bindStore(store, bindings) {
  const els = new Map();

  function render(state) {
    for (const [selector, fn] of bindings) {
      if (!els.has(selector)) {
        els.set(selector, document.querySelectorAll(selector));
      }
      for (const el of els.get(selector)) {
        fn(el, state);
      }
    }
  }

  render(store.getState());
  return store.subscribe(render);
}

// Usage
const store = createStore({ count: 0 });
bindStore(
  store,
  new Map([
    ['[data-bind="count"]', (el, s) => (el.textContent = s.count)],
    ['[data-bind="visible"]', (el, s) => (el.hidden = s.count === 0)],
  ]),
);

store.setState({ count: 5 }); // DOM updates automatically
```

## Middleware / Plugins

```javascript
function applyMiddleware(store, middlewares) {
  const chain = middlewares.map((m) => m(store));
  return {
    ...store,
    setState(partial) {
      chain.forEach((fn) => fn(partial, store.getState()));
      store.setState(partial);
    },
  };
}

// Logger middleware
const logger = (store) => (partial, prev) => {
  console.group('Store update');
  console.log('prev:', prev);
  console.log('next:', { ...prev, ...partial });
  console.groupEnd();
};

// Persist middleware
const persist = (key) => (store) => (partial, prev) => {
  const next = { ...prev, ...partial };
  try {
    localStorage.setItem(key, JSON.stringify(next));
  } catch {}
};

// Usage
const store = createStore({ count: 0 });
const enhanced = applyMiddleware(store, [logger, persist('app-state')]);
```

## Async State

```javascript
function createAsyncStore(initial) {
  const store = createStore({
    data: null,
    loading: false,
    error: null,
    ...initial,
  });

  return {
    ...store,
    async run(asyncFn) {
      store.setState({ loading: true, error: null });
      try {
        const data = await asyncFn();
        store.setState({ data, loading: false });
        return data;
      } catch (err) {
        store.setState({ error: err.message, loading: false });
        throw err;
      }
    },
  };
}

// Usage
const userStore = createAsyncStore();
async function loadUser(id) {
  await userStore.run(() => fetch(`/api/users/${id}`).then((r) => r.json()));
}
```

## State patterns decision table

| Pattern           | When to use                               | Trade-off                       |
| ----------------- | ----------------------------------------- | ------------------------------- |
| Simple store      | Small app, few state keys                 | No structure for complex state  |
| Computed store    | Derived values needed                     | Cache invalidation complexity   |
| Slice composition | Multiple independent domains              | Cross-slice communication       |
| Undo store        | History-dependent UI (drawing, forms)     | Memory usage grows with history |
| Async store       | Loading states, API data                  | Every async call needs a store  |
| Middleware        | Cross-cutting concerns (logging, persist) | Order matters, debugging harder |

## Checklist

- [ ] Store provides getState, setState, subscribe, and a way to unsubscribe
- [ ] Updates are immutable (never mutate state directly)
- [ ] Computed values are derived, not stored (except for caching)
- [ ] Async state includes loading, error, and data states
- [ ] DOM bindings clean up on destroy/unmount
- [ ] Batched updates coalesce multiple setState calls into one render
- [ ] Undo/redo has a configured max history limit
- [ ] Middleware order is explicit and documented
- [ ] No side effects inside state updates (use middleware or event listeners)
- [ ] Persistence handles serialization errors gracefully
