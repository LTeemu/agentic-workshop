/**
 * Plan Enforcer Plugin — OpenCode V2 API (ESM, Promise-based)
 *
 * Wires the PlanEnforcer state machine to the V2 tool hooks (`execute.before`).
 *
 * Mechanically enforced:
 *   - INVALID_SUBAGENT_TYPE: subagent/task tools must use a valid agent name
 *     (an agent file with mode: subagent, not disabled)
 *
 * Derives valid subagent types from .opencode/agents/ so new agent files
 * take effect without editing the plugin.
 *
 * Config reference:
 *   opencode.json  →  "plugins": [{ "package": "./.opencode/plugins/plan-enforcer.js" }]
 */
import { Plugin } from '@opencode-ai/plugin';
import { createRequire } from 'module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { PlanEnforcer, loadValidSubagentTypes } = require('./plan-enforcer-core.cjs');

const PLUGIN_DIR = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.join(path.dirname(PLUGIN_DIR), 'agents');

/** Derive valid subagent_type values from .opencode/agents/*.md (defaults on failure). */
function discoverSubagentTypes() {
  const types = loadValidSubagentTypes(AGENTS_DIR);
  if (types) {
    console.log(`[plan-enforcer] Valid subagent types: ${types.join(', ')}`);
  } else {
    console.warn('[plan-enforcer] Could not derive subagent types from disk; using defaults.');
  }
  return types;
}

/** Register a tool hook; returns its disposer, or undefined if registration fails. */
async function registerHook(ctx, name, handler) {
  try {
    return await ctx.tool.hook(name, handler);
  } catch (err) {
    console.error(`[plan-enforcer] Failed to register ${name} hook:`, err);
    return undefined;
  }
}

export default Plugin.define({
  id: 'plan-enforcer',

  setup: async (ctx) => {
    const enforcer = PlanEnforcer({
      validSubagentTypes: discoverSubagentTypes(),
    });

    const hasToolHook = !!(ctx.tool && typeof ctx.tool.hook === 'function');
    console.log(`[plan-enforcer] Starting up (V2 Promise API). tool.hook=${hasToolHook}`);

    if (!hasToolHook) {
      console.warn(
        '[plan-enforcer] WARNING: ctx.tool.hook is not available. ' +
          'The subagent gate will NOT function.',
      );
    }

    // ── Tool hook (abort teeth on "before") ──
    let beforeDisposer;
    if (hasToolHook) {
      beforeDisposer = await registerHook(ctx, 'execute.before', async (event) => {
        const input = {
          tool: event.tool,
          sessionID: event.sessionID,
          callID: event.callID,
        };
        const output = { args: event.input || {} };
        // Let errors propagate so OpenCode aborts the tool call
        enforcer.onToolExecuteBefore(input, output);
      });
    }

    // ── Cleanup ──
    return async () => {
      if (beforeDisposer && typeof beforeDisposer.dispose === 'function') {
        try {
          await beforeDisposer.dispose();
        } catch (err) {
          console.error('[plan-enforcer] Error disposing hook:', err);
        }
      }
    };
  },
});
