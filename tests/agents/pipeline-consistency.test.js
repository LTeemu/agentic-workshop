const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { getWorkspace, getAgentNames, getSkillNames, readFile } = require('./helpers');

const RULES_DIR = path.join(getWorkspace(), '.opencode', 'rules');
const OPENCODE_CONFIG = path.join(getWorkspace(), 'opencode.json');
const AGENTS_MD = path.join(getWorkspace(), 'AGENTS.md');

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
    if (!config.plugin || config.plugin.length === 0) {
      console.log('  SKIP: no plugins configured');
      return;
    }
    for (const pluginPath of config.plugin) {
      const resolved = path.resolve(getWorkspace(), pluginPath);
      assert.ok(
        fs.existsSync(resolved),
        `FAIL: plugin "${pluginPath}" resolves to "${resolved}" which does not exist`,
      );
      console.log(`  PASS: plugin "${pluginPath}" exists`);
    }
  });
});

describe('AGENTS.md consistency', () => {
  let content;

  it('AGENTS.md exists at workspace root', () => {
    content = readFile(AGENTS_MD);
    assert.ok(content, 'AGENTS.md not found at workspace root');
  });

  it('references only subagent types that exist in .opencode/agents/', () => {
    const agentNames = getAgentNames();
    const mentions = content.match(/@(researcher|reviewer|refactor)\b/gi) || [];
    const uniqueMentions = [...new Set(mentions.map((m) => m.toLowerCase().replace('@', '')))];

    if (uniqueMentions.length === 0) {
      console.log('  SKIP: no agent references found in AGENTS.md');
      return;
    }

    for (const mention of uniqueMentions) {
      assert.ok(
        agentNames.includes(mention),
        `FAIL: AGENTS.md references "@${mention}" but no agent file found`,
      );
      console.log(`  PASS: AGENTS.md references @${mention} → agent exists`);
    }
  });
});

describe('pipeline.md consistency', () => {
  let content;

  it('pipeline.md exists', () => {
    const pipelinePath = path.join(RULES_DIR, 'pipeline.md');
    content = readFile(pipelinePath);
    assert.ok(content, 'pipeline.md not found in .opencode/rules/');
  });

  it('mentions agent types that exist', () => {
    const agentNames = getAgentNames();
    const mentions = content.match(/\*\*(researcher|reviewer|refactor)\*\*/gi) || [];
    const uniqueMentions = [...new Set(mentions.map((m) => m.replace(/\*\*/g, '').toLowerCase()))];

    if (uniqueMentions.length === 0) {
      console.log('  SKIP: no agent references found in pipeline.md');
      return;
    }

    for (const mention of uniqueMentions) {
      assert.ok(
        agentNames.includes(mention),
        `FAIL: pipeline.md references "${mention}" but no agent file found`,
      );
      console.log(`  PASS: pipeline.md references ${mention} → agent exists`);
    }
  });

  it('pipeline steps are documented in a clear order', () => {
    const stepHeadings = content.match(/^## \d+\./gm) || [];
    assert.ok(
      stepHeadings.length >= 3,
      `FAIL: pipeline.md should have at least 3 steps, found ${stepHeadings.length}`,
    );
    console.log(`  PASS: pipeline.md has ${stepHeadings.length} documented steps`);
  });
});

describe('Cross-file consistency', () => {
  it('all agent names referenced across files match actual files', () => {
    const agentNames = getAgentNames();
    const agentsMd = readFile(AGENTS_MD) || '';
    const pipelineMd = readFile(path.join(RULES_DIR, 'pipeline.md')) || '';
    const configRaw = readFile(OPENCODE_CONFIG);
    const config = configRaw ? JSON.parse(configRaw) : {};

    const refs = new Set();

    for (const m of agentsMd.matchAll(/@(researcher|reviewer|refactor)\b/gi)) {
      refs.add(m[1].toLowerCase());
    }

    if (config.command) {
      for (const cmd of Object.values(config.command)) {
        if (cmd.agent) refs.add(cmd.agent.toLowerCase());
      }
    }
    if (config.default_agent) refs.add(config.default_agent.toLowerCase());

    for (const m of pipelineMd.matchAll(/\*\*(researcher|reviewer|refactor)\*\*/gi)) {
      refs.add(m[1].toLowerCase());
    }

    const missing = [...refs].filter((r) => !agentNames.includes(r));
    if (missing.length > 0) {
      assert.fail(`FAIL: agents referenced but missing: ${missing.join(', ')}`);
    }
    console.log(`  PASS: all ${refs.size} agent references resolve to actual agent files`);
  });
});
