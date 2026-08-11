const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

/**
 * Smoke tests for the ESM plugin wrapper (plan-enforcer.js).
 *
 * The core state machine is covered directly by plan-enforcer.test.js; this
 * file pins the wrapper's event-shape mapping against the real V2
 * ToolHooks contract — if a field name drifts (e.g. event.input), a test
 * breaks instead of the subagent gate silently no-opping.
 */

const WRAPPER_URL = path
  .resolve(__dirname, '..', '..', '.opencode', 'plugins', 'plan-enforcer.js')
  .replace(/\\/g, '/');

/** Minimal ctx.tool.hook stub capturing registered hooks; returns a disposer. */
function makeMockContext() {
  const hooks = {};
  const disposed = [];
  const ctx = {
    tool: {
      hook(name, callback) {
        hooks[name] = callback;
        return {
          dispose: async () => {
            disposed.push(name);
          },
        };
      },
    },
  };
  return { ctx, hooks, disposed };
}

/** Full V2 execute.before event for a subagent delegation. */
function delegationEvent({ agent, callID, sessionID = 's1' }) {
  return {
    tool: 'subagent',
    sessionID,
    agent: 'coder',
    messageID: 'm1',
    callID,
    input: { agent },
  };
}

describe('plan-enforcer plugin wrapper (ESM)', () => {
  it('loads and registers the execute.before hook during setup', async () => {
    const mod = await import(`file:///${WRAPPER_URL}`);
    const plugin = mod.default;
    assert.ok(plugin, 'plugin default export missing');
    assert.strictEqual(plugin.id, 'plan-enforcer');

    const { ctx, hooks, disposed } = makeMockContext();
    const cleanup = await plugin.setup(ctx);

    assert.strictEqual(typeof hooks['execute.before'], 'function');
    assert.strictEqual(hooks['execute.after'], undefined);
    await cleanup();
    assert.deepStrictEqual(disposed, ['execute.before']);
  });

  it('maps execute.before event fields and aborts invalid delegations', async () => {
    const mod = await import(`file:///${WRAPPER_URL}`);
    const { ctx, hooks } = makeMockContext();
    await mod.default.setup(ctx);

    // Real V2 event shape: { tool, sessionID, agent, messageID, callID, input }
    await assert.rejects(
      async () =>
        hooks['execute.before'](delegationEvent({ agent: 'not-an-agent', callID: 'c-invalid' })),
      /INVALID_SUBAGENT_TYPE/,
    );
  });

  it('accepts a refactor delegation before any reviewer ran (no gate)', async () => {
    const mod = await import(`file:///${WRAPPER_URL}`);
    const { ctx, hooks } = makeMockContext();
    await mod.default.setup(ctx);

    await assert.doesNotReject(async () =>
      hooks['execute.before'](delegationEvent({ agent: 'refactor', callID: 'c-refactor' })),
    );
  });
});
