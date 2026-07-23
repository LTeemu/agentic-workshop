const fs = require('node:fs');
const path = require('node:path');

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
 * Parse YAML frontmatter from a markdown file.
 * Handles flat keys (key: value) and nested keys (key:\n  sub: val).
 * Returns null if no valid frontmatter found.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const yaml = match[1];
  const result = {};
  let currentParent = null;

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed === '---') continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let val = trimmed.slice(colonIdx + 1).trim();

    if (val === 'true') val = true;
    else if (val === 'false') val = false;
    else if (/^\d+$/.test(val)) val = Number(val);

    if (line[0] === ' ' && currentParent) {
      if (typeof result[currentParent] !== 'object' || result[currentParent] === null) {
        result[currentParent] = {};
      }
      result[currentParent][key] = val;
    } else {
      currentParent = key;
      if (val === '') {
        result[currentParent] = {};
      } else {
        result[currentParent] = val;
      }
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
    if (!fm.permission || typeof fm.permission !== 'object') {
      issues.push('subagent missing permission settings block');
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

/** Create a todowrite tool call. */
function todowriteCall(todos) {
  return toolCall('todowrite', { todos });
}

/** Create a task delegation call. */
function taskCall(subagentType) {
  return toolCall('task', { subagent_type: subagentType });
}

module.exports = {
  getWorkspace,
  getAgentsDir,
  getSkillsDir,
  getAgentNames,
  getSkillNames,
  parseFrontmatter,
  validateAgentConfig,
  validateSkill,
  readFile,
  toolCall,
  todowriteCall,
  taskCall,
};
