/**
 * Plan Enforcer Plugin — OpenCode V2 API (ESM, Promise-based)
 *
 * Mechanically enforces:
 *   - ROLE_PREFIX_REQUIRED: Todowrite entries must use valid role prefixes
 *   - SCOPE_REQUIRED: Todowrite entries must include [scope:...]. Coder/Reviewer/Refactor require scope; Researcher may omit scope, but at least one entry must have a non-empty scope.
 *   - DELEGATE_FIRST: Non-Coder tasks cannot start without prior delegation
 *   - PIPELINE_REQUIRED: Non-trivial Coder tasks need reviewer delegation before completion
 *   - SCOPE_VIOLATION: Tool calls (read, glob, grep, bash) restricted to declared scope
 *   - INVALID_SUBAGENT_TYPE: Validates subagent_type / agent parameters
 *
 * Config reference:
 *   opencode.json  →  "plugins": [{ "package": "./.opencode/plugins/plan-enforcer.js" }]
 */
import { Plugin } from '@opencode-ai/plugin';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PlanEnforcer } = require('./plan-enforcer-core.cjs');

export default Plugin.define({
  id: 'plan-enforcer',

  setup: async (ctx) => {
    const enforcer = PlanEnforcer();
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
