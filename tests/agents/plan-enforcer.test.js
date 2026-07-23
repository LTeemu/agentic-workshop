const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const PLUGIN_PATH = path.resolve(__dirname, '..', '..', '.opencode', 'plugins', 'plan-enforcer');
const { PlanEnforcer } = require(PLUGIN_PATH);
const { todowriteCall, taskCall, toolCall } = require('./helpers');

describe('PlanEnforcer — Prefix Extraction (via delegation gating)', () => {
  let enforcer;

  beforeEach(() => {
    enforcer = PlanEnforcer();
  });

  it('rejects todowrite entries without a role prefix', async () => {
    const { input, output } = todowriteCall([{ content: 'do something', status: 'pending' }]);
    await assert.rejects(
      () => enforcer['tool.execute.before'](input, output),
      /ROLE_PREFIX_REQUIRED/,
    );
  });

  it('accepts todowrite entries with valid Coder prefix', async () => {
    const { input, output } = todowriteCall([
      { content: 'Coder: do something', status: 'pending' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](input, output));
  });

  it('accepts all valid prefixes: Researcher, Reviewer, Refactor, Coder', async () => {
    for (const prefix of ['Researcher', 'Reviewer', 'Refactor', 'Coder']) {
      const e = PlanEnforcer();
      const { input, output } = todowriteCall([
        { content: `${prefix}: test task`, status: 'pending' },
      ]);
      await assert.doesNotReject(
        () => e['tool.execute.before'](input, output),
        `Prefix "${prefix}:" should be accepted`,
      );
    }
  });
});

describe('PlanEnforcer — Delegation Gate (DELEGATE_FIRST)', () => {
  let enforcer;

  beforeEach(() => {
    enforcer = PlanEnforcer();
  });

  it('blocks Researcher in_progress without prior task(researcher)', async () => {
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
    ]);
    await enforcer['tool.execute.before'](setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
      { content: 'Researcher: research topic', status: 'in_progress' },
    ]);
    await assert.rejects(() => enforcer['tool.execute.before'](input, output), /DELEGATE_FIRST/);
  });

  it('blocks Reviewer in_progress without prior task(reviewer)', async () => {
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
    ]);
    await enforcer['tool.execute.before'](setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
      { content: 'Reviewer: review code', status: 'in_progress' },
    ]);
    await assert.rejects(() => enforcer['tool.execute.before'](input, output), /DELEGATE_FIRST/);
  });

  it('blocks Refactor in_progress without prior task(refactor)', async () => {
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
    ]);
    await enforcer['tool.execute.before'](setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
      { content: 'Refactor: clean up', status: 'in_progress' },
    ]);
    await assert.rejects(() => enforcer['tool.execute.before'](input, output), /DELEGATE_FIRST/);
  });

  it('allows Researcher in_progress after task(researcher) delegation', async () => {
    const { input: taskIn, output: taskOut } = taskCall('researcher');
    await enforcer['tool.execute.before'](taskIn, taskOut);

    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
    ]);
    await enforcer['tool.execute.before'](setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
      { content: 'Researcher: research topic', status: 'in_progress' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](input, output));
  });

  it('allows Reviewer in_progress after task(reviewer) delegation', async () => {
    const { input: taskIn, output: taskOut } = taskCall('reviewer');
    await enforcer['tool.execute.before'](taskIn, taskOut);

    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
    ]);
    await enforcer['tool.execute.before'](setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
      { content: 'Reviewer: review code', status: 'in_progress' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](input, output));
  });

  it('allows Refactor in_progress after task(refactor) delegation', async () => {
    const { input: taskIn, output: taskOut } = taskCall('refactor');
    await enforcer['tool.execute.before'](taskIn, taskOut);

    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
    ]);
    await enforcer['tool.execute.before'](setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
      { content: 'Refactor: clean up', status: 'in_progress' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](input, output));
  });

  it('does not block Coder items from being marked in_progress', async () => {
    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: first task (trivial)', status: 'pending' },
    ]);
    await enforcer['tool.execute.before'](setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: first task (trivial)', status: 'completed' },
      { content: 'Coder: second task', status: 'in_progress' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](input, output));
  });
});

describe('PlanEnforcer — Pipeline Gate (PIPELINE_REQUIRED)', () => {
  it('blocks non-trivial Coder completed without reviewer', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = todowriteCall([
      { content: 'Coder: implement feature', status: 'completed' },
    ]);
    await assert.rejects(() => enforcer['tool.execute.before'](input, output), /PIPELINE_REQUIRED/);
  });

  it('allows Coder completed with (trivial) suffix', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = todowriteCall([
      { content: 'Coder: fix typo (trivial)', status: 'completed' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](input, output));
  });

  it('allows non-trivial Coder completed after reviewer was called', async () => {
    const enforcer = PlanEnforcer();
    const { input: taskIn, output: taskOut } = taskCall('reviewer');
    await enforcer['tool.execute.before'](taskIn, taskOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: implement feature', status: 'completed' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](input, output));
  });

  it('does not block non-Coder items from completing without reviewer', async () => {
    const enforcer = PlanEnforcer();
    const { input: taskIn, output: taskOut } = taskCall('researcher');
    await enforcer['tool.execute.before'](taskIn, taskOut);

    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
      { content: 'Researcher: research', status: 'pending' },
    ]);
    await enforcer['tool.execute.before'](setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
      { content: 'Researcher: research', status: 'completed' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](input, output));
  });
});

describe('PlanEnforcer — Invalid subagent_type rejection', () => {
  it('rejects task() with invalid subagent_type', async () => {
    const enforcer = PlanEnforcer();
    const { input, output } = toolCall('task', { subagent_type: 'invalid-agent' });
    await assert.rejects(
      () => enforcer['tool.execute.before'](input, output),
      /INVALID_SUBAGENT_TYPE/,
    );
  });

  it('accepts valid subagent types: researcher, reviewer, refactor', async () => {
    for (const type of ['researcher', 'reviewer', 'refactor']) {
      const e = PlanEnforcer();
      const { input, output } = taskCall(type);
      await assert.doesNotReject(
        () => e['tool.execute.before'](input, output),
        `subagent_type "${type}" should be accepted`,
      );
    }
  });
});

describe('PlanEnforcer — Plan Reset on Chat Message', () => {
  it('resets plan when all todos are resolved and a new chat message arrives', async () => {
    const enforcer = PlanEnforcer();

    const { input: tdIn, output: tdOut } = todowriteCall([
      { content: 'Coder: done (trivial)', status: 'completed' },
    ]);
    await enforcer['tool.execute.before'](tdIn, tdOut);

    await enforcer['chat.message'](
      { sessionID: 'test-session' },
      { message: { role: 'user', content: 'hi' }, parts: [] },
    );

    await assert.rejects(
      () =>
        enforcer['tool.execute.before'](
          { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
          { args: { filePath: '/test' } },
        ),
      /PLAN_FIRST/,
    );
  });

  it('preserves plan when there are still active items on chat message', async () => {
    const enforcer = PlanEnforcer();

    const { input: tdIn, output: tdOut } = todowriteCall([
      { content: 'Coder: still working', status: 'in_progress' },
    ]);
    await enforcer['tool.execute.before'](tdIn, tdOut);

    await enforcer['chat.message'](
      { sessionID: 'test-session' },
      { message: { role: 'user', content: 'continue' }, parts: [] },
    );

    await assert.doesNotReject(() =>
      enforcer['tool.execute.before'](
        { tool: 'read', sessionID: 'test-session', callID: 'test-call' },
        { args: { filePath: '/test' } },
      ),
    );
  });
});
