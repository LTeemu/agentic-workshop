const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  getWorkspace,
  getAgentsDir,
  getSkillsDir,
  getAgentNames,
  getSkillNames,
  parseFrontmatter,
  validateAgentConfig,
  validateSkill,
  readFile,
} = require('./helpers');

const OPENCODE_CONFIG_CANDIDATES = [
  path.join(getWorkspace(), 'opencode.jsonc'),
  path.join(getWorkspace(), 'opencode.json'),
];
const OPENCODE_CONFIG = OPENCODE_CONFIG_CANDIDATES.find((f) => fs.existsSync(f));

// ── opencode.json structural integrity ──────────────

describe('opencode.json consistency', () => {
  let config;

  it('opencode.json exists and is valid JSON', () => {
    const raw = readFile(OPENCODE_CONFIG);
    assert.ok(raw, 'opencode.json not found');
    config = JSON.parse(raw);
    assert.ok(config, 'opencode.json is not valid JSON');
  });

  it('all command agents have corresponding agent files', () => {
    assert.ok(config, 'config not loaded');
    const agentNames = getAgentNames();
    const cmdAgents = [];

    if (config.command) {
      for (const [cmdName, cmd] of Object.entries(config.command)) {
        if (cmd.agent) {
          cmdAgents.push({ cmd: cmdName, agent: cmd.agent });
        }
      }
    }

    if (cmdAgents.length === 0) {
      console.log('  SKIP: no command agents configured');
      return;
    }

    for (const { cmd, agent } of cmdAgents) {
      const expectedFile = `${agent}.md`;
      assert.ok(
        agentNames.includes(agent),
        `FAIL: command "${cmd}" references agent "${agent}" but ${expectedFile} not found`,
      );
      console.log(`  PASS: command "${cmd}" → agent "${agent}" exists`);
    }
  });

  it('default_agent has a corresponding agent file', () => {
    assert.ok(config, 'config not loaded');
    if (!config.default_agent) {
      console.log('  SKIP: no default_agent configured');
      return;
    }
    const agentNames = getAgentNames();
    assert.ok(
      agentNames.includes(config.default_agent),
      `FAIL: default_agent "${config.default_agent}" has no matching file`,
    );
    console.log(`  PASS: default_agent="${config.default_agent}" exists`);
  });

  it('skill paths reference existing directories', () => {
    assert.ok(config, 'config not loaded');
    if (!config.skills || !config.skills.paths) {
      console.log('  SKIP: no skills.paths configured');
      return;
    }
    const skillNames = getSkillNames();
    for (const skillPath of config.skills.paths) {
      const resolved = path.resolve(getWorkspace(), skillPath);
      assert.ok(
        fs.existsSync(resolved),
        `FAIL: skill path "${skillPath}" resolves to "${resolved}" which does not exist`,
      );
      if (fs.statSync(resolved).isDirectory()) {
        const dirs = fs
          .readdirSync(resolved)
          .filter((f) => fs.statSync(path.join(resolved, f)).isDirectory());
        for (const dir of dirs) {
          assert.ok(
            skillNames.includes(dir),
            `FAIL: skill directory "${dir}" in ${skillPath} has no matching entry`,
          );
        }
        console.log(`  PASS: skill path "${skillPath}" exists with ${dirs.length} skills`);
      }
    }
  });

  it('plugin paths reference existing files', () => {
    assert.ok(config, 'config not loaded');
    const pluginPaths = config.plugin || config.plugins || [];
    if (pluginPaths.length === 0) {
      console.log('  SKIP: no plugins configured');
      return;
    }
    for (const pluginPath of pluginPaths) {
      const resolved = path.resolve(getWorkspace(), pluginPath);
      assert.ok(
        fs.existsSync(resolved),
        `FAIL: plugin "${pluginPath}" resolves to "${resolved}" which does not exist`,
      );
      console.log(`  PASS: plugin "${pluginPath}" exists`);
    }
  });
});

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
