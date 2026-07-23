const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const PLUGIN_PATH = path.resolve(__dirname, '..', '..', '.opencode', 'plugins', 'plan-enforcer');
const { PlanEnforcer } = require(PLUGIN_PATH);
const { todowriteCall, taskCall } = require('./helpers');

// ── Simulated agent functions ────────────────────────

function simulateCoder(task, { codeLength = 5 } = {}) {
  const lines = [];
  lines.push(`// Task: ${task}`);
  lines.push(`// Generated: ${new Date().toISOString()}`);
  for (let i = 0; i < codeLength; i++) {
    lines.push(`const step${i} = () => console.log('Step ${i} of ${task}');`);
  }
  return {
    status: 'PASS',
    output: lines.join('\n'),
    explanation: `Generated ${codeLength} code steps for "${task}"`,
  };
}

function simulateResearcher(topic) {
  const findings = [
    `Found relevant information about "${topic}"`,
    'Synthesized key insights from multiple sources',
    'Prepared structured report for coder',
  ];
  return {
    status: 'PASS',
    findings,
    explanation: `Researched "${topic}" — ${findings.length} findings produced`,
  };
}

function simulateReviewer(code) {
  const issues = [];
  const lines = code.split('\n');
  let lineNum = 0;
  for (const line of lines) {
    lineNum++;
    if (line.includes('TODO') || line.includes('FIXME')) {
      issues.push({ severity: 'low', msg: `Line ${lineNum}: contains TODO/FIXME marker` });
    }
    if (line.length > 120) {
      issues.push({ severity: 'medium', msg: `Line ${lineNum}: exceeds 120 characters` });
    }
  }
  return {
    status: issues.length === 0 ? 'PASS' : 'WARN',
    issues,
    explanation:
      issues.length === 0
        ? 'No issues found'
        : `Found ${issues.length} issue(s): ${issues.map((i) => i.msg).join('; ')}`,
  };
}

function simulateRefactor(code, issues) {
  if (issues.length === 0) {
    return { status: 'PASS', output: code, explanation: 'No refactoring needed' };
  }
  return {
    status: 'PASS',
    output: code,
    explanation: `Addressed ${issues.length} issue(s) from reviewer`,
  };
}

// ── Tests ────────────────────────────────────────────

describe('Agentic Workflow — Full Pipeline Simulation', () => {
  it('completes a full pipeline: plan → research → code → review → refactor → complete', async () => {
    const enforcer = PlanEnforcer();

    const { input: resIn, output: resOut } = taskCall('researcher');
    const { input: revIn, output: revOut } = taskCall('reviewer');
    const { input: refIn, output: refOut } = taskCall('refactor');
    await enforcer['tool.execute.before'](resIn, resOut);
    await enforcer['tool.execute.before'](revIn, revOut);
    await enforcer['tool.execute.before'](refIn, refOut);

    const planItems = [
      { content: 'Researcher: research CSV parsing options in Node.js', status: 'pending' },
      { content: 'Coder: implement parseCSV function', status: 'pending' },
      { content: 'Reviewer: review parseCSV for edge cases', status: 'pending' },
      { content: 'Refactor: clean up duplication in parser', status: 'pending' },
    ];
    const { input: planIn, output: planOut } = todowriteCall(planItems);
    await enforcer['tool.execute.before'](planIn, planOut);

    const researchResult = simulateResearcher('CSV parsing options in Node.js');
    assert.strictEqual(researchResult.status, 'PASS');
    assert.ok(researchResult.findings.length > 0);
    console.log(`  RESEARCH: ${researchResult.explanation}`);

    const { input: researchDoneIn, output: researchDoneOut } = todowriteCall([
      { content: 'Researcher: research CSV parsing options in Node.js', status: 'completed' },
      { content: 'Coder: implement parseCSV function', status: 'in_progress' },
      { content: 'Reviewer: review parseCSV for edge cases', status: 'pending' },
      { content: 'Refactor: clean up duplication in parser', status: 'pending' },
    ]);
    await assert.doesNotReject(() =>
      enforcer['tool.execute.before'](researchDoneIn, researchDoneOut),
    );

    const codeResult = simulateCoder('implement parseCSV function');
    assert.strictEqual(codeResult.status, 'PASS');
    assert.ok(codeResult.output.length > 0);
    console.log(`  CODE: ${codeResult.explanation}`);

    const reviewResult = simulateReviewer(codeResult.output);
    console.log(`  REVIEW: ${reviewResult.explanation}`);

    const { input: reviewDoneIn, output: reviewDoneOut } = todowriteCall([
      { content: 'Researcher: research CSV parsing options in Node.js', status: 'completed' },
      { content: 'Coder: implement parseCSV function', status: 'completed' },
      { content: 'Reviewer: review parseCSV for edge cases', status: 'completed' },
      { content: 'Refactor: clean up duplication in parser', status: 'in_progress' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](reviewDoneIn, reviewDoneOut));

    const refactorResult = simulateRefactor(codeResult.output, reviewResult.issues);
    console.log(`  REFACTOR: ${refactorResult.explanation}`);

    const { input: allDoneIn, output: allDoneOut } = todowriteCall([
      { content: 'Researcher: research CSV parsing options in Node.js', status: 'completed' },
      { content: 'Coder: implement parseCSV function', status: 'completed' },
      { content: 'Reviewer: review parseCSV for edge cases', status: 'completed' },
      { content: 'Refactor: clean up duplication in parser', status: 'completed' },
    ]);
    await assert.doesNotReject(() => enforcer['tool.execute.before'](allDoneIn, allDoneOut));

    console.log(`\n  ✓ Full pipeline simulation PASSED`);
    console.log(`    Research: ${researchResult.status}`);
    console.log(`    Code:     ${codeResult.status}`);
    console.log(`    Review:   ${reviewResult.status} (${reviewResult.issues.length} issues)`);
    console.log(`    Refactor: ${refactorResult.status}`);
  });

  it('detects and reports when pipeline is bypassed (Coder completed without review)', async () => {
    const enforcer = PlanEnforcer();

    const { input, output } = todowriteCall([
      { content: 'Coder: skip review', status: 'completed' },
    ]);

    await assert.rejects(() => enforcer['tool.execute.before'](input, output), /PIPELINE_REQUIRED/);
    console.log('  PASS: pipeline enforcement caught bypass attempt');
  });

  it('reports clear error when researcher is not delegated before marking in_progress', async () => {
    const enforcer = PlanEnforcer();

    const { input: setupIn, output: setupOut } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
    ]);
    await enforcer['tool.execute.before'](setupIn, setupOut);

    const { input, output } = todowriteCall([
      { content: 'Coder: setup', status: 'pending' },
      { content: 'Researcher: do research', status: 'in_progress' },
    ]);

    await assert.rejects(
      () => enforcer['tool.execute.before'](input, output),
      (err) => {
        assert.ok(err.message.includes('DELEGATE_FIRST'), 'Error should mention DELEGATE_FIRST');
        assert.ok(
          err.message.includes('researcher'),
          'Error should mention the missing subagent type',
        );
        return true;
      },
    );
    console.log('  PASS: clear error reported for missing delegation');
  });

  it('allows trivial changes to skip pipeline (trivial suffix)', async () => {
    const enforcer = PlanEnforcer();

    const { input, output } = todowriteCall([
      { content: 'Coder: fix typo in comment (trivial)', status: 'completed' },
    ]);

    await assert.doesNotReject(() => enforcer['tool.execute.before'](input, output));
    console.log('  PASS: trivial change bypass accepted');
  });
});

describe('Agentic Workflow — Inter-agent Handoff Simulation', () => {
  it('simulates researcher → coder handoff with research data', () => {
    const research = simulateResearcher('error handling patterns in Express');
    assert.strictEqual(research.status, 'PASS');

    const code = simulateCoder('implement error handler middleware', { codeLength: 8 });
    assert.strictEqual(code.status, 'PASS');

    const review = simulateReviewer(code.output);

    console.log(`  HANDOFF: Research → Code → Review`);
    console.log(`    Research findings: ${research.findings.length}`);
    console.log(`    Code lines: ${code.output.split('\n').length}`);
    console.log(`    Review issues: ${review.issues.length}`);
    if (review.issues.length > 0) {
      console.log(
        `    Issues found: ${review.issues.map((i) => `[${i.severity}] ${i.msg}`).join(', ')}`,
      );
    }
  });
});
