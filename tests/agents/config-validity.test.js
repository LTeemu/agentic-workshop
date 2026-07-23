const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  getAgentsDir,
  getSkillsDir,
  getAgentNames,
  getSkillNames,
  parseFrontmatter,
  validateAgentConfig,
  validateSkill,
} = require('./helpers');

// ── Agent Tests ─────────────────────────────────────

describe('Agent Configuration Validity', () => {
  const agentNames = getAgentNames();
  const agentsDir = getAgentsDir();

  it('discovers agent files in .opencode/agents/', () => {
    assert.ok(agentNames.length > 0, `No agent .md files found in ${agentsDir}`);
    console.log(`  Discovered ${agentNames.length} agents: ${agentNames.join(', ')}`);
  });

  for (const name of agentNames) {
    const file = `${name}.md`;
    it(`${name} has valid config`, () => {
      const filePath = path.join(agentsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const fm = parseFrontmatter(content);
      assert.ok(fm, `FAIL: ${file} — no YAML frontmatter found`);

      const issues = validateAgentConfig(fm);
      if (issues.length > 0) {
        assert.fail(`FAIL: ${file} — ${issues.join('; ')}`);
      }
      console.log(`  PASS: ${file} — description="${fm.description}", mode=${fm.mode}`);
    });
  }
});

// ── Skill Tests ─────────────────────────────────────

describe('Skill Configuration Validity', () => {
  const skillDirs = getSkillNames();
  const skillsDir = getSkillsDir();

  it('discovers skill directories in .opencode/skills/', () => {
    assert.ok(skillDirs.length > 0, `No skill directories found in ${skillsDir}`);
    console.log(`  Discovered ${skillDirs.length} skills: ${skillDirs.join(', ')}`);
  });

  for (const dir of skillDirs) {
    it(`${dir} skill has valid SKILL.md`, () => {
      const skillPath = path.join(skillsDir, dir);
      const issues = validateSkill(skillPath);
      if (issues.length > 0) {
        assert.fail(`FAIL: ${dir} — ${issues.join('; ')}`);
      }
      console.log(`  PASS: ${dir} — SKILL.md found and valid`);
    });
  }
});
