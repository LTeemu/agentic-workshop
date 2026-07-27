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
 *   4. SCOPE_REQUIRED  — The agent must declare scope via [scope:path,...]
 *      in at least one todowrite entry. Read/glob/grep/bash tools are
 *      then restricted to the declared scope. This is the mechanical
 *      enforcement of the Focus rule from AGENTS.md.
 *   5. PLAN_RESET  — When all todos are completed/cancelled, delegated
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
 *   Researcher: [scope:docs/] research CSV parsing in Node.js stdlib
 *   Coder:      [scope:src/] implement parseCSV function
 *   Reviewer:   [scope:src/parser.js] review parser.js for edge cases
 *
 * Use task(subagent_type="...") to delegate work matching the prefix.
 *
 * --- Scope Convention ---
 *
 * Every todowrite entry MAY include a scope declaration in the format:
 *   [scope: path1, path2, ...]
 *
 * At least one entry must declare scope before any read/glob/grep/bash
 * tool is allowed. The scope restricts which files/directories the agent
 * can read. Multiple entries contribute to a combined allowed scope set.
 *
 * Examples:
 *   Coder: [scope:projects/app/src/] implement UserListComponent
 *   Researcher: [scope:docs/api/, README.md] research API endpoints
 *
 * If the agent needs to read additional files mid-task, it updates the
 * todowrite entries to include a broader or additional scope. This forces
 * deliberate consideration of what files are actually needed — the
 * mechanical enforcement of the Focus requirement.
 *
 * Known limitation — bash scope bypass:
 *   The bash check only validates the `workdir` parameter, not the
 *   command string itself. A command like `cat ../../secrets.txt` could
 *   read files outside scope while workdir stays within scope. This is a
 *   fundamental limitation of command-level sandboxing. Agents should
 *   not use bash to read files outside the declared scope — use read/
 *   glob/grep instead, which are properly gated.
 */

const path = require('path');

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
 *
 * Each subagent type gets its own tool set based on its role:
 *   - researcher: web research — needs web fetch/search + local file read
 *   - reviewer:   code review — needs local file search/read + skill loading
 */
const READ_ONLY_TOOLS = {
  researcher: new Set(['read', 'websearch', 'webfetch']),
  reviewer: new Set(['read', 'glob', 'grep', 'skill']),
};

/** Subagent types that only read — unlock their READ_ONLY_TOOLS set before todowrite. */
const READ_ONLY_SUBAGENTS = new Set(['researcher', 'reviewer']);

/**
 * Extract the role prefix from a todowrite entry content string.
 * Returns the prefix string (e.g. "Researcher:") or null if none found.
 */
function extractPrefix(content) {
  return VALID_PREFIXES.find((p) => content.trim().startsWith(p)) ?? null;
}

// ── Scope helpers ──────────────────────────────────────────

/** The workspace root directory (CWD at plugin load time). */
const WORKSPACE_ROOT = process.cwd();

/**
 * Regex to extract `[scope: path1, path2]` from todowrite entry content.
 * Case-insensitive, allows spaces after colon and between paths.
 */
const SCOPE_REGEX = /\[scope:\s*([^\]]+)\]\s*/i;

/**
 * Normalize a path for scope comparison: resolve to absolute, then
 * convert to forward-slash form with no trailing slash.
 * @param {string} p
 * @returns {string}
 */
function normalizePath(p) {
  const resolved = path.resolve(WORKSPACE_ROOT, p.trim());
  return resolved.replace(/\\/g, '/').replace(/\/$/, '');
}

/**
 * Parse `[scope: path1, path2, ...]` from a todowrite entry content string.
 * Returns an array of normalized absolute paths, or empty array.
 * @param {string} content
 * @returns {string[]}
 */
function parseScopeFromEntry(content) {
  const match = content.match(SCOPE_REGEX);
  if (!match) return [];
  return match[1]
    .replace(/["']/g, '') // strip quotes
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0) // skip empty segments like [scope:,]
    .map(normalizePath);
}

/**
 * Parse scope from all todowrite entries and return a deduplicated,
 * normalized array of allowed paths.
 * @param {Array<{content: string}>} todos
 * @returns {string[]}
 */
function parseScopeFromTodos(todos) {
  const scopeSet = new Set();
  for (const item of todos) {
    const paths = parseScopeFromEntry(item.content ?? '');
    for (const p of paths) scopeSet.add(p);
  }
  return [...scopeSet];
}

/**
 * Validate that a tool target path is within the declared scope.
 * Throws an Error if the path falls outside all scope entries.
 * @param {string} toolName
 * @param {string} targetPath - The path the tool intends to access.
 * @param {string[]} allowedScope - List of normalized allowed paths.
 */
function checkScope(toolName, targetPath, allowedScope) {
  if (!allowedScope || allowedScope.length === 0) return; // no scope yet = allow

  const normalized = normalizePath(targetPath);
  const inScope = allowedScope.some(
    (scopePath) => normalized === scopePath || normalized.startsWith(scopePath + '/'),
  );

  if (!inScope) {
    const scopeList = allowedScope.join(', ');
    throw new Error(
      `SCOPE_VIOLATION: "${toolName}" target "${targetPath}" is outside the declared scope.\n` +
        `  Declared scope: ${scopeList}\n` +
        `  To access this file, add [scope:${targetPath}] to a todowrite entry.\n` +
        `  Tip: declare a parent directory like [scope:${path.dirname(targetPath)}/] to cover more ground.`,
    );
  }
}

/**
 * Ensure at least one todowrite entry has a scope declaration.
 * Throws if no scope found.
 * @param {Array<{content: string}>} todos
 */
function validateScopeExists(todos) {
  const hasScope = todos.some((item) => SCOPE_REGEX.test(item.content ?? ''));
  if (!hasScope) {
    throw new Error(
      'SCOPE_REQUIRED: At least one todowrite entry must declare scope.\n' +
        '  Add [scope:path1,path2] to any entry, e.g.:\n' +
        '    Coder: [scope:src/app/] implement the feature\n' +
        '    Researcher: [scope:docs/] research the API\n' +
        '  This ensures you only read files relevant to the task (Focus rule).',
    );
  }
}

function PlanEnforcer() {
  /** Whether the agent has used todowrite to create a task plan. */
  let planConfirmed = false;

  /** Set of subagent_type values already delegated via task(). */
  const delegatedTypes = new Set();

  /** Last known todo list — used by chat.message to detect active plans. */
  let lastTodos = [];

  /** Set of normalized absolute paths the agent is allowed to read. */
  let allowedScope = [];

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

  /** Strip scope markers from content for cleaner matching. */
  function stripScope(content) {
    return content.replace(SCOPE_REGEX, '').trim();
  }

  /** Non-trivial Coder: items need reviewer called before completion. */
  function checkPipeline(todos) {
    for (const item of todos) {
      if (item.status !== 'completed') continue;
      const content = item.content ?? '';
      const stripped = stripScope(content);
      const isCoder = stripped.startsWith('Coder:');
      const isTrivial = /\(trivial\)\s*$/.test(stripped);
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
        allowedScope = [];
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
        allowedScope = [];
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

    'tool.execute.before': async (input, ctx) => {
      // --- task(): validate subagent_type and record delegation ---
      if (input.tool === 'task') {
        const subagentType = ctx.args?.subagent_type;
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
        const todos = ctx.args?.todos ?? [];
        if (todos.length === 0) {
          lastTodos = [];
          allowedScope = [];
          return;
        }
        lastTodos = todos;
        validatePrefixes(todos);
        validateScopeExists(todos);

        // Parse and store scope from all entries (merged).
        allowedScope = parseScopeFromTodos(todos);

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

        // When all items are resolved, clear state so the next plan
        // starts fresh. We DON'T reset planConfirmed here — that's handled
        // by chat.message (cross-turn) or event (interrupt), so the agent
        // can continue working within the same turn without a forced re-plan.
        const allResolved = todos.every(
          (item) => item.status === 'completed' || item.status === 'cancelled',
        );
        if (allResolved && todos.length > 0) {
          delegatedTypes.clear();
          allowedScope = [];
        }
        return;
      }

      // --- Block tools until todowrite is called ---
      //
      // Exception: if a read-only subagent (researcher or reviewer) has been
      // delegated via task(), allow its designated read-only tools.
      // This lets the agent dispatch reconnaissance before committing to a plan.
      //
      //   task(subagent_type="researcher")  → unlocks read, websearch, webfetch
      //   task(subagent_type="reviewer")    → unlocks read, glob, grep, skill
      //
      if (!planConfirmed) {
        const hasDelegatedReadOnly = [...READ_ONLY_SUBAGENTS].some((t) => delegatedTypes.has(t));
        const toolAllowed =
          hasDelegatedReadOnly &&
          [...READ_ONLY_SUBAGENTS].some(
            (t) => delegatedTypes.has(t) && READ_ONLY_TOOLS[t]?.has(input.tool),
          );
        if (toolAllowed) {
          return; // allow read-only reconnaissance for the delegated subagent
        }

        const hint = hasDelegatedReadOnly
          ? "You've delegated a read-only subagent. Call todowrite to unlock write tools."
          : 'Call task(subagent_type="researcher") or task(subagent_type="reviewer") to inspect the codebase first, then call todowrite to start the plan.';
        throw new Error(
          'PLAN_FIRST: Call todowrite first to unlock this tool.\n' +
            `  Tool "${input.tool}" requires an active plan.\n\n` +
            `  ${hint}\n\n` +
            'Full usage:\n' +
            '1. Delegate reconnaissance: task(subagent_type="researcher") or task(subagent_type="reviewer")\n' +
            '2. State the plan to the user (use ## Plan format, prefix todos with role)\n' +
            '3. Call todowrite with role-prefixed items. Include scope:\n' +
            '   Coder: [scope:src/app/] implement the feature\n' +
            '4. Then proceed with other tools',
        );
      }

      // ── Scope enforcement (after plan is confirmed) ─────
      // Check that file-access tools stay within the declared scope.
      // This is the mechanical enforcement of the Focus rule.
      if (allowedScope.length > 0) {
        switch (input.tool) {
          case 'read': {
            const filePath = ctx.args?.filePath;
            if (!filePath) {
              throw new Error(
                'SCOPE_VIOLATION: read tool called without a filePath.\n' +
                  '  Every read() call must specify a filePath.',
              );
            }
            checkScope('read', filePath, allowedScope);
            break;
          }
          case 'glob': {
            const globPath = ctx.args?.path || WORKSPACE_ROOT;
            checkScope('glob', globPath, allowedScope);
            break;
          }
          case 'grep': {
            const grepPath = ctx.args?.path || WORKSPACE_ROOT;
            checkScope('grep', grepPath, allowedScope);
            break;
          }
          case 'bash': {
            // For bash, check the working directory (workdir parameter).
            // Commands that stay within the workspace scope are fine.
            const bashDir = ctx.args?.workdir || WORKSPACE_ROOT;
            checkScope('bash', bashDir, allowedScope);
            break;
          }
        }
      }
    },
  };
}

/**
 * Plugin export for the opencode runtime.
 *
 * opencode's plugin loader expects the module to export a `default` function
 * (or the module itself to be a function) matching the Plugin type:
 *
 *   type Plugin = (input: PluginInput, options?) => Promise<Hooks>
 *
 * The function receives { client, project, directory, $ } and returns the
 * hooks object. The returned hooks are then wired into the tool execution
 * pipeline, making this the mechanical enforcement gate described in AGENTS.md.
 *
 * Tests import `{ PlanEnforcer }` directly to test the hook logic in isolation.
 */
async function plugin() {
  return PlanEnforcer();
}

module.exports = { default: plugin, PlanEnforcer };
