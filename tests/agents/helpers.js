const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_CORE = require(
  path.join(__dirname, '..', '..', '.opencode', 'plugins', 'plan-enforcer-core.cjs'),
);
const { FRONTMATTER_RE } = PLUGIN_CORE;

// ── Paths ────────────────────────────────────────────

const WORKSPACE = path.resolve(__dirname, '..', '..');
const AGENTS_DIR = path.join(WORKSPACE, '.opencode', 'agents');
const SKILLS_DIR = path.join(WORKSPACE, '.opencode', 'skills');

function getAgentsDir() {
  return AGENTS_DIR;
}
function getSkillsDir() {
  return SKILLS_DIR;
}
function getWorkspace() {
  return WORKSPACE;
}

// ── Discovery ────────────────────────────────────────

/** Returns agent names (basename without .md) from .opencode/agents/. */
function getAgentNames() {
  try {
    return fs
      .readdirSync(AGENTS_DIR)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.basename(f, '.md'));
  } catch {
    return [];
  }
}

/** Returns skill directory names from .opencode/skills/. */
function getSkillNames() {
  try {
    return fs
      .readdirSync(SKILLS_DIR)
      .filter((f) => fs.statSync(path.join(SKILLS_DIR, f)).isDirectory());
  } catch {
    return [];
  }
}

// ── Frontmatter Parsing ──────────────────────────────

/**
 * Split "key: value" (or bare "key") into a typed key/value pair.
 * Quoted strings and boolean/number literals are unquoted/typed.
 */
function splitKeyValue(raw) {
  const colonIdx = raw.indexOf(':');
  if (colonIdx === -1) return { key: raw.trim(), value: '' };
  const key = raw.slice(0, colonIdx).trim();
  let value = raw.slice(colonIdx + 1).trim();
  if (
    (value.startsWith("'") && value.endsWith("'")) ||
    (value.startsWith('"') && value.endsWith('"'))
  ) {
    value = value.slice(1, -1);
  } else if (value === 'true') {
    value = true;
  } else if (value === 'false') {
    value = false;
  } else if (/^\d+$/.test(value)) {
    value = Number(value);
  }
  return { key, value };
}

/**
 * Parse YAML frontmatter from a markdown file.
 * Supports the subset used by .opencode/agents/*.md: flat keys (key: value)
 * and a `permissions:` list of {action, resource, effect} objects.
 * Returns null if no valid frontmatter found.
 * The delimiter regex is shared with plan-enforcer-core.cjs (FRONTMATTER_RE).
 */
function parseFrontmatter(content) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;

  const result = {};
  let listKey = null;
  let currentItem = null;

  for (const rawLine of match[1].split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // List item, e.g. "- action: edit"
    if (trimmed.startsWith('- ')) {
      const { key, value } = splitKeyValue(trimmed.slice(2));
      if (listKey) {
        currentItem = { [key]: value };
        if (!Array.isArray(result[listKey])) result[listKey] = [];
        result[listKey].push(currentItem);
      }
      continue;
    }

    // Indented key belonging to the current list item, e.g. "    effect: deny"
    if (listKey && currentItem && rawLine.startsWith(' ') && !trimmed.startsWith('-')) {
      const { key, value } = splitKeyValue(trimmed);
      currentItem[key] = value;
      continue;
    }

    // Top-level key
    const { key, value } = splitKeyValue(trimmed);
    if (value === '') {
      result[key] = {};
      listKey = key;
      currentItem = null;
    } else {
      result[key] = value;
      listKey = null;
      currentItem = null;
    }
  }
  return result;
}

/** Validate agent frontmatter, returns array of issue strings. */
function validateAgentConfig(fm) {
  const issues = [];
  if (!fm.description) issues.push('missing "description" field');
  if (!fm.mode) issues.push('missing "mode" field');
  if (fm.mode && !['primary', 'subagent'].includes(fm.mode)) {
    issues.push(`invalid mode "${fm.mode}" — must be "primary" or "subagent"`);
  }
  if (fm.mode === 'subagent') {
    const perms = fm.permissions;
    if (!Array.isArray(perms) || perms.length === 0) {
      issues.push('subagent missing permission settings block');
    } else if (!perms.every((p) => p && typeof p === 'object' && p.action && p.effect)) {
      issues.push('subagent permission entries must have "action" and "effect"');
    }
  }
  return issues;
}

/** Validate skill directory structure, returns array of issue strings. */
function validateSkill(skillPath) {
  const issues = [];
  const skillFile = path.join(skillPath, 'SKILL.md');
  if (!fs.existsSync(skillFile)) {
    issues.push('missing SKILL.md');
    return issues;
  }
  const content = fs.readFileSync(skillFile, 'utf-8');
  if (!content) {
    issues.push('SKILL.md is empty');
    return issues;
  }

  const afterFm = content.replace(/^---[\s\S]*?\n---\n/, '');
  const firstRealLine = afterFm.trimStart().split('\n')[0];
  if (!firstRealLine || !firstRealLine.startsWith('#')) {
    issues.push('SKILL.md content does not start with a heading');
  }

  const nonEmptyLines = content.split('\n').filter((l) => l.trim());
  if (nonEmptyLines.length < 3) {
    issues.push('SKILL.md is too minimal — expected at least a few paragraphs');
  }
  return issues;
}

// ── Safe Reading ─────────────────────────────────────

/** Read file, return content string or null if missing. */
function readFile(p) {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return null;
  }
}

// ── PlanEnforcer Test Helpers ────────────────────────

/**
 * Create a minimal input/output pair for tool.execute.before.
 * Both input and output come from the same call — always destructure together.
 */
function toolCall(tool, args = {}) {
  return {
    input: { tool, sessionID: 'test-session', callID: `call-${Date.now()}` },
    output: { args },
  };
}

/** Create a task delegation call. */
function taskCall(subagentType) {
  return toolCall('task', { subagent_type: subagentType });
}

/** Create a subagent delegation call (uses agent param, matching the actual subagent tool). */
function subagentCall(agent) {
  return toolCall('subagent', { agent });
}

/** Create an edit/write/patch call (records a change toward the review gate). */
function editCall(tool, args = {}) {
  return toolCall(tool, args);
}

module.exports = {
  getWorkspace,
  getAgentsDir,
  getSkillsDir,
  getAgentNames,
  getSkillNames,
  splitKeyValue,
  parseFrontmatter,
  validateAgentConfig,
  validateSkill,
  readFile,
  toolCall,
  taskCall,
  subagentCall,
  editCall,
};
