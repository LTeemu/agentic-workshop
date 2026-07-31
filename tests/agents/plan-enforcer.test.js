const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const PLUGIN_PATH = path.resolve(
  __dirname,
  '..',
  '..',
  '.opencode',
  'plugins',
  'plan-enforcer-core.cjs',
);
const { PlanEnforcer, deriveValidSubagentTypes } = require(PLUGIN_PATH);
const { todowriteCall, taskCall, toolCall, subagentCall, getAgentsDir } = require('./helpers');

describe('PlanEnforcer — Prefix Extraction (via delegation gating)', () => {
  let enforcer;

  beforeEach(() => {
    enforcer = PlanEnforcer();
  });

  it('rejects todowrite entries without a role prefix', async () => {
    const { input, output } = todowriteCall([{ content: 'do something', status: 'pending' }]);
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(input, output),
      /ROLE_PREFIX_REQUIRED/,
    );
  });

  it('accepts todowrite entries with valid Coder prefix', async () => {
    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] do something', status: 'pending' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('accepts all valid prefixes: Researcher, Reviewer, Refactor, Coder', async () => {
    for (const prefix of ['Researcher', 'Reviewer', 'Refactor', 'Coder']) {
      const e = PlanEnforcer();
      const { input, output } = todowriteCall([
        { content: `${prefix}: [scope:.] test task`, status: 'pending' },
      ]);
      await assert.doesNotReject(
        async () => e.onToolExecuteBefore(input, output),
        `Prefix "${prefix}:" should be accepted`,
      );
    }
  });

  it('accepts the "todo" tool alias for todowrite calls', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = toolCall('todo', {
      todos: [{ content: 'Coder: [scope:.] work', status: 'pending' }],
    });
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });
});

describe('PlanEnforcer — Scope Enforcement (SCOPE_REQUIRED)', () => {
  let enforcer;

  beforeEach(() => {
    enforcer = PlanEnforcer();
  });

  it('rejects Coder entry without [scope:...]', async () => {
    const { input, output } = todowriteCall([
      { content: 'Coder: implement feature', status: 'pending' },
    ]);
    await assert.rejects(async () => enforcer.onToolExecuteBefore(input, output), /SCOPE_REQUIRED/);
  });

  it('rejects Reviewer entry without [scope:...]', async () => {
    const { input, output } = todowriteCall([
      { content: 'Reviewer: review code', status: 'pending' },
    ]);
    await assert.rejects(async () => enforcer.onToolExecuteBefore(input, output), /SCOPE_REQUIRED/);
  });

  it('rejects Refactor entry without [scope:...]', async () => {
    const { input, output } = todowriteCall([
      { content: 'Refactor: clean code', status: 'pending' },
    ]);
    await assert.rejects(async () => enforcer.onToolExecuteBefore(input, output), /SCOPE_REQUIRED/);
  });

  it('allows Researcher entry without [scope...] provided another entry has a scope', async () => {
    const { input, output } = todowriteCall([
      { content: 'Researcher: research topic', status: 'pending' },
      { content: 'Coder: [scope:src/] implement feature', status: 'pending' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('rejects plan if all entries omit scope', async () => {
    const { input, output } = todowriteCall([
      { content: 'Researcher: research topic without scope', status: 'pending' },
    ]);
    await assert.rejects(async () => enforcer.onToolExecuteBefore(input, output), /SCOPE_REQUIRED/);
  });
});

describe('PlanEnforcer — Delegation Gate (DELEGATE_FIRST)', () => {
  const CASES = [
    { prefix: 'Researcher', type: 'researcher' },
    { prefix: 'Reviewer', type: 'reviewer' },
    { prefix: 'Refactor', type: 'refactor' },
  ];

  for (const { prefix, type } of CASES) {
    it(`blocks ${prefix} in_progress without prior task(${type})`, async () => {
      const enforcer = PlanEnforcer();
      const { input: setupIn, output: setupOut } = todowriteCall([
        { content: 'Coder: [scope:.] setup', status: 'pending' },
      ]);
      await enforcer.onToolExecuteBefore(setupIn, setupOut);

      const { input, output } = todowriteCall([
        { content: 'Coder: [scope:.] setup', status: 'pending' },
        { content: `${prefix}: [scope:.] task`, status: 'in_progress' },
      ]);
      await assert.rejects(
        async () => enforcer.onToolExecuteBefore(input, output),
        /DELEGATE_FIRST/,
      );
    });

    it(`allows ${prefix} in_progress after task(${type}) delegation`, async () => {
      const enforcer = PlanEnforcer();
      const { input: taskIn, output: taskOut } = taskCall(type);
      await enforcer.onToolExecuteBefore(taskIn, taskOut);

      const { input: setupIn, output: setupOut } = todowriteCall([
        { content: 'Coder: [scope:.] setup', status: 'pending' },
      ]);
      await enforcer.onToolExecuteBefore(setupIn, setupOut);

      const { input, output } = todowriteCall([
        { content: 'Coder: [scope:.] setup', status: 'pending' },
        { content: `${prefix}: [scope:.] task`, status: 'in_progress' },
      ]);
      await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
    });
  }

  it('does not block Coder items from being marked in_progress', async () => {
    const enforcer = PlanEnforcer();
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:.] first task (trivial)', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] first task (trivial)', status: 'completed' },
      { content: 'Coder: [scope:.] second task', status: 'in_progress' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });
});

describe('PlanEnforcer — Pipeline Gate (PIPELINE_REQUIRED)', () => {
  it('blocks non-trivial Coder completed without reviewer', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] implement feature', status: 'completed' },
    ]);
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(input, output),
      /PIPELINE_REQUIRED/,
    );
  });

  it('allows Coder completed with (trivial) suffix', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] fix typo (trivial)', status: 'completed' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('allows non-trivial Coder completed after reviewer was called', async () => {
    const enforcer = PlanEnforcer();
    const { input: taskIn, output: taskOut } = taskCall('reviewer');
    await enforcer.onToolExecuteBefore(taskIn, taskOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] implement feature', status: 'completed' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('does not block non-Coder items from completing without reviewer', async () => {
    const enforcer = PlanEnforcer();
    const { input: taskIn, output: taskOut } = taskCall('researcher');
    await enforcer.onToolExecuteBefore(taskIn, taskOut);

    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
      { content: 'Researcher: [scope:.] research', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
      { content: 'Researcher: [scope:.] research', status: 'completed' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });
});

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

  it('accepts valid subagent types: explore, researcher, reviewer, refactor', async () => {
    for (const type of ['explore', 'researcher', 'reviewer', 'refactor']) {
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
    const { input, output } = subagentCall('invalid-agent');
    await assert.rejects(
      async () => enforcer.onToolExecuteBefore(input, output),
      /INVALID_SUBAGENT_TYPE/,
    );
  });

  it('accepts subagent() with valid agent param: explore, researcher, reviewer, refactor', async () => {
    for (const agent of ['explore', 'researcher', 'reviewer', 'refactor']) {
      const e = PlanEnforcer();
      const { input, output } = subagentCall(agent);
      await assert.doesNotReject(
        async () => e.onToolExecuteBefore(input, output),
        `agent "${agent}" should be accepted`,
      );
    }
  });
});

describe('PlanEnforcer — subagent agent param before todowrite', () => {
  for (const agent of ['explore', 'researcher', 'reviewer', 'refactor']) {
    it(`allows subagent({agent: "${agent}"}) before plan is confirmed`, async () => {
      const enforcer = PlanEnforcer();
      const { input, output } = subagentCall(agent);
      await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
    });
  }

  it('registers the delegated type for gating when using agent param', async () => {
    const enforcer = PlanEnforcer();
    // Call subagent with agent param — should register delegation
    const { input: subIn, output: subOut } = subagentCall('researcher');
    await enforcer.onToolExecuteBefore(subIn, subOut);

    // Now a Researcher: entry can be marked in_progress
    const { input: tdIn, output: tdOut } = todowriteCall([
      { content: 'Researcher: [scope:.] check', status: 'in_progress' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(tdIn, tdOut));
  });
});

describe('PlanEnforcer — non-blocking before todowrite', () => {
  let enforcer;

  beforeEach(() => {
    enforcer = PlanEnforcer();
  });

  it('allows read-only tools (read, glob, grep) before todowrite', () => {
    for (const tool of ['read', 'glob', 'grep']) {
      assert.doesNotThrow(
        () =>
          enforcer.onToolExecuteBefore(
            { tool, sessionID: 'test', callID: '1' },
            { args: tool === 'read' ? { filePath: 'test.txt' } : { path: '.' } },
          ),
        `tool "${tool}" should not throw before todowrite`,
      );
    }
  });

  it('allows mutation tools (write, edit, shell) before todowrite', () => {
    for (const tool of ['write', 'edit', 'shell']) {
      assert.doesNotThrow(
        () => enforcer.onToolExecuteBefore({ tool, sessionID: 'test', callID: '1' }, { args: {} }),
        `tool "${tool}" should not throw before todowrite`,
      );
    }
  });

  it('still rejects a malformed plan once todowrite is called', () => {
    const { input, output } = todowriteCall([{ content: 'no prefix here', status: 'pending' }]);
    assert.throws(() => enforcer.onToolExecuteBefore(input, output), /ROLE_PREFIX_REQUIRED/);
  });
});

describe('PlanEnforcer — Plan Reset', () => {
  it('clears scope after all todos are resolved via todo.updated', async () => {
    const enforcer = PlanEnforcer();

    const { input: tdIn, output: tdOut } = todowriteCall([
      { content: 'Coder: [scope:src/] work', status: 'in_progress' },
    ]);
    await enforcer.onToolExecuteBefore(tdIn, tdOut);

    // Scope is enforced while the plan has active items
    assert.throws(
      () =>
        enforcer.onToolExecuteBefore(
          { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
          { args: { filePath: 'package.json' } },
        ),
      /SCOPE_VIOLATION/,
    );

    await enforcer.onEvent({
      type: 'todo.updated',
      properties: { todos: [{ content: 'Coder: [scope:src/] work', status: 'completed' }] },
    });

    // After resolution, scope is cleared and tools run freely
    assert.doesNotThrow(() =>
      enforcer.onToolExecuteBefore(
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: 'package.json' } },
      ),
    );
  });

  it('preserves scope when there are still active items on chat message', async () => {
    const enforcer = PlanEnforcer();

    const { input: tdIn, output: tdOut } = todowriteCall([
      { content: 'Coder: [scope:.] still working', status: 'in_progress' },
    ]);
    await enforcer.onToolExecuteBefore(tdIn, tdOut);

    await enforcer.onEvent({ type: 'chat.message' });

    await assert.doesNotReject(async () =>
      enforcer.onToolExecuteBefore(
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: 'data/scope-test.txt' } },
      ),
    );
  });
});

describe('PlanEnforcer — Plan Reset (todo.updated full replacement)', () => {
  it('treats todo.updated as a full replacement even when the list shrinks', async () => {
    const enforcer = PlanEnforcer();

    const { input: tdIn, output: tdOut } = todowriteCall([
      { content: 'Coder: [scope:src/] work', status: 'in_progress' },
      { content: 'Coder: [scope:src/] cleanup', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(tdIn, tdOut);

    // Shorter list: only the resolved item remains → scope clears.
    await enforcer.onEvent({
      type: 'todo.updated',
      properties: { todos: [{ content: 'Coder: [scope:src/] work', status: 'completed' }] },
    });

    assert.doesNotThrow(() =>
      enforcer.onToolExecuteBefore(
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: 'package.json' } },
      ),
    );
  });
});

describe('PlanEnforcer — Plan Reset (session.interrupt)', () => {
  it('clears scope on session.interrupt', async () => {
    const enforcer = PlanEnforcer();

    const { input: tdIn, output: tdOut } = todowriteCall([
      { content: 'Coder: [scope:src/] work', status: 'in_progress' },
    ]);
    await enforcer.onToolExecuteBefore(tdIn, tdOut);

    assert.throws(
      () =>
        enforcer.onToolExecuteBefore(
          { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
          { args: { filePath: 'package.json' } },
        ),
      /SCOPE_VIOLATION/,
    );

    await enforcer.onEvent({ type: 'session.interrupt' });

    assert.doesNotThrow(() =>
      enforcer.onToolExecuteBefore(
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: 'package.json' } },
      ),
    );
  });
});

describe('PlanEnforcer — Cross-Project Isolation (CROSS_PROJECT_VIOLATION)', () => {
  let enforcer;
  const workspaceRoot = path.resolve(__dirname, '..', '..');

  beforeEach(() => {
    enforcer = PlanEnforcer({ workspaceRoot });
  });

  function confirmScope(scopePath) {
    const { input, output } = todowriteCall([
      { content: `Coder: [scope:${scopePath}] work`, status: 'in_progress' },
    ]);
    return enforcer.onToolExecuteBefore(input, output);
  }

  it('blocks read of a sibling project when scope is another project', async () => {
    await confirmScope('projects/bravo');
    assert.throws(
      () =>
        enforcer.onToolExecuteBefore(
          { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
          { args: { filePath: 'projects/alpha/src/index.js' } },
        ),
      /CROSS_PROJECT_VIOLATION/,
    );
  });

  it('blocks access to any project when scope does not include it', async () => {
    await confirmScope('src/');
    assert.throws(
      () =>
        enforcer.onToolExecuteBefore(
          { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
          { args: { filePath: 'projects/alpha/README.md' } },
        ),
      /CROSS_PROJECT_VIOLATION/,
    );
  });

  it('allows access inside the declared project scope', async () => {
    await confirmScope('projects/alpha');
    assert.doesNotThrow(() =>
      enforcer.onToolExecuteBefore(
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: 'projects/alpha/src/index.js' } },
      ),
    );
  });

  it('enforces isolation for glob, grep and bash too', async () => {
    await confirmScope('projects/bravo');
    const cases = [
      ['glob', { path: 'projects/alpha' }],
      ['grep', { path: 'projects/alpha' }],
      ['bash', { workdir: 'projects/alpha' }],
    ];
    for (const [tool, args] of cases) {
      assert.throws(
        () =>
          enforcer.onToolExecuteBefore(
            { tool, sessionID: 'test-session', callID: 'test-call' },
            { args },
          ),
        /CROSS_PROJECT_VIOLATION/,
        `tool "${tool}" should be blocked for sibling projects`,
      );
    }
  });

  it('allows any project when scope declares the projects/ root', async () => {
    await confirmScope('projects');
    assert.doesNotThrow(() =>
      enforcer.onToolExecuteBefore(
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: 'projects/alpha/src/index.js' } },
      ),
    );
  });
});

describe('PlanEnforcer — Scope Violation (tool coverage)', () => {
  let enforcer;

  beforeEach(() => {
    enforcer = PlanEnforcer();
  });

  it('enforces scope for glob, grep, bash, shell and read-via-path', async () => {
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:src/] work', status: 'in_progress' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    const cases = [
      ['glob', { path: 'src/' }, { path: 'package.json' }],
      ['grep', { path: 'src/' }, { path: 'package.json' }],
      ['bash', { workdir: 'src/' }, { workdir: 'lib/' }],
      ['shell', { workdir: 'src/' }, { workdir: 'lib/' }],
      ['read', { path: 'src/foo.js' }, { path: 'package.json' }],
    ];
    for (const [tool, inside, outside] of cases) {
      assert.doesNotThrow(
        () =>
          enforcer.onToolExecuteBefore(
            { tool, sessionID: 'test-session', callID: 'test-call' },
            { args: inside },
          ),
        `tool "${tool}" should be allowed inside scope`,
      );
      assert.throws(
        () =>
          enforcer.onToolExecuteBefore(
            { tool, sessionID: 'test-session', callID: 'test-call' },
            { args: outside },
          ),
        /SCOPE_VIOLATION/,
        `tool "${tool}" should be blocked outside scope`,
      );
    }
  });

  it('rejects read without a filePath while scope is active', async () => {
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:src/] work', status: 'in_progress' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    assert.throws(
      () =>
        enforcer.onToolExecuteBefore(
          { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
          { args: {} },
        ),
      /SCOPE_VIOLATION/,
    );
  });
});

describe('PlanEnforcer — Delegation Gate (completion)', () => {
  it('blocks Researcher completed without prior task(researcher)', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = todowriteCall([
      { content: 'Researcher: [scope:.] research topic', status: 'completed' },
    ]);
    await assert.rejects(async () => enforcer.onToolExecuteBefore(input, output), /DELEGATE_FIRST/);
  });

  it('allows Researcher completed after task(researcher) delegation', async () => {
    const enforcer = PlanEnforcer();
    const { input: taskIn, output: taskOut } = taskCall('researcher');
    await enforcer.onToolExecuteBefore(taskIn, taskOut);

    const { input, output } = todowriteCall([
      { content: 'Researcher: [scope:.] research topic', status: 'completed' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
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

describe('PlanEnforcer — todo.updated scope recomputation', () => {
  it('recomputes scope from an active shrinking list', async () => {
    const enforcer = PlanEnforcer();

    const { input: tdIn, output: tdOut } = todowriteCall([
      { content: 'Coder: [scope:src/] work', status: 'in_progress' },
      { content: 'Coder: [scope:src/,lib/] cleanup', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(tdIn, tdOut);

    // Scope covers src/ and lib/
    assert.doesNotThrow(() =>
      enforcer.onToolExecuteBefore(
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: 'lib/util.js' } },
      ),
    );

    // Full replacement now declares only lib/ with an active item
    await enforcer.onEvent({
      type: 'todo.updated',
      properties: {
        todos: [{ content: 'Coder: [scope:lib/] work', status: 'in_progress' }],
      },
    });

    assert.doesNotThrow(() =>
      enforcer.onToolExecuteBefore(
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: 'lib/util.js' } },
      ),
    );
    assert.throws(
      () =>
        enforcer.onToolExecuteBefore(
          { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
          { args: { filePath: 'src/foo.js' } },
        ),
      /SCOPE_VIOLATION/,
    );
  });
});

describe('PlanEnforcer — wrapped event shapes', () => {
  it('handles session.interrupt wrapped in event.event', async () => {
    const enforcer = PlanEnforcer();

    const { input: tdIn, output: tdOut } = todowriteCall([
      { content: 'Coder: [scope:src/] work', status: 'in_progress' },
    ]);
    await enforcer.onToolExecuteBefore(tdIn, tdOut);

    assert.throws(
      () =>
        enforcer.onToolExecuteBefore(
          { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
          { args: { filePath: 'package.json' } },
        ),
      /SCOPE_VIOLATION/,
    );

    await enforcer.onEvent({
      event: { type: 'session.interrupt', properties: {} },
    });

    assert.doesNotThrow(() =>
      enforcer.onToolExecuteBefore(
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: 'package.json' } },
      ),
    );
  });
});

describe('PlanEnforcer — deriveValidSubagentTypes vs frontmatter parser', () => {
  it('agrees with the test frontmatter parser on real agent files', () => {
    const { parseFrontmatter } = require('./helpers');
    const files = fs.readdirSync(getAgentsDir()).filter((f) => f.endsWith('.md'));
    const derived = deriveValidSubagentTypes(
      files.map((f) => ({
        name: path.basename(f, '.md'),
        content: fs.readFileSync(path.join(getAgentsDir(), f), 'utf8'),
      })),
    );

    for (const file of files) {
      const name = path.basename(file, '.md');
      const fm = parseFrontmatter(fs.readFileSync(path.join(getAgentsDir(), file), 'utf8'));
      const expectValid = fm.mode === 'subagent' && fm.disabled !== true;
      assert.strictEqual(
        derived.includes(name),
        expectValid,
        `${name} mismatch between deriveValidSubagentTypes and parseFrontmatter`,
      );
    }
  });
});
