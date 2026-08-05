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
  reviewer: { edit: 'deny', shell: 'deny' },
  researcher: { edit: 'deny', shell: 'deny' },
  explore: { edit: 'deny', shell: 'deny', webfetch: 'deny', websearch: 'deny' },
  refactor: { edit: 'allow', shell: 'deny', webfetch: 'deny', websearch: 'deny' },
  general: { edit: 'deny', shell: 'deny' },
};

describe('Agent permission consistency', () => {
  it('subagent permissions match their role', () => {
    /** Returns the effect (allow/deny) for an action, or undefined. */
    const effectOf = (agent, action) => {
      const content = readFile(path.join(AGENTS_DIR, `${agent}.md`));
      const fm = parseFrontmatter(content ?? '');
      const perms = Array.isArray(fm?.permissions) ? fm.permissions : [];
      let effect;
      for (const p of perms) {
        if (p.action === action) effect = p.effect;
      }
      return effect;
    };

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

  it('general agent is disabled', () => {
    const general = parseFrontmatter(readFile(path.join(AGENTS_DIR, 'general.md')) ?? '');
    assert.strictEqual(general?.disabled, true, 'general should be disabled');
  });
});
