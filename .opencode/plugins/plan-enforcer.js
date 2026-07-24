/**
 * Plan Enforcer Plugin
 *
 * Gates:
 *   1. PLAN_FIRST  — Agent must call todowrite before editing or running
 *      commands. Reconnaissance (read, glob, grep, websearch, webfetch)
 *      is allowed before todowrite if a read-only subagent (researcher
 *      or reviewer) has been delegated via task() first.
 *      Enforced on every new user message (chat.message) unless the
 *      previous plan still has active items.
 *   2. DELEGATE_FIRST — Non-Coder items (Researcher:/Reviewer:/Refactor:)
 *      cannot be marked in_progress until the agent calls task() with the
 *      matching subagent_type first.
 *   3. PIPELINE_REQUIRED — Non-trivial Coder: items need reviewer called
 *      before they can be marked completed.
 *   4. PLAN_RESET  — When all todos are completed/cancelled, delegated
 *      types are cleared for a fresh start. planConfirmed stays true so
 *      the agent can continue working in the same turn without a forced
 *      re-plan. Cross-turn and interrupt resets are handled by
 *      chat.message (conditional) and event (session.interrupt).
 *
 * Read-only pre-plan reconnaissance:
 *   task(subagent_type="researcher") → unlocks read, glob, grep, websearch, webfetch, skill
 *   task(subagent_type="reviewer")   → unlocks read, glob, grep, skill
 *
 * Research shows prompt-only compliance is 0% for process instructions
 * (arXiv:2605.01771). Mechanical enforcement via tool hooks is the only
 * reliable fix.
 *
 * --- Role-Prefix Convention ---
 *
 * Every todowrite entry MUST use a role prefix to indicate which subagent
 * handles it. The plugin validates this at runtime.
 *
 *   Prefix       | Subagent type   | When to use
 *   -------------|-----------------|---------------------------------------
 *   Researcher:  | researcher      | Web research, documentation, exploration
 *   Reviewer:    | reviewer        | Code review, quality, edge-case analysis
 *   Refactor:    | refactor        | Duplicate elimination, structural cleanup
 *   Coder:       | general         | Direct implementation, editing, writing
 *
 * Examples:
 *   Researcher: research CSV parsing in Node.js stdlib
 *   Coder:      implement parseCSV function
 *   Reviewer:   review parser.js for edge cases
 *
 * Use task(subagent_type="...") to delegate work matching the prefix.
 */

const VALID_PREFIXES = ['Researcher:', 'Reviewer:', 'Refactor:', 'Coder:'];

/** Prefixes that require delegation (everything except Coder). */
const DELEGATION_PREFIXES = new Set(['Researcher:', 'Reviewer:', 'Refactor:']);

/** Maps prefix -> required subagent_type for delegation check. */
const PREFIX_TO_SUBAGENT = {
  'Researcher:': 'researcher',
  'Reviewer:': 'reviewer',
  'Refactor:': 'refactor',
};

/** Valid subagent_type values for task() delegation. */
const VALID_SUBAGENT_TYPES = ['researcher', 'reviewer', 'refactor'];

/**
 * Tools that only read, never write. Safe to unlock before a plan is
 * confirmed, provided a read-only subagent has been delegated.
 */
const READ_ONLY_TOOLS = new Set(['read', 'glob', 'grep', 'websearch', 'webfetch', 'skill']);

/** Subagent types that only read — unlock READ_ONLY_TOOLS before todowrite. */
const READ_ONLY_SUBAGENTS = new Set(['researcher', 'reviewer']);

/**
 * Extract the role prefix from a todowrite entry content string.
 * Returns the prefix string (e.g. "Researcher:") or null if none found.
 */
function extractPrefix(content) {
  return VALID_PREFIXES.find((p) => content.trim().startsWith(p)) ?? null;
}

function PlanEnforcer() {
  /** Whether the agent has used todowrite to create a task plan. */
  let planConfirmed = false;

  /** Set of subagent_type values already delegated via task(). */
  const delegatedTypes = new Set();

  /** Last known todo list — used by chat.message to detect active plans. */
  let lastTodos = [];

  // ── Helpers ──────────────────────────────────────────────

  /** Validate every todowrite entry has a role prefix. */
  function validatePrefixes(todos) {
    for (let i = 0; i < todos.length; i++) {
      const content = todos[i].content ?? '';
      if (!VALID_PREFIXES.some((p) => content.trim().startsWith(p))) {
        throw new Error(
          `ROLE_PREFIX_REQUIRED: todowrite entry #${i + 1} must start with one of: ` +
            VALID_PREFIXES.join(', ') +
            `\n  Got: "${content}"\n  Example: "Researcher: ${content.toLowerCase()}"`,
        );
      }
    }
  }

  /** Forbid starting non-Coder work without prior delegation via task(). */
  function checkDelegation(todos) {
    for (const item of todos) {
      if (item.status !== 'in_progress') continue;
      const prefix = extractPrefix(item.content ?? '');
      if (!prefix) continue;
      if (!DELEGATION_PREFIXES.has(prefix)) continue;

      const requiredType = PREFIX_TO_SUBAGENT[prefix];
      if (!delegatedTypes.has(requiredType)) {
        throw new Error(
          `DELEGATE_FIRST: Cannot mark "${item.content}" as in_progress.\n` +
            `  "${prefix}" items must be delegated via task(subagent_type="${requiredType}") first.\n` +
            `  Call task() with subagent_type="${requiredType}" to delegate this work, then update the status.`,
        );
      }
    }
  }

  /** Non-trivial Coder: items need reviewer called before completion. */
  function checkPipeline(todos) {
    for (const item of todos) {
      if (item.status !== 'completed') continue;
      const content = item.content ?? '';
      const isCoder = content.trim().startsWith('Coder:');
      const isTrivial = /\(trivial\)\s*$/.test(content.trim());
      if (isCoder && !isTrivial && !delegatedTypes.has('reviewer')) {
        throw new Error(
          `PIPELINE_REQUIRED: Cannot mark "${item.content}" as completed.\n` +
            `  Non-trivial Coder tasks require the pipeline (review → refactor → test).\n` +
            `  Call task(subagent_type="reviewer") first, or mark as trivial with "(trivial)" in the todowrite entry.`,
        );
      }
    }
  }

  return {
    /**
     * Conditionally reset the plan gate on new user messages.
     * - If the previous plan still has active (in_progress/pending) items,
     *   the plan is preserved across turns so "continue" works smoothly.
     * - If all items were resolved, reset so the agent must plan anew.
     * - Also handles the "user gives a new task mid-plan" case: the agent
     *   will create a new todowrite, and old items are implicitly abandoned.
     */
    'chat.message': async () => {
      // Only reset if the previous plan was fully resolved.
      // This preserves active plans across "continue" / "thanks" messages
      // while still forcing a fresh plan when the user gives a new task.
      const hasActive = lastTodos.some(
        (item) => item.status !== 'completed' && item.status !== 'cancelled',
      );
      if (!hasActive) {
        planConfirmed = false;
        delegatedTypes.clear();
        lastTodos = [];
      }
    },

    /**
     * Catch user-initiated interrupts and external todo cancellations.
     * - session.interrupt: user pressed Esc/Ctrl+C in the TUI
     * - todo.updated: todos were modified externally (e.g. API/UI cancel)
     */
    event: async ({ event }) => {
      const props = event.properties ?? {};
      if (event.type === 'tui.command.execute' && props.command === 'session.interrupt') {
        planConfirmed = false;
        delegatedTypes.clear();
        lastTodos = [];
      }
      // Handle both full payloads and delta updates robustly:
      // - If the incoming array is >= lastTodos length, treat as full replacement.
      // - If smaller, merge deltas into existing state so items aren't lost.
      if (event.type === 'todo.updated' && Array.isArray(props.todos)) {
        if (props.todos.length >= lastTodos.length) {
          lastTodos = props.todos;
        } else {
          // Likely a delta — merge updates into existing state
          for (const delta of props.todos) {
            const idx = lastTodos.findIndex((t) => t.content === delta.content);
            if (idx !== -1) {
              lastTodos[idx] = { ...lastTodos[idx], ...delta };
            }
          }
        }

        const allResolved = lastTodos.every(
          (t) => t.status === 'completed' || t.status === 'cancelled',
        );
        if (allResolved && lastTodos.length > 0) {
          delegatedTypes.clear();
        }
      }
    },

    'tool.execute.before': async (input, output) => {
      // --- task(): validate subagent_type and record delegation ---
      if (input.tool === 'task') {
        const subagentType = output.args?.subagent_type;
        if (subagentType) {
          if (!VALID_SUBAGENT_TYPES.includes(subagentType)) {
            throw new Error(
              `INVALID_SUBAGENT_TYPE: "${subagentType}" is not a valid subagent type.\n` +
                `  Valid types: ${VALID_SUBAGENT_TYPES.join(', ')}`,
            );
          }
          delegatedTypes.add(subagentType);
        }
        return;
      }

      // --- todowrite: run all validation gates ---
      if (input.tool === 'todowrite') {
        const todos = output.args?.todos ?? [];
        if (todos.length === 0) {
          lastTodos = [];
          return;
        }
        lastTodos = todos;
        validatePrefixes(todos);

        if (!planConfirmed) {
          planConfirmed = true;
          // Delegations from pre-plan reconnaissance (task() before todowrite)
          // are preserved here. Stale delegations are cleared by chat.message
          // or interrupt at plan reset.
          checkDelegation(todos);
          checkPipeline(todos);
          return;
        }

        checkDelegation(todos);
        checkPipeline(todos);

        // When all items are resolved, clear delegations so the next plan
        // starts fresh. We DON'T reset planConfirmed here — that's handled
        // by chat.message (cross-turn) or event (interrupt), so the agent
        // can continue working within the same turn without a forced re-plan.
        const allResolved = todos.every(
          (item) => item.status === 'completed' || item.status === 'cancelled',
        );
        if (allResolved && todos.length > 0) {
          delegatedTypes.clear();
        }
        return;
      }

      // --- Block tools until todowrite is called ---
      //
      // Exception: if a read-only subagent (researcher or reviewer) has been
      // delegated via task(), allow read-only tools so it can do its job.
      // This lets the agent dispatch reconnaissance before committing to a plan.
      //
      //   task(subagent_type="researcher")  → unlocks read, glob, grep, websearch, webfetch
      //   task(subagent_type="reviewer")    → unlocks read, glob, grep
      //
      if (!planConfirmed) {
        const hasReadOnlySubagent = [...READ_ONLY_SUBAGENTS].some((t) => delegatedTypes.has(t));
        if (READ_ONLY_TOOLS.has(input.tool) && hasReadOnlySubagent) {
          return; // allow read-only reconnaissance
        }

        const hint = hasReadOnlySubagent
          ? "You've delegated a read-only subagent. Call todowrite to unlock write tools."
          : 'Call task(subagent_type="researcher") or task(subagent_type="reviewer") to inspect the codebase first, then call todowrite to start the plan.';
        throw new Error(
          'PLAN_FIRST: Call todowrite first to unlock this tool.\n' +
            `  Tool "${input.tool}" requires an active plan.\n\n` +
            `  ${hint}\n\n` +
            'Full usage:\n' +
            '1. Delegate reconnaissance: task(subagent_type="researcher") or task(subagent_type="reviewer")\n' +
            '2. State the plan to the user (use ## Plan format, prefix todos with role)\n' +
            '3. Call todowrite with role-prefixed items:\n' +
            '   Researcher: research the problem\n' +
            '   Reviewer:   review existing code\n' +
            '   Coder:      implement the solution\n' +
            '4. Then proceed with other tools',
        );
      }
    },
  };
}

module.exports = { PlanEnforcer };
