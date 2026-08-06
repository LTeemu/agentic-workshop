const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { getWorkspace, getAgentNames, readFile, parseFrontmatter } = require('./helpers');

const AGENTS_DIR = path.join(getWorkspace(), '.opencode', 'agents');

/**
 * Expected permission effects per agent, keyed by action.
 * Declared deny entries in .opencode/agents/*.md frontmatter — these are the
 * security-critical constraints (read-only agents must not edit/shell/web).
 */
const ROLE_PERMISSIONS = {
  coder: {}, // primary agent — no permission block, nothing to assert
  // reviewer shell is a read-only git allowlist, asserted separately below
  reviewer: { edit: 'deny' },
  researcher: { edit: 'deny', shell: 'deny' },
  explore: { edit: 'deny', shell: 'deny', webfetch: 'deny', websearch: 'deny' },
  refactor: { edit: 'allow', shell: 'deny', webfetch: 'deny', websearch: 'deny' },
  general: { edit: 'deny', shell: 'deny' },
};

/** Read-only git commands the reviewer must be able to run. */
const REVIEWER_GIT_ALLOWLIST = [
  'git diff',
  'git diff --stat HEAD',
  'git diff abc1234 -- src/app.js',
  'git show abc1234:src/app.js',
  'git rev-parse HEAD',
  'git log --oneline -5',
  'git status --short',
];

/** Mutating / non-git commands that must stay denied for the reviewer. */
const REVIEWER_GIT_DENYLIST = [
  'git push origin main',
  'git commit -m "fix"',
  'git reset --hard',
  'git rm src/app.js',
  'git branch feature/x',
  'git checkout feature/x',
  'git stash push',
  'rm -rf node_modules',
  'node -e "process.exit(1)"',
];

/**
 * Wildcard-match a permission resource pattern against a value.
 * Mirrors the OpenCode rule matcher: `*` matches any run of chars (incl. `/`),
 * `?` one char. A pattern ending in " *" also matches the bare command.
 */
function resourceMatches(pattern, value) {
  // Escape regex metacharacters except the wildcards * and ?.
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const wildcards = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  const alternatives = [wildcards];
  if (pattern.endsWith(' *')) {
    alternatives.push(escaped.slice(0, -2));
  }
  return new RegExp(`^(?:${alternatives.join('|')})$`, 'i').test(value);
}

describe('Agent permission consistency', () => {
  /**
   * Resolve the effective effect for an action/resource by last-match-wins —
   * the same semantics OpenCode applies to the agent's permission rules.
   */
  const effectOf = (agent, action, resource = '*') => {
    const content = readFile(path.join(AGENTS_DIR, `${agent}.md`));
    const fm = parseFrontmatter(content ?? '');
    const perms = Array.isArray(fm?.permissions) ? fm.permissions : [];
    let effect;
    for (const p of perms) {
      if (p.action === action && resourceMatches(p.resource ?? '*', resource)) {
        effect = p.effect;
      }
    }
    return effect;
  };

  it('subagent permissions match their role', () => {
    for (const agent of getAgentNames()) {
      const expected = ROLE_PERMISSIONS[agent];
      assert.ok(
        expected,
        `no expected permissions defined for agent "${agent}" — add it to ROLE_PERMISSIONS`,
      );
      for (const [action, effect] of Object.entries(expected)) {
        const actual = effectOf(agent, action);
        assert.strictEqual(
          actual,
          effect,
          `expected ${agent}.${action} = ${effect}, got ${actual}`,
        );
      }
    }
  });

  it('reviewer shell is a read-only git allowlist', () => {
    for (const cmd of REVIEWER_GIT_ALLOWLIST) {
      assert.strictEqual(effectOf('reviewer', 'shell', cmd), 'allow', `expected allow: ${cmd}`);
    }
    for (const cmd of REVIEWER_GIT_DENYLIST) {
      assert.strictEqual(effectOf('reviewer', 'shell', cmd), 'deny', `expected deny: ${cmd}`);
    }
  });

  it('general agent is disabled', () => {
    const general = parseFrontmatter(readFile(path.join(AGENTS_DIR, 'general.md')) ?? '');
    assert.strictEqual(general?.disabled, true, 'general should be disabled');
  });
});
