const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const PLUGIN_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '.opencode',
  'plugins',
  'plan-enforcer-core.cjs',
);
const { PlanEnforcer, deriveValidSubagentTypes, loadValidSubagentTypes } = require(PLUGIN_PATH);
const { taskCall, toolCall, getAgentsDir } = require('./helpers');

describe('PlanEnforcer — Invalid subagent_type rejection', () => {
  it('rejects task() with invalid subagent_type', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = toolCall('task', { subagent_type: 'invalid-agent' });
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(input, output),
      /INVALID_SUBAGENT_TYPE/,
    );
  });

  it('rejects "general" (not in the default subagent list)', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = taskCall('general');
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(input, output),
      /INVALID_SUBAGENT_TYPE/,
    );
  });

  it('accepts valid subagent types: explore, researcher, reviewer', async () => {
    for (const type of ['explore', 'researcher', 'reviewer']) {
      const e = PlanEnforcer();
      const { input, output } = taskCall(type);
      await assert.doesNotReject(
        async () => e.onToolExecuteBefore(input, output),
        `subagent_type "${type}" should be accepted`,
      );
    }
  });

  it('rejects subagent() with invalid agent param', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = toolCall('subagent', { agent: 'invalid-agent' });
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(input, output),
      /INVALID_SUBAGENT_TYPE/,
    );
  });

  it('accepts subagent() with valid agent param', async () => {
    for (const agent of ['explore', 'researcher', 'reviewer']) {
      const e = PlanEnforcer();
      const { input, output } = toolCall('subagent', { agent });
      await assert.doesNotReject(
        async () => e.onToolExecuteBefore(input, output),
        `agent "${agent}" should be accepted`,
      );
    }
  });

  it('ignores delegation calls with no subagent type', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = toolCall('subagent', {});
    assert.strictEqual(enforcer.onToolExecuteBefore(input, output), undefined);
  });

  it('ignores non-delegation tools entirely', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = toolCall('edit', { filePath: 'src/foo.js' });
    assert.strictEqual(enforcer.onToolExecuteBefore(input, output), undefined);
  });
});

describe('PlanEnforcer — Refactor gate (REFACTOR_REQUIRES_REVIEWER)', () => {
  it('blocks task(refactor) before any reviewer ran', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = taskCall('refactor');
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(input, output),
      /REFACTOR_REQUIRES_REVIEWER/,
    );
  });

  it('blocks subagent({agent: refactor}) before a reviewer', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = toolCall('subagent', { agent: 'refactor' });
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(input, output),
      /REFACTOR_REQUIRES_REVIEWER/,
    );
  });

  it('allows refactor after a reviewer ran in the same session', async () => {
    const enforcer = PlanEnforcer();
    const { input: rIn, output: rOut } = taskCall('reviewer');
    await enforcer.onToolExecuteBefore(rIn, rOut);
    const { input: fIn, output: fOut } = taskCall('refactor');
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(fIn, fOut));
  });

  it('allows refactor after subagent reviewer', async () => {
    const enforcer = PlanEnforcer();
    const { input: rIn, output: rOut } = toolCall('subagent', { agent: 'reviewer' });
    await enforcer.onToolExecuteBefore(rIn, rOut);
    const { input: fIn, output: fOut } = toolCall('subagent', { agent: 'refactor' });
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(fIn, fOut));
  });

  it('keeps the reviewer run per session, not per tool call', async () => {
    const enforcer = PlanEnforcer();
    const { input: rIn, output: rOut } = toolCall('subagent', { agent: 'reviewer' });
    await enforcer.onToolExecuteBefore(rIn, rOut);
    // A later refactor delegation in the same session still passes.
    const { input: fIn, output: fOut } = taskCall('refactor');
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(fIn, fOut));
  });

  it('still blocks refactor in a different session that never ran a reviewer', async () => {
    const enforcer = PlanEnforcer();
    const reviewer = {
      input: { tool: 'subagent', sessionID: 'session-A', callID: 'c1' },
      output: { args: { agent: 'reviewer' } },
    };
    const refactorB = {
      input: { tool: 'subagent', sessionID: 'session-B', callID: 'c2' },
      output: { args: { agent: 'refactor' } },
    };
    await enforcer.onToolExecuteBefore(reviewer.input, reviewer.output);
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(refactorB.input, refactorB.output),
      /REFACTOR_REQUIRES_REVIEWER/,
    );
  });
});

describe('PlanEnforcer — deriveValidSubagentTypes', () => {
  const agent = (name, extra = '') =>
    `---\ndescription: ${name}\nmode: subagent\n${extra}---\n\nbody`;

  it('includes enabled subagents', () => {
    const types = deriveValidSubagentTypes([
      { name: 'explore', content: agent('explore') },
      { name: 'researcher', content: agent('researcher') },
    ]);
    assert.deepStrictEqual([...types].sort(), ['explore', 'researcher']);
  });

  it('excludes disabled agents', () => {
    const types = deriveValidSubagentTypes([
      { name: 'general', content: agent('general', 'disabled: true\n') },
      { name: 'reviewer', content: agent('reviewer') },
    ]);
    assert.deepStrictEqual(types, ['reviewer']);
  });

  it('excludes primary agents', () => {
    const types = deriveValidSubagentTypes([
      {
        name: 'coder',
        content: '---\ndescription: coder\nmode: primary\n---\n\nbody',
      },
    ]);
    assert.deepStrictEqual(types, []);
  });

  it('handles files without frontmatter', () => {
    const types = deriveValidSubagentTypes([{ name: 'notes', content: 'no frontmatter' }]);
    assert.deepStrictEqual(types, []);
  });

  it('treats case-insensitive booleans and inline comments correctly', () => {
    const types = deriveValidSubagentTypes([
      { name: 'legacy', content: agent('legacy', 'disabled: TRUE # retired\n') },
      { name: 'active', content: agent('active', 'disabled: false # keep\n') },
    ]);
    assert.deepStrictEqual(types, ['active']);
  });
});

describe('PlanEnforcer — loadValidSubagentTypes', () => {
  it('derives enabled subagents from the real agents directory', () => {
    const types = loadValidSubagentTypes(getAgentsDir());
    for (const expected of ['explore', 'refactor', 'researcher', 'reviewer']) {
      assert.ok(types.includes(expected), `expected "${expected}" to be a valid subagent`);
    }
    assert.ok(!types.includes('general'), 'disabled general must not be a valid subagent');
    assert.ok(!types.includes('coder'), 'primary coder must not be a valid subagent');
  });

  it('returns undefined when the agents directory is unreadable', () => {
    assert.strictEqual(
      loadValidSubagentTypes(path.join(__dirname, 'no-such-agents-dir')),
      undefined,
    );
  });
});

describe('PlanEnforcer — custom valid subagent list', () => {
  it('uses validSubagentTypes passed via options', async () => {
    const enforcer = PlanEnforcer({ validSubagentTypes: ['explore'] });
    const { input, output } = taskCall('researcher');
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(input, output),
      /INVALID_SUBAGENT_TYPE/,
    );
  });
});
