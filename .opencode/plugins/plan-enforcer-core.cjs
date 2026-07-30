/**
 * PlanEnforcer — state machine (CJS)
 *
 * Pure logic, no opencode API dependency. The plugin wrapper wires this to
 * the tool hooks and event stream.
 *
 * Mechanically enforces:
 *   - PLAN_FIRST: Blocks mutation tools until todowrite/todo is called
 *   - ROLE_PREFIX_REQUIRED: Todowrite entries must use valid role prefixes
 *   - SCOPE_REQUIRED: Todowrite entries must include [scope:...]. Coder/Reviewer/Refactor require scope; Researcher may omit scope, but at least one entry must have a non-empty scope.
 *   - DELEGATE_FIRST: Non-Coder tasks cannot start without prior delegation
 *   - PIPELINE_REQUIRED: Non-trivial Coder tasks need reviewer delegation before completion
 *   - SCOPE_VIOLATION: Tool calls (read, glob, grep, bash) restricted to declared scope
 *   - INVALID_SUBAGENT_TYPE: Validates subagent_type / agent parameters
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

/** Valid subagent_type values for task() / subagent() delegation. */
const VALID_SUBAGENT_TYPES = ['explore', 'researcher', 'reviewer', 'refactor'];

/** Tools allowed before plan is confirmed without throwing PLAN_FIRST. */
const UNGATED_TOOLS = new Set([
  'todo',
  'todowrite',
  'task',
  'subagent',
  'question',
  'execute',
  'websearch',
  'webfetch',
  'skill',
]);

/** The workspace root directory (CWD at module load time). */
const WORKSPACE_ROOT = process.cwd();

/** Regex to extract [scope: path1, path2] from todowrite content. */
const SCOPE_REGEX = /\[scope:\s*([^\]]+)\]\s*/i;

function extractPrefix(content) {
  return VALID_PREFIXES.find((p) => content.trim().startsWith(p)) ?? null;
}

function normalizePath(p) {
  const resolved = path.resolve(WORKSPACE_ROOT, p.trim());
  return resolved.replace(/\\/g, '/').replace(/\/$/, '');
}

function parseScopeFromEntry(content) {
  const match = content.match(SCOPE_REGEX);
  if (!match) return [];
  return match[1]
    .replace(/["']/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(normalizePath);
}

function parseScopeFromTodos(todos) {
  const scopeSet = new Set();
  for (const item of todos) {
    const paths = parseScopeFromEntry(item.content ?? '');
    for (const p of paths) scopeSet.add(p);
  }
  return [...scopeSet];
}

function extractProjectName(normalizedPath) {
  const projectsDir = normalizePath('projects');
  if (normalizedPath === projectsDir || !normalizedPath.startsWith(projectsDir + '/')) {
    return null;
  }
  const relative = normalizedPath.slice(projectsDir.length + 1);
  const parts = relative.split('/');
  return parts[0] || null;
}

function checkScope(toolName, targetPath, allowedScope) {
  if (!allowedScope || allowedScope.length === 0) return;

  const normalized = normalizePath(targetPath);
  const targetProject = extractProjectName(normalized);

  if (targetProject) {
    const targetProjectDir = normalizePath(`projects/${targetProject}`);
    const isExplicitlyInScope = allowedScope.some((scopePath) => {
      const scopeProj = extractProjectName(scopePath);
      if (scopeProj === targetProject) return true;
      if (scopePath === targetProjectDir || scopePath.startsWith(targetProjectDir + '/')) return true;
      if (normalized === scopePath || normalized.startsWith(scopePath + '/')) return true;
      return false;
    });

    if (!isExplicitlyInScope) {
      throw new Error(
        `CROSS_PROJECT_VIOLATION: "${toolName}" target "${targetPath}" attempts to access sibling project "${targetProject}".\n` +
          `  Cross-project reference browsing is strictly forbidden. Build from standard templates rather than inspecting sibling projects.\n` +
          `  To explicitly allow access, add [scope:projects/${targetProject}] to a todowrite entry.`,
      );
    }
  }

  const inScope = allowedScope.some(
    (scopePath) => normalized === scopePath || normalized.startsWith(scopePath + '/'),
  );

  if (!inScope) {
    const scopeList = allowedScope.join(', ');
    throw new Error(
      `SCOPE_VIOLATION: "${toolName}" target "${targetPath}" is outside the declared scope.\n` +
        `  Declared scope: ${scopeList}\n` +
        `  To access this file, add [scope:${targetPath}] to a todowrite entry.`,
    );
  }
}

function validateScopeExists(todos) {
  for (let i = 0; i < todos.length; i++) {
    const item = todos[i];
    const content = item.content ?? '';
    const prefix = extractPrefix(content);

    // Every Coder/Reviewer/Refactor entry MUST include [scope:...]
    if (prefix === 'Coder:' || prefix === 'Reviewer:' || prefix === 'Refactor:') {
      const match = content.match(SCOPE_REGEX);
      if (!match || !match[1].trim()) {
        throw new Error(
          `SCOPE_REQUIRED: Todowrite entry #${i + 1} ("${prefix}") must include [scope:...].\n` +
            `  Got: "${content}"\n` +
            `  Example: "${prefix} [scope:src/] ..."`
        );
      }
    }
  }

  // At least one entry must have a non-empty scope
  const hasNonEmptyScope = todos.some((item) => {
    const match = (item.content ?? '').match(SCOPE_REGEX);
    return match && match[1].trim().length > 0;
  });

  if (!hasNonEmptyScope) {
    throw new Error(
      'SCOPE_REQUIRED: At least one todowrite entry must declare a non-empty [scope:...].',
    );
  }
}

function validatePrefixes(todos) {
  for (let i = 0; i < todos.length; i++) {
    const content = todos[i].content ?? '';
    if (!VALID_PREFIXES.some((p) => content.trim().startsWith(p))) {
      throw new Error(
        `ROLE_PREFIX_REQUIRED: todowrite entry #${i + 1} must start with one of: ` +
          VALID_PREFIXES.join(', ') +
          `\n  Got: "${content}"`,
      );
    }
  }
}

function stripScope(content) {
  return content.replace(SCOPE_REGEX, '').trim();
}

function PlanEnforcer() {
  let planConfirmed = false;
  const delegatedTypes = new Set();
  let lastTodos = [];
  let allowedScope = [];

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
            `  "${prefix}" items must be delegated via task(subagent_type="${requiredType}") first.`,
        );
      }
    }
  }

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
            `  Call task(subagent_type="reviewer") first, or mark as trivial with "(trivial)".`,
        );
      }
    }
  }

  return {
    isPlanConfirmed: () => planConfirmed,

    getDelegatedTypes: () => new Set(delegatedTypes),

    onToolExecuteBefore: (input, output) => {
      const tool = input?.tool;
      const args = output?.args ?? input?.args ?? {};

      // 1. Delegation / Subagent tool calls
      if (tool === 'task' || tool === 'subagent') {
        const subagentType = args.subagent_type ?? args.agent;
        if (subagentType) {
          if (!VALID_SUBAGENT_TYPES.includes(subagentType)) {
            throw new Error(
              `INVALID_SUBAGENT_TYPE: "${subagentType}". Valid: ${VALID_SUBAGENT_TYPES.join(', ')}`,
            );
          }
          delegatedTypes.add(subagentType);
        }
        return;
      }

      // 2. Todowrite / Todo tool calls
      if (tool === 'todowrite' || tool === 'todo') {
        const todos = args.todos ?? [];
        if (todos.length === 0) {
          lastTodos = [];
          allowedScope = [];
          return;
        }

        lastTodos = todos;
        validatePrefixes(todos);
        validateScopeExists(todos);

        allowedScope = parseScopeFromTodos(todos);

        checkDelegation(todos);
        checkPipeline(todos);

        planConfirmed = true;

        const allResolved = todos.every(
          (item) => item.status === 'completed' || item.status === 'cancelled',
        );
        if (allResolved && todos.length > 0) {
          delegatedTypes.clear();
          allowedScope = [];
        }
        return;
      }

      // 3. Plan-first check before todowrite is called
      if (!planConfirmed) {
        if (UNGATED_TOOLS.has(tool)) {
          return;
        }

        throw new Error(
          `PLAN_FIRST: Call todowrite first to unlock tool "${tool}".`,
        );
      }

      // 4. Scope enforcement after plan is confirmed
      if (allowedScope.length > 0) {
        switch (tool) {
          case 'read': {
            const filePath = args.filePath ?? args.path;
            if (!filePath) {
              throw new Error('SCOPE_VIOLATION: read tool called without a filePath.');
            }
            checkScope('read', filePath, allowedScope);
            break;
          }
          case 'glob': {
            const globPath = args.path || WORKSPACE_ROOT;
            checkScope('glob', globPath, allowedScope);
            break;
          }
          case 'grep': {
            const grepPath = args.path || WORKSPACE_ROOT;
            checkScope('grep', grepPath, allowedScope);
            break;
          }
          case 'bash':
          case 'shell': {
            const bashDir = args.workdir || args.cwd || WORKSPACE_ROOT;
            checkScope(tool, bashDir, allowedScope);
            break;
          }
        }
      }
    },

    onEvent: (event) => {
      const type = event?.type || event?.event?.type;
      const props = event?.properties || event?.event?.properties || {};

      if (type === 'chat.message') {
        const hasActive = lastTodos.some(
          (item) => item.status !== 'completed' && item.status !== 'cancelled',
        );
        if (!hasActive) {
          planConfirmed = false;
          delegatedTypes.clear();
          lastTodos = [];
          allowedScope = [];
        }
      } else if (
        type === 'session.interrupt' ||
        (type === 'tui.command.execute' && props.command === 'session.interrupt')
      ) {
        planConfirmed = false;
        delegatedTypes.clear();
        lastTodos = [];
        allowedScope = [];
      } else if (type === 'todo.updated' && Array.isArray(props.todos)) {
        if (props.todos.length >= lastTodos.length) {
          lastTodos = props.todos;
        } else {
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
          allowedScope = [];
        }
      }
    },
  };
}

module.exports = { PlanEnforcer };
