const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  getAgentsDir,
  splitKeyValue,
  parseFrontmatter,
  validateAgentConfig,
  validateSkill,
  readFile,
} = require('./helpers');

describe('splitKeyValue', () => {
  it('splits key: value pairs', () => {
    assert.deepStrictEqual(splitKeyValue('mode: subagent'), { key: 'mode', value: 'subagent' });
  });

  it('types booleans and numbers', () => {
    assert.strictEqual(splitKeyValue('disabled: true').value, true);
    assert.strictEqual(splitKeyValue('count: 3').value, 3);
  });

  it('strips matching quotes', () => {
    assert.strictEqual(splitKeyValue("resource: '*'").value, '*');
    assert.strictEqual(splitKeyValue('name: "x"').value, 'x');
  });

  it('returns empty value for bare keys', () => {
    assert.deepStrictEqual(splitKeyValue('permissions'), { key: 'permissions', value: '' });
  });
});

describe('parseFrontmatter', () => {
  it('returns null without frontmatter', () => {
    assert.strictEqual(parseFrontmatter('# no frontmatter'), null);
  });

  it('parses flat keys', () => {
    const fm = parseFrontmatter('---\ndescription: test\ndisabled: true\n---\n\nbody');
    assert.deepStrictEqual(fm, { description: 'test', disabled: true });
  });

  it('parses permissions as a list of objects', () => {
    const content = [
      '---',
      'mode: subagent',
      'permissions:',
      '  - action: edit',
      "    resource: '*'",
      '    effect: deny',
      '  - action: shell',
      "    resource: '*'",
      '    effect: deny',
      '---',
      '',
      'body',
    ].join('\n');
    const fm = parseFrontmatter(content);
    assert.deepStrictEqual(fm.permissions, [
      { action: 'edit', resource: '*', effect: 'deny' },
      { action: 'shell', resource: '*', effect: 'deny' },
    ]);
  });

  it('parses keys that follow a list', () => {
    const content = [
      '---',
      'permissions:',
      '  - action: edit',
      '    effect: deny',
      'mode: subagent',
      '---',
      '',
    ].join('\n');
    const fm = parseFrontmatter(content);
    assert.strictEqual(fm.mode, 'subagent');
    assert.deepStrictEqual(fm.permissions, [{ action: 'edit', effect: 'deny' }]);
  });

  it('ignores orphan list items without a parent key', () => {
    const fm = parseFrontmatter('---\n- orphan: value\nmode: subagent\n---\n');
    assert.deepStrictEqual(fm, { mode: 'subagent' });
  });

  it('handles CRLF line endings', () => {
    const fm = parseFrontmatter('---\r\ndescription: crlf\r\n---\r\n\r\nbody');
    assert.deepStrictEqual(fm, { description: 'crlf' });
  });

  it('parses every real agent file', () => {
    for (const file of fs.readdirSync(getAgentsDir()).filter((f) => f.endsWith('.md'))) {
      const fm = parseFrontmatter(readFile(path.join(getAgentsDir(), file)));
      assert.ok(fm, `${file} should have parseable frontmatter`);
      assert.ok(fm.description, `${file} missing description`);
      assert.ok(fm.mode, `${file} missing mode`);
    }
  });
});

describe('validateAgentConfig', () => {
  it('rejects missing description', () => {
    const issues = validateAgentConfig({ mode: 'primary' });
    assert.ok(issues.some((i) => i.includes('description')));
  });

  it('rejects invalid mode', () => {
    const issues = validateAgentConfig({ description: 'x', mode: 'boss' });
    assert.ok(issues.some((i) => i.includes('mode')));
  });

  it('rejects subagent without permissions', () => {
    const issues = validateAgentConfig({ description: 'x', mode: 'subagent' });
    assert.ok(issues.some((i) => i.includes('permission')));
  });

  it('rejects permission entries missing action or effect', () => {
    const issues = validateAgentConfig({
      description: 'x',
      mode: 'subagent',
      permissions: [{ resource: '*', effect: 'deny' }],
    });
    assert.ok(issues.some((i) => i.includes('action')));
  });

  it('accepts a valid subagent config', () => {
    const issues = validateAgentConfig({
      description: 'x',
      mode: 'subagent',
      permissions: [{ action: 'edit', resource: '*', effect: 'deny' }],
    });
    assert.deepStrictEqual(issues, []);
  });

  it('accepts a valid primary config without permissions', () => {
    const issues = validateAgentConfig({ description: 'x', mode: 'primary' });
    assert.deepStrictEqual(issues, []);
  });
});

describe('validateSkill', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Create a SKILL.md in the temp dir and return the dir path. */
  function skill(content) {
    fs.writeFileSync(path.join(tmpDir, 'SKILL.md'), content);
    return tmpDir;
  }

  it('flags a missing SKILL.md', () => {
    const issues = validateSkill(tmpDir);
    assert.ok(issues.some((i) => i.includes('missing SKILL.md')));
  });

  it('flags an empty SKILL.md', () => {
    const issues = validateSkill(skill(''));
    assert.ok(issues.some((i) => i.includes('SKILL.md is empty')));
  });

  it('flags content that does not start with a heading', () => {
    const issues = validateSkill(skill('para one\npara two\npara three\n'));
    assert.ok(issues.some((i) => i.includes('heading')));
  });

  it('flags a too-minimal SKILL.md', () => {
    const issues = validateSkill(skill('# Title\n'));
    assert.ok(issues.some((i) => i.includes('too minimal')));
  });

  it('accepts a well-formed SKILL.md', () => {
    const issues = validateSkill(
      skill('---\nname: x\ndescription: y\n---\n\n# Title\n\nSome content.\n\nMore content.\n'),
    );
    assert.deepStrictEqual(issues, []);
  });
});
