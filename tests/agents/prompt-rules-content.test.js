const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const { getWorkspace, getAgentNames, readFile } = require('./helpers');

const AGENTS_MD = path.join(getWorkspace(), 'AGENTS.md');
const CODER_MD = path.join(getWorkspace(), '.opencode', 'agents', 'coder.md');
const AGENTS_DIR = path.join(getWorkspace(), '.opencode', 'agents');

function load(filePath) {
  const content = readFile(filePath);
  assert.ok(content, `Required file not found: ${filePath}`);
  return content.replace(/\r\n/g, '\n');
}

// ── Cross-file references that must resolve ──────────

describe('Cross-file reference integrity', () => {
  const agentsMd = load(AGENTS_MD);
  const coderMd = load(CODER_MD);
  const agentNames = getAgentNames();

  it('all @agent references in AGENTS.md resolve to .md files', () => {
    const refs = [...agentsMd.matchAll(/@(researcher|reviewer|refactor)\b/gi)].map((m) =>
      m[1].toLowerCase(),
    );
    const unique = [...new Set(refs)];
    for (const name of unique) {
      assert.ok(agentNames.includes(name), `AGENTS.md references @${name} but no ${name}.md found`);
    }
  });

  it('all **agent** references in coder.md resolve to .md files', () => {
    const refs = [...coderMd.matchAll(/\*\*(researcher|reviewer|refactor)\*\*/gi)].map((m) =>
      m[1].toLowerCase(),
    );
    const unique = [...new Set(refs)];
    for (const name of unique) {
      assert.ok(agentNames.includes(name), `coder.md references "${name}" but no ${name}.md found`);
    }
  });

  it('files referenced by coder.md exist', () => {
    if (coderMd.includes('AGENTS.md')) {
      assert.ok(readFile(AGENTS_MD), 'coder.md references AGENTS.md but file is missing');
    }
  });
});

// ── Role prefix table (agent instructions depend on it) ──

describe('Role Prefix table', () => {
  const agentsMd = load(AGENTS_MD);

  it('contains Researcher:, Reviewer:, Refactor:, Coder:', () => {
    for (const prefix of ['Researcher:', 'Reviewer:', 'Refactor:', 'Coder:']) {
      assert.ok(
        agentsMd.includes(`| ${prefix}`) || agentsMd.includes(`| \`${prefix}\``),
        `Missing table row for ${prefix}`,
      );
    }
  });
});

// ── Pipeline step order ───────────────────────────────

describe('Pipeline step order in coder.md', () => {
  const coderMd = load(CODER_MD);

  it('has 4 pipeline steps in numerical order (0-3)', () => {
    const matches = [...coderMd.matchAll(/^### Step (\d+):/gm)];
    assert.ok(matches.length >= 4, `Expected 4+ steps, found ${matches.length}`);
    const expected = [0, 1, 2, 3];
    for (let i = 0; i < expected.length; i++) {
      assert.strictEqual(
        parseInt(matches[i][1], 10),
        expected[i],
        `Step ${expected[i]} expected at position ${i}, got ${matches[i][1]}`,
      );
    }
  });
});

// ── Agent tool lists vs plugin permissions ────────────

describe('Agent tool and permission consistency', () => {
  const PLUGIN_TOOLS = {
    reviewer: ['read', 'glob', 'grep', 'skill'],
    researcher: ['websearch', 'webfetch', 'read'],
  };

  for (const [agent, expectedTools] of Object.entries(PLUGIN_TOOLS)) {
    it(`${agent}.md lists tools that the plugin allows`, () => {
      const content = readFile(path.join(AGENTS_DIR, `${agent}.md`));
      assert.ok(content, `${agent}.md not found`);
      for (const tool of expectedTools) {
        assert.ok(
          content.includes(`\`${tool}\``),
          `${agent}.md should list \`${tool}\` (plugin allows it)`,
        );
      }
    });
  }

  it('read-only agents do not list write tools', () => {
    for (const agent of ['reviewer', 'researcher', 'explore']) {
      const content = readFile(path.join(AGENTS_DIR, `${agent}.md`));
      if (content) {
        assert.ok(!content.includes('`edit`'), `${agent}.md should not list \`edit\``);
        assert.ok(!content.includes('`write`'), `${agent}.md should not list \`write\``);
      }
    }
  });

  it('subagent permissions match their role', () => {
    const reviewer = readFile(path.join(AGENTS_DIR, 'reviewer.md'));
    const researcher = readFile(path.join(AGENTS_DIR, 'researcher.md'));
    const refactor = readFile(path.join(AGENTS_DIR, 'refactor.md'));
    const explore = readFile(path.join(AGENTS_DIR, 'explore.md'));
    const general = readFile(path.join(AGENTS_DIR, 'general.md'));

    if (reviewer) assert.ok(/edit:\s*deny/i.test(reviewer), 'reviewer should deny edit');
    if (reviewer) assert.ok(/bash:\s*deny/i.test(reviewer), 'reviewer should deny bash');
    if (researcher) assert.ok(/edit:\s*deny/i.test(researcher), 'researcher should deny edit');
    if (researcher) assert.ok(/bash:\s*deny/i.test(researcher), 'researcher should deny bash');
    if (refactor) assert.ok(/edit:\s*allow/i.test(refactor), 'refactor should allow edit');
    if (refactor) assert.ok(/bash:\s*deny/i.test(refactor), 'refactor should deny bash');
    if (explore) assert.ok(/edit:\s*deny/i.test(explore), 'explore should deny edit');
    if (explore) assert.ok(/bash:\s*deny/i.test(explore), 'explore should deny bash');
    if (general) assert.ok(/disabled:\s*true/i.test(general), 'general should be disabled');
    if (general) assert.ok(/edit:\s*deny/i.test(general), 'general should deny edit');
    if (general) assert.ok(/bash:\s*deny/i.test(general), 'general should deny bash');
  });
});
