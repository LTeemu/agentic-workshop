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

/** Resolve a local file reference to an absolute path, or null for a package name. */
function resolveLocalPath(ref) {
  const isLocal = ref.startsWith('.') || ref.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(ref);
  return isLocal ? path.resolve(getWorkspace(), ref) : null;
}

// ── opencode.json structural integrity ──────────────

describe('opencode.json consistency', () => {
  let config;

  it('opencode.json exists and is valid JSON', () => {
    const raw = readFile(OPENCODE_CONFIG);
    assert.ok(raw, 'opencode.json not found');
    config = JSON.parse(raw);
    assert.ok(config, 'opencode.json is not valid JSON');
  });

  it('all @agent references in command templates resolve to agent files', () => {
    assert.ok(config, 'config not loaded');
    const agentNames = getAgentNames();
    const refs = [];
    for (const [cmdName, cmd] of Object.entries(config.commands ?? {})) {
      for (const match of (cmd.template ?? '').matchAll(/@([a-zA-Z0-9_-]+)/g)) {
        refs.push({ cmd: cmdName, agent: match[1] });
      }
    }

    if (refs.length === 0) {
      console.log('  SKIP: no @agent references in command templates');
      return;
    }

    for (const { cmd, agent } of refs) {
      assert.ok(
        agentNames.includes(agent),
        `FAIL: command "${cmd}" references agent "@${agent}" but ${agent}.md not found`,
      );
      console.log(`  PASS: command "${cmd}" → @${agent} exists`);
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
    const skillPaths = Array.isArray(config.skills) ? config.skills : [];
    if (skillPaths.length === 0) {
      console.log('  SKIP: no skills configured');
      return;
    }

    const skillNames = getSkillNames();
    for (const skillPath of skillPaths) {
      const resolved = path.resolve(getWorkspace(), skillPath);
      assert.ok(
        fs.existsSync(resolved),
        `FAIL: skill path "${skillPath}" resolves to "${resolved}" which does not exist`,
      );
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
  });

  it('plugin paths reference existing files', () => {
    assert.ok(config, 'config not loaded');
    const plugins = Array.isArray(config.plugins) ? config.plugins : [];
    if (plugins.length === 0) {
      console.log('  SKIP: no plugins configured');
      return;
    }

    for (const plugin of plugins) {
      const ref = typeof plugin === 'string' ? plugin : (plugin.package ?? plugin.path);
      const local = resolveLocalPath(ref);
      if (local) {
        assert.ok(
          fs.existsSync(local),
          `FAIL: plugin "${ref}" resolves to "${local}" which does not exist`,
        );
        console.log(`  PASS: plugin "${ref}" exists`);
      } else {
        console.log(`  PASS: plugin "${ref}" is a package reference (not checked locally)`);
      }
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
