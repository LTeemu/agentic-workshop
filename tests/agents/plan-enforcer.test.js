const { describe, it, beforeEach } = require('node:test');
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
const { PlanEnforcer } = require(PLUGIN_PATH);
const { todowriteCall, taskCall, toolCall, subagentCall } = require('./helpers');

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
  let enforcer;

  beforeEach(() => {
    enforcer = PlanEnforcer();
  });

  it('blocks Researcher in_progress without prior task(researcher)', async () => {
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
      { content: 'Researcher: [scope:.] research topic', status: 'in_progress' },
    ]);
    await assert.rejects(async () => enforcer.onToolExecuteBefore(input, output), /DELEGATE_FIRST/);
  });

  it('blocks Reviewer in_progress without prior task(reviewer)', async () => {
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
      { content: 'Reviewer: [scope:.] review code', status: 'in_progress' },
    ]);
    await assert.rejects(async () => enforcer.onToolExecuteBefore(input, output), /DELEGATE_FIRST/);
  });

  it('blocks Refactor in_progress without prior task(refactor)', async () => {
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
      { content: 'Refactor: [scope:.] clean up', status: 'in_progress' },
    ]);
    await assert.rejects(async () => enforcer.onToolExecuteBefore(input, output), /DELEGATE_FIRST/);
  });

  it('allows Researcher in_progress after task(researcher) delegation', async () => {
    const { input: taskIn, output: taskOut } = taskCall('researcher');
    await enforcer.onToolExecuteBefore(taskIn, taskOut);

    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
      { content: 'Researcher: [scope:.] research topic', status: 'in_progress' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('allows Reviewer in_progress after task(reviewer) delegation', async () => {
    const { input: taskIn, output: taskOut } = taskCall('reviewer');
    await enforcer.onToolExecuteBefore(taskIn, taskOut);

    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
      { content: 'Reviewer: [scope:.] review code', status: 'in_progress' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('allows Refactor in_progress after task(refactor) delegation', async () => {
    const { input: taskIn, output: taskOut } = taskCall('refactor');
    await enforcer.onToolExecuteBefore(taskIn, taskOut);

    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
    ]);
    await enforcer.onToolExecuteBefore(setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: [scope:.] setup', status: 'pending' },
      { content: 'Refactor: [scope:.] clean up', status: 'in_progress' },
    ]);
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('does not block Coder items from being marked in_progress', async () => {
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

  it('rejects "general" (disabled via general.md)', async () => {
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
  it('allows subagent({agent: "explore"}) before plan is confirmed', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = subagentCall('explore');
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('allows subagent({agent: "researcher"}) before plan is confirmed', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = subagentCall('researcher');
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('allows subagent({agent: "reviewer"}) before plan is confirmed', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = subagentCall('reviewer');
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

  it('allows subagent({agent: "refactor"}) before plan is confirmed', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = subagentCall('refactor');
    await assert.doesNotReject(async () => enforcer.onToolExecuteBefore(input, output));
  });

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
