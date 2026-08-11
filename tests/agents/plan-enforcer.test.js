const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
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

  it('accepts refactor without a prior reviewer (no gate)', async () => {
    for (const call of [taskCall('refactor'), toolCall('subagent', { agent: 'refactor' })]) {
      const enforcer = PlanEnforcer();
      await assert.doesNotReject(
        async () => enforcer.onToolExecuteBefore(call.input, call.output),
        'refactor delegation should be accepted without a prior reviewer',
      );
    }
  });

  it('enforces INVALID_SUBAGENT_TYPE even without a callID', async () => {
    const enforcer = PlanEnforcer();
    const call = {
      input: { tool: 'subagent', sessionID: 's1' },
      output: { args: { agent: 'bogus' } },
    };
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(call.input, call.output),
      /INVALID_SUBAGENT_TYPE/,
    );
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

  it('returns undefined when the directory yields no subagent types', () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-enforcer-'));
    try {
      assert.strictEqual(loadValidSubagentTypes(emptyDir), undefined);
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('falls back to the default subagent list when derivation yields nothing', async () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-enforcer-'));
    try {
      const enforcer = PlanEnforcer({
        validSubagentTypes: loadValidSubagentTypes(emptyDir),
      });
      const { input, output } = taskCall('explore');
      await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
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
