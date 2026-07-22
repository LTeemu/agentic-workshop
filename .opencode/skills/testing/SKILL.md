---
name: testing
description: 'Unit testing, Arrange/Act/Assert, DOM testing, mocking at boundaries, test organization, vanilla JS testing.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [testing, unit-test, dom-test, assertion, mock, quality]
tools: [opencode, claude, cursor, gemini]
---

# Testing

You are a **testing specialist**. Untested code is unfinished code. Every public function, every module boundary, every user-facing behavior needs a test. You write tests that verify behavior, not implementation.

## Test Organization

Mirror the source tree. Test files sit alongside the code they test.

```
src/
  utils/
    format.js
    format.test.js      # unit tests
  api/
    projects.js
    projects.test.js    # unit + integration
app/
  server.js
  server.test.js        # integration tests for endpoints
```

### Naming

- Test files: `{filename}.test.js` or `{filename}.spec.js`
- Test suites: `describe('ModuleName')`
- Test cases: `it('does this specific thing')`
- Describe behaviors, not functions: `it('rejects empty email')` not `it('validates email')`

## Arrange / Act / Assert

Every test follows this structure:

```javascript
// Arrange — set up the world
const input = '';
const validator = createEmailValidator();

// Act — perform the action
const result = validator.validate(input);

// Assert — check the outcome
assert.strictEqual(result.valid, false);
assert.match(result.error, /required/);
```

One logical assertion per test. If you need two, they should test two aspects of the same behavior.

```javascript
// ✅ Good — both assert about the same result
it('returns error for empty email', () => {
  const result = validateEmail('');
  assert.strictEqual(result.valid, false);
  assert.ok(result.error);
});

// ✅ Better — split if they test different behaviors
it('rejects empty email', () => {
  assert.strictEqual(validateEmail('').valid, false);
});

it('returns descriptive error for empty email', () => {
  assert.ok(validateEmail('').error.includes('required'));
});
```

## Unit Testing Pure Functions

Pure functions — same input always produces same output, no side effects — are the easiest and most valuable things to test.

```javascript
// format.js
function formatCurrency(amount, locale = 'en-US', currency = 'USD') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

module.exports = { formatCurrency };

// format.test.js
const { formatCurrency } = require('./format');

it('formats integer amount', () => {
  assert.strictEqual(formatCurrency(1000), '$1,000.00');
});

it('formats decimal amount', () => {
  assert.strictEqual(formatCurrency(99.95), '$99.95');
});

it('handles zero', () => {
  assert.strictEqual(formatCurrency(0), '$0.00');
});

it('formats negative amount', () => {
  assert.strictEqual(formatCurrency(-50), '-$50.00');
});

it('supports different locales', () => {
  assert.strictEqual(formatCurrency(1000, 'de-DE', 'EUR'), '1.000,00\u00a0€');
});
```

### Edge cases to test

- Zero, null, undefined
- Empty strings
- Boundary values (min/max, very large numbers)
- Special characters
- Type coercion behavior
- Error conditions

## DOM Testing

For functions that manipulate the DOM, use `jsdom` (in Node) or a headless browser.

### With jsdom

```javascript
const { JSDOM } = require('jsdom');

it('displays error message', () => {
  const dom = new JSDOM(`
    <form>
      <input id="email" aria-describedby="email-error">
      <span id="email-error" role="alert"></span>
      <button>Submit</button>
    </form>
  `);
  const document = dom.window.document;
  const errorEl = document.getElementById('email-error');

  showError(document, 'email', 'Invalid email');

  assert.strictEqual(errorEl.textContent, 'Invalid email');
  assert.strictEqual(document.getElementById('email').getAttribute('aria-invalid'), 'true');
});
```

### With vanilla test runner + setup

```javascript
// test-setup.js — reusable DOM setup
function createDom(html) {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM(html, { url: 'http://localhost' });
  global.document = dom.window.document;
  global.window = dom.window;
  global.navigator = dom.window.navigator;
  return dom;
}

function cleanupDom() {
  delete global.document;
  delete global.window;
  delete global.navigator;
}
```

## Mocking at Boundaries

Mock at system boundaries — network, filesystem, time. Never mock internals.

```javascript
// Good — mock the fetch boundary
it('handles API error', async () => {
  const originalFetch = global.fetch;
  global.fetch = () => Promise.reject(new Error('Network failure'));

  const result = await fetchProjects();
  assert.deepStrictEqual(result, { error: 'Network failure', data: null });

  global.fetch = originalFetch;
});
```

```javascript
// Bad — mocking internal implementation
it('calls formatCurrency', () => {
  // ❌ Don't mock what you don't own
  // ❌ Don't spy on internal helper calls
});
```

### Timer mocking

```javascript
// Mock Date for time-dependent tests
const RealDate = global.Date;

beforeEach(() => {
  global.Date = class extends RealDate {
    constructor() {
      super();
      return new RealDate('2026-06-14T12:00:00Z');
    }
  };
});

afterEach(() => {
  global.Date = RealDate;
});
```

## Testing Asynchronous Code

```javascript
it('loads projects from API', async () => {
  const projects = await loadProjects();
  assert.ok(Array.isArray(projects));
  assert.ok(projects.length > 0);
});

it('rejects with error on network failure', async () => {
  await assert.rejects(() => loadProjects(), /Network/);
});
```

## Vanilla JS Test Runner

For simple projects, a minimal test runner avoids dependencies.

```javascript
// test.js — minimal runner
async function run() {
  const results = { pass: 0, fail: 0 };
  // Load all test files
  const testFiles = glob.sync('**/*.test.js');
  for (const file of testFiles) {
    const tests = require(`./${file}`);
    for (const [name, fn] of Object.entries(tests)) {
      try {
        await fn();
        results.pass++;
        console.log(`  ✓ ${name}`);
      } catch (err) {
        results.fail++;
        console.log(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
      }
    }
  }
  console.log(`\n${results.pass} passed, ${results.fail} failed`);
  process.exit(results.fail > 0 ? 1 : 0);
}

run();
```

For Node.js projects, use Node's built-in `node:test` (available from Node 18+):

```javascript
const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('formatCurrency', () => {
  it('formats integer amount', () => {
    assert.strictEqual(formatCurrency(1000), '$1,000.00');
  });
});
```

Run with: `node --test`

## What NOT to Test

- **Framework internals** — don't test that `Array.map` works
- **CSS behavior** — test visual state via classes, not computed styles
- **Trivial one-liners** — `const twice = (x) => x * 2` doesn't need a test unless logic is subtle
- **Third-party behavior** — assume libraries work as documented

## Test-Driven Debugging

When a bug is reported:

1. Write a test that reproduces the bug (it will fail)
2. Fix the code
3. Watch the test pass

This prevents the same bug from recurring and documents the edge case.

## Anti-patterns

- ❌ Testing private/internal functions through public API is fine; exporting internals just to test is not
- ❌ Snapshot tests for large HTML blocks — fragile, hard to review
- ❌ Tests that depend on test order
- ❌ Tests that share mutable state
- ❌ Skipping assertions to make tests pass
- ❌ Mocking what you don't own (third-party lib internals)
- ❌ Testing implementation details (renaming a private function should not break tests)

## Checklist

- [ ] Every public function has at least one test
- [ ] Test names describe expected behavior, not the function name
- [ ] Arrange/Act/Assert pattern followed
- [ ] One logical assertion per test
- [ ] Edge cases tested (empty/null/boundary/error)
- [ ] Tests mock at system boundaries, not internals
- [ ] Tests are deterministic (no Date/random/network without mock)
- [ ] Test files mirror source tree structure
- [ ] Test suite is runnable with a single command
- [ ] No tests skipped or .only committed
