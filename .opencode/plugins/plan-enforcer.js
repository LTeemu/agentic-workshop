/**
 * Plan Enforcer Plugin — OpenCode V2 API (ESM, Promise-based)
 *
 * Wires the PlanEnforcer state machine to the tool hooks and event stream.
 * The authoritative gate list lives in plan-enforcer-core.cjs — keep this
 * header and README in sync with it.
 *
 * Derives the valid subagent list from .opencode/agents/ so new agent files
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
// .opencode/plugins → .opencode → workspace root (independent of process CWD)
const WORKSPACE_ROOT = path.dirname(path.dirname(PLUGIN_DIR));
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

export default Plugin.define({
  id: 'plan-enforcer',

  setup: async (ctx) => {
    const enforcer = PlanEnforcer({
      validSubagentTypes: discoverSubagentTypes(),
      workspaceRoot: WORKSPACE_ROOT,
    });
    const abortController = new AbortController();

    const hasToolHook = !!(ctx.tool && typeof ctx.tool.hook === 'function');
    const hasEventSubscribe = !!(ctx.event && typeof ctx.event.subscribe === 'function');

    console.log(
      '[plan-enforcer] Starting up (V2 Promise API). ' +
        'tool.hook=' +
        hasToolHook +
        ' event.subscribe=' +
        hasEventSubscribe,
    );

    if (!hasToolHook) {
      console.warn(
        '[plan-enforcer] WARNING: ctx.tool.hook is not available. ' +
          'Plan enforcement will NOT function.',
      );
    }

    // ── Tool hook ──
    let hookDisposer;
    if (hasToolHook) {
      try {
        hookDisposer = await ctx.tool.hook('execute.before', async (event) => {
          const input = {
            tool: event.tool,
            sessionID: event.sessionID,
            callID: event.callID,
          };

          const output = {
            args: event.input || {},
          };

          // Let errors propagate so OpenCode aborts the tool call
          enforcer.onToolExecuteBefore(input, output);
        });
      } catch (err) {
        console.error('[plan-enforcer] Failed to register tool hook:', err);
      }
    }

    // ── Event subscription ──
    if (hasEventSubscribe) {
      try {
        const eventStream = ctx.event.subscribe({ signal: abortController.signal });
        (async () => {
          for await (const event of eventStream) {
            try {
              enforcer.onEvent(event);
            } catch (err) {
              console.error('[plan-enforcer] Error handling event:', err);
            }
          }
        })();
      } catch (err) {
        if (err?.name !== 'AbortError') {
          console.error('[plan-enforcer] Event subscription failed:', err);
        }
      }
    }

    // ── Cleanup ──
    return async () => {
      abortController.abort();
      if (hookDisposer && typeof hookDisposer.dispose === 'function') {
        try {
          await hookDisposer.dispose();
        } catch (err) {
          console.error('[plan-enforcer] Error disposing hook:', err);
        }
      }
    };
  },
});
