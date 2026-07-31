/**
 * PlanEnforcer — state machine (CJS)
 *
 * Pure logic, no opencode API dependency. The plugin wrapper wires this to
 * the tool hooks and event stream.
 *
 * Mechanically enforces (authoritative gate list — keep plan-enforcer.js and
 * README in sync with this):
 *   - ROLE_PREFIX_REQUIRED: Todowrite entries must use valid role prefixes
 *   - SCOPE_REQUIRED: Todowrite entries must include [scope:...]. Coder/Reviewer/Refactor require scope; Researcher may omit scope, but at least one entry must have a non-empty scope.
 *   - DELEGATE_FIRST: Non-Coder tasks cannot start (or complete) without prior delegation
 *   - PIPELINE_REQUIRED: Non-trivial Coder tasks need reviewer delegation before completion
 *   - SCOPE_VIOLATION: Tool calls (read, glob, grep, bash, shell) restricted to declared scope
 *   - CROSS_PROJECT_VIOLATION: No browsing sibling projects under projects/
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

/** Fallback subagent types when the wrapper cannot derive them from disk. */
const DEFAULT_SUBAGENT_TYPES = ['explore', 'researcher', 'reviewer', 'refactor'];

/** Regex to extract [scope: path1, path2] from todowrite content. */
const SCOPE_REGEX = /\[scope:\s*([^\]]+)\]\s*/i;

/**
 * Matches YAML frontmatter delimited by --- lines.
 * Shared with tests/agents/helpers.js (parseFrontmatter), which imports it.
 */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

const IS_WIN32 = process.platform === 'win32';

function extractPrefix(content) {
  return VALID_PREFIXES.find((p) => content.trim().startsWith(p)) ?? null;
}

/**
 * Resolve a path against the workspace root, normalized to forward slashes.
 * On win32 the result is lowercased so comparisons are case-insensitive.
 */
function normalizePath(p, workspaceRoot) {
  const resolved = path.resolve(workspaceRoot, p.trim());
  const normalized = resolved.replace(/\\/g, '/').replace(/\/$/, '');
  return IS_WIN32 ? normalized.toLowerCase() : normalized;
}

function extractProjectName(normalized, workspaceRoot) {
  const projectsDir = normalizePath('projects', workspaceRoot);
  if (normalized === projectsDir || !normalized.startsWith(projectsDir + '/')) {
    return null;
  }
  const relative = normalized.slice(projectsDir.length + 1);
  return relative.split('/')[0] || null;
}

/** Parse the [scope: path1, path2] list from a single todowrite entry. */
function parseScopeFromEntry(content, workspaceRoot) {
  const match = content.match(SCOPE_REGEX);
  if (!match) return [];
  return match[1]
    .replace(/["']/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((p) => normalizePath(p, workspaceRoot));
}

function parseScopeFromTodos(todos, workspaceRoot) {
  const scopeSet = new Set();
  for (const item of todos) {
    for (const p of parseScopeFromEntry(item.content ?? '', workspaceRoot)) scopeSet.add(p);
  }
  return [...scopeSet];
}

function isPathInScope(normalized, allowedScope) {
  return allowedScope.some((p) => normalized === p || normalized.startsWith(p + '/'));
}

function isProjectInScope(normalized, targetProject, allowedScope, workspaceRoot) {
  return allowedScope.some((scopePath) => {
    if (extractProjectName(scopePath, workspaceRoot) === targetProject) return true;
    return isPathInScope(normalized, [scopePath]);
  });
}

const crossProjectError = (toolName, targetPath, targetProject) =>
  `CROSS_PROJECT_VIOLATION: "${toolName}" target "${targetPath}" attempts to access sibling project "${targetProject}".\n` +
  `  Cross-project reference browsing is strictly forbidden. Build from standard templates rather than inspecting sibling projects.\n` +
  `  To explicitly allow access, add [scope:projects/${targetProject}] to a todowrite entry.`;

const scopeViolationError = (toolName, targetPath, scopeList) =>
  `SCOPE_VIOLATION: "${toolName}" target "${targetPath}" is outside the declared scope.\n` +
  `  Declared scope: ${scopeList}\n` +
  `  To access this file, add [scope:${targetPath}] to a todowrite entry.`;

function checkScope(toolName, targetPath, allowedScope, workspaceRoot) {
  if (!allowedScope || allowedScope.length === 0) return;

  const normalized = normalizePath(targetPath, workspaceRoot);
  const targetProject = extractProjectName(normalized, workspaceRoot);

  if (targetProject && !isProjectInScope(normalized, targetProject, allowedScope, workspaceRoot)) {
    throw new Error(crossProjectError(toolName, targetPath, targetProject));
  }

  if (!isPathInScope(normalized, allowedScope)) {
    throw new Error(scopeViolationError(toolName, targetPath, allowedScope.join(', ')));
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
            `  Example: "${prefix} [scope:src/] ..."`,
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

// ── Agent discovery (used by the plugin wrapper) ─────

/** Read a boolean/scalar field from a file's YAML frontmatter. */
function getFrontmatterField(content, key) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return undefined;
  const keyRe = new RegExp(`^\\s*${key}\\s*:`);
  const line = match[1].split(/\r?\n/).find((l) => keyRe.test(l));
  if (!line) return undefined;
  const value = line
    .slice(line.indexOf(':') + 1)
    .trim()
    .replace(/\s+#.*$/, '')
    .trim();
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return value;
}

/**
 * Valid subagent types = agent files with mode: subagent that are not disabled.
 * @param {{name: string, content: string}[]} agentFiles
 */
function deriveValidSubagentTypes(agentFiles) {
  return agentFiles
    .filter((file) => getFrontmatterField(file.content, 'mode') === 'subagent')
    .filter((file) => getFrontmatterField(file.content, 'disabled') !== true)
    .map((file) => file.name);
}

function allResolved(todos) {
  return (
    todos.length > 0 &&
    todos.every((item) => item.status === 'completed' || item.status === 'cancelled')
  );
}

function hasActiveTodos(todos) {
  return todos.some((item) => item.status !== 'completed' && item.status !== 'cancelled');
}

function PlanEnforcer(options = {}) {
  const { validSubagentTypes = DEFAULT_SUBAGENT_TYPES, workspaceRoot = process.cwd() } = options;
  const delegatedTypes = new Set();
  let lastTodos = [];
  let allowedScope = [];

  /** Drop all plan state: delegations, todos, and the enforced scope. */
  function resetEnforcement() {
    delegatedTypes.clear();
    lastTodos = [];
    allowedScope = [];
  }

  function checkDelegation(todos) {
    for (const item of todos) {
      if (item.status !== 'in_progress' && item.status !== 'completed') continue;
      const prefix = extractPrefix(item.content ?? '');
      if (!prefix || !DELEGATION_PREFIXES.has(prefix)) continue;

      const requiredType = PREFIX_TO_SUBAGENT[prefix];
      if (!delegatedTypes.has(requiredType)) {
        throw new Error(
          `DELEGATE_FIRST: Cannot mark "${item.content}" as ${item.status}.\n` +
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
      const isTrivial = /\(trivial\)/.test(stripped);
      if (isCoder && !isTrivial && !delegatedTypes.has('reviewer')) {
        throw new Error(
          `PIPELINE_REQUIRED: Cannot mark "${item.content}" as completed.\n` +
            `  Non-trivial Coder tasks require the pipeline (review → refactor → test).\n` +
            `  Call task(subagent_type="reviewer") first, or mark as trivial with "(trivial)".`,
        );
      }
    }
  }

  function handleDelegation(args) {
    const subagentType = args.subagent_type ?? args.agent;
    if (!subagentType) return;
    if (!validSubagentTypes.includes(subagentType)) {
      throw new Error(
        `INVALID_SUBAGENT_TYPE: "${subagentType}". Valid: ${validSubagentTypes.join(', ')}`,
      );
    }
    delegatedTypes.add(subagentType);
  }

  function handleTodowrite(todos) {
    if (todos.length === 0) {
      resetEnforcement();
      return;
    }

    lastTodos = todos;
    validatePrefixes(todos);
    validateScopeExists(todos);

    allowedScope = parseScopeFromTodos(todos, workspaceRoot);

    checkDelegation(todos);
    checkPipeline(todos);

    if (allResolved(todos)) {
      delegatedTypes.clear();
      allowedScope = [];
    }
  }

  function enforceScope(tool, args) {
    if (allowedScope.length === 0) return;
    switch (tool) {
      case 'read': {
        const filePath = args.filePath ?? args.path;
        if (!filePath) {
          throw new Error('SCOPE_VIOLATION: read tool called without a filePath.');
        }
        checkScope('read', filePath, allowedScope, workspaceRoot);
        break;
      }
      case 'glob':
      case 'grep':
        checkScope(tool, args.path || workspaceRoot, allowedScope, workspaceRoot);
        break;
      case 'bash':
      case 'shell':
        checkScope(tool, args.workdir || args.cwd || workspaceRoot, allowedScope, workspaceRoot);
        break;
    }
  }

  return {
    onToolExecuteBefore: (input, output) => {
      const tool = input?.tool;
      const args = output?.args ?? input?.args ?? {};

      if (tool === 'task' || tool === 'subagent') {
        handleDelegation(args);
        return;
      }

      if (tool === 'todowrite' || tool === 'todo') {
        // 'todo' kept as a V1 compatibility alias
        handleTodowrite(args.todos ?? []);
        return;
      }

      enforceScope(tool, args);
    },

    onEvent: (event) => {
      const type = event?.type || event?.event?.type;
      const props = event?.properties || event?.event?.properties || {};

      if (type === 'chat.message') {
        if (!hasActiveTodos(lastTodos)) resetEnforcement();
      } else if (
        type === 'session.interrupt' ||
        (type === 'tui.command.execute' && props.command === 'session.interrupt')
      ) {
        resetEnforcement();
      } else if (type === 'todo.updated' && Array.isArray(props.todos)) {
        // todo.updated carries the full todo list — always replace, never merge deltas.
        lastTodos = props.todos;
        allowedScope = parseScopeFromTodos(lastTodos, workspaceRoot);
        if (allResolved(lastTodos)) {
          delegatedTypes.clear();
          allowedScope = [];
        }
      }
    },
  };
}

module.exports = { PlanEnforcer, deriveValidSubagentTypes, FRONTMATTER_RE };
