---
name: cli
description: 'CLI tool development — argument parsing, flags/options, exit codes, colored output, interactive prompts, config file loading, progress bars, subcommands, help text generation.'
risk: safe
source: community patterns
date_added: 2026-06-14
tags: [cli, terminal, command-line, args, prompts, tooling]
tools: [opencode, claude, cursor, gemini]
---

# CLI

You are a **CLI specialist**. You build command-line tools that are predictable, well-documented, composable, and follow established conventions.

## Argument Parsing (Zero Dependencies)

```javascript
#!/usr/bin/env node

function parseArgs(raw) {
  const args = raw.slice(2);
  const result = { _: [], flags: {} };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // --flag=value
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, ...rest] = arg.slice(2).split('=');
      result.flags[key] = rest.join('=');
      continue;
    }

    // --flag value
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        result.flags[key] = next;
        i++;
      } else {
        result.flags[key] = true;
      }
      continue;
    }

    // -f value
    if (arg.startsWith('-') && !arg.startsWith('--')) {
      const key = arg.slice(1);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        result.flags[key] = next;
        i++;
      } else {
        result.flags[key] = true;
      }
      continue;
    }

    // Positional
    result._.push(arg);
  }

  return result;
}

// Usage: node script.js build --env=production --verbose src/
// { _: ['build', 'src/'], flags: { env: 'production', verbose: true } }
```

### With validation and defaults

```javascript
function defineArgs(schema) {
  return {
    parse(raw) {
      const parsed = parseArgs(raw);
      const result = { ...parsed, flags: { ...parsed.flags } };

      for (const [key, def] of Object.entries(schema.flags || {})) {
        if (result.flags[key] === undefined) {
          result.flags[key] = def.default;
        }
        if (def.validate && !def.validate(result.flags[key])) {
          throw new Error(`Invalid value for --${key}: ${result.flags[key]}`);
        }
      }

      for (const [i, def] of Object.entries(schema.positional || {})) {
        if (!result._[i] && def.required) {
          throw new Error(`Missing required positional argument: ${def.name}`);
        }
        if (def.validate && result._[i] && !def.validate(result._[i])) {
          throw new Error(`Invalid value for ${def.name}: ${result._[i]}`);
        }
      }

      return result;
    },
  };
}

// Usage
const args = defineArgs({
  flags: {
    port: { default: 4000, validate: (v) => !isNaN(v) && v > 0 },
    verbose: { default: false },
    config: { default: './config.json' },
  },
  positional: {
    0: { name: 'command', required: true },
    1: { name: 'input', required: false },
  },
}).parse(process.argv);
```

## Exit Codes

```javascript
const EXIT = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  MISUSE: 2, // Invalid input / args
  NOT_FOUND: 3, // File or resource not found
  PERMISSION: 4, // Permission denied
  TIMEOUT: 5, // Operation timed out
  SIGNAL: 130, // SIGINT (Ctrl+C)
};

function exit(code, message) {
  if (message) {
    const output = code === 0 ? process.stdout : process.stderr;
    output.write(message + '\n');
  }
  process.exit(code);
}
```

## Colored Output

```javascript
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function color(text, code) {
  return `${code}${text}${ANSI.reset}`;
}

const logger = {
  info: (msg) => console.log(color(msg, ANSI.blue)),
  success: (msg) => console.log(color(msg, ANSI.green)),
  warn: (msg) => console.log(color(msg, ANSI.yellow)),
  error: (msg) => console.error(color(msg, ANSI.red)),
  dim: (msg) => console.log(color(msg, ANSI.gray)),
  bold: (msg) => console.log(color(msg, ANSI.bold)),
  label: (label, msg) => console.log(`${color(label + ':', ANSI.cyan)} ${msg}`),
};

// Disable colors for non-TTY output
const noColor = !process.stdout.isTTY || process.env.NO_COLOR;
function safeColor(text, code) {
  return noColor ? text : `${code}${text}${ANSI.reset}`;
}
```

## Interactive Prompts

```javascript
const readline = require('readline');

function question(query, defaultValue = '') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const prompt = defaultValue ? `${query} (${defaultValue}): ` : `${query}: `;
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function confirm(query, defaultValue = false) {
  const hint = defaultValue ? 'Y/n' : 'y/N';
  const answer = await question(`${query} ${hint}`, '');
  if (!answer) return defaultValue;
  return answer.toLowerCase().startsWith('y');
}

async function select(query, options) {
  console.log(`${query}:`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt}`);
  });
  const answer = await question(`Enter number (1-${options.length})`);
  const idx = parseInt(answer) - 1;
  if (isNaN(idx) || idx < 0 || idx >= options.length) {
    console.log('Invalid selection');
    return select(query, options);
  }
  return options[idx];
}
```

## Progress Bars

```javascript
function createProgressBar(total, options = {}) {
  const width = options.width || 30;
  const prefix = options.prefix || 'Progress';
  let current = 0;

  return {
    tick(n = 1) {
      current = Math.min(current + n, total);
      this.render();
    },
    render() {
      const pct = current / total;
      const filled = Math.round(width * pct);
      const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
      process.stdout.write(`\r${prefix}: [${bar}] ${Math.round(pct * 100)}% (${current}/${total})`);
      if (current >= total) process.stdout.write('\n');
    },
    set(value) {
      current = Math.min(value, total);
      this.render();
    },
  };
}

// Usage
const bar = createProgressBar(100);
const timer = setInterval(() => {
  bar.tick(5);
  if (bar.current >= 100) clearInterval(timer);
}, 200);
```

## Config File Loading

```javascript
const fs = require('fs');
const path = require('path');

function loadConfig(name, options = {}) {
  const searchPaths = options.paths || [
    `.${name}rc`,
    `.${name}rc.json`,
    `.${name}rc.js`,
    `${name}.config.js`,
    process.env[`${name.toUpperCase()}_CONFIG`],
    path.join(os.homedir(), `.${name}rc`),
  ];

  for (const filepath of searchPaths) {
    if (!filepath) continue;
    const resolved = path.resolve(filepath);
    if (!fs.existsSync(resolved)) continue;

    try {
      const ext = path.extname(resolved);
      if (ext === '.js') return require(resolved);
      return JSON.parse(fs.readFileSync(resolved, 'utf-8'));
    } catch (err) {
      console.warn(`Warning: Could not load config ${resolved}: ${err.message}`);
    }
  }

  return options.defaults || {};
}

// Merge: CLI flags > config file > defaults
function resolveConfig(name, cliFlags, defaults = {}) {
  const fileConfig = loadConfig(name, { defaults });
  return { ...defaults, ...fileConfig, ...cliFlags };
}
```

## Subcommands

```javascript
// CLI with subcommands — like git, npm, docker
const commands = new Map();

function register(name, handler, help) {
  commands.set(name, { handler, help });
}

async function run() {
  const args = parseArgs(process.argv);
  const commandName = args._[0];

  if (!commandName || commandName === 'help') {
    return showHelp();
  }

  const cmd = commands.get(commandName);
  if (!cmd) {
    console.error(`Unknown command: ${commandName}`);
    console.log('Run with "help" to see available commands');
    process.exit(1);
  }

  try {
    await cmd.handler(args._.slice(1), args.flags);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

function showHelp() {
  console.log('Usage: mytool <command> [options]\n');
  console.log('Commands:');
  for (const [name, cmd] of commands) {
    const desc = cmd.help?.description || '';
    console.log(`  ${name.padEnd(15)} ${desc}`);
  }
}

// Define commands
register(
  'build',
  async (args, flags) => {
    // Build logic
  },
  { description: 'Build the project' },
);

register(
  'serve',
  async (args, flags) => {
    const port = flags.port || 4000;
    // Serve logic
  },
  { description: 'Start development server' },
);

run();
```

## CLI Conventions

| Convention         | Standard                     | Example                |
| ------------------ | ---------------------------- | ---------------------- |
| Exit codes         | 0 = success, 1 = error       | `process.exit(1)`      |
| `--help`           | Show usage and exit          | `mytool --help`        |
| `--version`        | Show version and exit        | `mytool --version`     |
| `--verbose` / `-v` | Increase log level           | `mytool build -vvv`    |
| `--quiet` / `-q`   | Suppress output              | `mytool build --quiet` |
| `NO_COLOR`         | Disable ANSI colors          | `NO_COLOR=1 mytool`    |
| Stderr for errors  | Never write errors to stdout | `console.error()`      |
| Machine-readable   | JSON output with `--json`    | `mytool status --json` |

## Anti-patterns

- ❌ Writing errors to stdout — breaks pipe/filter chains
- ❌ Side effects during parsing — validate all args before acting
- ❌ Hardcoded colors — respect `NO_COLOR` and `!isTTY`
- ❌ Blocking prompts in piped mode — check `isTTY` before prompting
- ❌ Silent failures — always write error messages to stderr
- ❌ Inconsistent exit codes — 0 is always success, 1+ for errors
- ❌ No `--help` — every CLI tool needs help output

## Checklist

- [ ] Args parsed consistently (positional + named flags)
- [ ] `--help` and `--version` implemented
- [ ] Exit codes follow conventions (0 success, 1 error, 2 misuse)
- [ ] Errors written to stderr, data to stdout
- [ ] Colors respect `NO_COLOR` env and `isTTY`
- [ ] Config loading merges CLI > file > defaults
- [ ] Subcommands have their own help text
- [ ] Prompts only shown in interactive mode (`isTTY`)
- [ ] JSON output supported for machine parsing
- [ ] Validation errors are descriptive and actionable
