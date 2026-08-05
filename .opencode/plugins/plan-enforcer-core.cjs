/**
 * PlanEnforcer — state machine (CJS)
 *
 * Pure logic, no opencode API dependency. The plugin wrapper (plan-enforcer.js)
 * wires this to the V2 tool hook.
 *
 * V2 reality: OpenCode has no `todowrite`/`todo` tool and no `todo.updated`
 * event, so plan/scope/convention discipline is not mechanically enforceable;
 * that formatting stays an instruction convention (see coder.md). What V2 *can*
 * gate at a tool-call boundary is enforced here.
 *
 * Mechanically enforced (authoritative gate list — keep plan-enforcer.js and
 * README in sync with this):
 *   - INVALID_SUBAGENT_TYPE: subagent/task tools must use a valid agent name
 *     (an agent file with mode: subagent, not disabled)
 *   - REFACTOR_REQUIRES_REVIEWER: a refactor subagent cannot be delegated
 *     before a reviewer subagent has run (review → refactor ordering)
 */

const fs = require('fs');
const path = require('path');

/** Fallback subagent types when the wrapper cannot derive them from disk. */
const DEFAULT_SUBAGENT_TYPES = ['explore', 'researcher', 'reviewer', 'refactor'];

/** Tool names that delegate to a subagent (task is a V1 alias of subagent). */
const DELEGATION_TOOLS = new Set(['subagent', 'task']);

/**
 * Fallback key when a call carries no session identifier. The V2 tool hook
 * always supplies sessionID on execute.before, so this is only a defensive
 * arm; calls that reach it pool together (a reviewer in the pool un-does the
 * refactor gate for the pool).
 */
const DEFAULT_SESSION = '__default__';

/**
 * Matches YAML frontmatter delimited by --- lines.
 * Shared with tests/agents/helpers.js (parseFrontmatter), which imports it.
 */
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

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

/**
 * Read an agents directory and derive the enabled subagent types
 * (mode: subagent, not disabled). Returns undefined when the directory
 * cannot be read — callers fall back to DEFAULT_SUBAGENT_TYPES.
 */
function loadValidSubagentTypes(agentsDir) {
  try {
    const files = fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({
        name: path.basename(f, '.md'),
        content: fs.readFileSync(path.join(agentsDir, f), 'utf8'),
      }));
    return deriveValidSubagentTypes(files);
  } catch {
    return undefined;
  }
}

/**
 * Build a PlanEnforcer state machine.
 * @param {{validSubagentTypes?: string[], workspaceRoot?: string}} [options]
 */
function PlanEnforcer(options = {}) {
  const { validSubagentTypes = DEFAULT_SUBAGENT_TYPES } = options;

  /** Sessions that have already had a reviewer run (satisfies the refactor gate). */
  const reviewedSessions = new Set();

  function handleDelegationTool(type, sessionID) {
    if (!validSubagentTypes.includes(type)) {
      throw new Error(`INVALID_SUBAGENT_TYPE: "${type}". Valid: ${validSubagentTypes.join(', ')}`);
    }
    if (type === 'reviewer') reviewedSessions.add(sessionID);
    if (type === 'refactor' && !reviewedSessions.has(sessionID)) {
      throw new Error(
        'REFACTOR_REQUIRES_REVIEWER: Cannot delegate a refactor before a reviewer has ' +
          'run in this session.\n' +
          `  Pipeline requires review → refactor. Call subagent(agent="reviewer") first.`,
      );
    }
    return { delegatedType: type };
  }

  function onToolExecuteBefore(input = {}, output = {}) {
    if (!DELEGATION_TOOLS.has(input.tool)) return undefined;
    const sessionID = input.sessionID ?? output.sessionID ?? DEFAULT_SESSION;
    const args = output.args ?? input.args ?? {};
    const type = args.subagent_type ?? args.agent;
    if (!type) return undefined;
    return handleDelegationTool(type, sessionID);
  }

  return { onToolExecuteBefore };
}

module.exports = {
  PlanEnforcer,
  deriveValidSubagentTypes,
  loadValidSubagentTypes,
  FRONTMATTER_RE,
  DEFAULT_SUBAGENT_TYPES,
  getFrontmatterField,
};
