# agentic-workshop

A local development sandbox for building and running small agentic coding projects with a shared AI agent configuration.

> Mostly AI-generated, reviewed code.

## Features

- **Shared AI Agent Workspace**: Pre-configured [OpenCode V2](https://opencode.ai) setup with custom agents (`coder`, `explore`, `researcher`, `reviewer`, and `refactor`), reusable skills, workspace commands, a post-code verification pipeline, and the `plan-enforcer` plugin.
- **Interactive Dashboard**: Live project management interface for starting, previewing, testing, and inspecting sandbox projects.
- **Real-Time Agent Workflow**: The same agentic workflow applies to every project without requiring separate per-project agent configuration.
- **Embedded Terminal**: In-browser shell with PowerShell support on Windows, `$SHELL` support on Unix, terminal output replay, and `opencode2` integration.
- **Cross-Project Test Runner**: One-click project and global test execution with aggregated results.
- **Project Management**: Automatic project detection, dependency installation, project builds, and backups when projects are deleted.

## Interactive Dashboard

A live control panel for spinning up, previewing, and testing any project in the sandbox.

**Sidebar** — Lists all projects with type badges (`npm`, `static`, `Python`, etc.), running indicators, and active-project state. Click a project to start and preview it; click it again to stop it. The sidebar can be collapsed into compact mode, and its state is persisted. The per-project details panel shows the description, npm scripts with copy controls, dependencies, and development dependencies.

**Live preview** — Displays the running project in a sandboxed iframe. The preview automatically reloads when files change and shows startup progress and error states in a central overlay. An **Open in Tab** action is available for external browsing.

**Log panel** — A collapsible and resizable panel with real-time log streaming over SSE. Output is color-coded by type (`stdout`, `stderr`, and `system`) and supports text filtering, an auto-scroll toggle, and clearing. The panel height persists across sessions.

**Terminal** — Provides a real shell session spawned with `node-pty` and rendered with `xterm.js`. It uses PowerShell on Windows and `$SHELL` on Unix. Terminal output streams over SSE, while input and resize events are sent through JSON requests. A shortcut launches the `opencode2` TUI in the same session. The shell respawns in place after a rate-limited crash, and sessions survive page refreshes through an output replay buffer.

The terminal requires `npm install` because of its native `node-pty` dependency. The native build is pre-approved through the committed `allowScripts` configuration in `package.json`.

**Testing** — Provides a **Run Tests** action for individual projects and a **Test All** action for running tests across the sandbox. Each project declares its test command in `package.json` under `scripts.test`, regardless of the project’s programming language. The dashboard reads and executes the configured script directly, bypassing npm to avoid unnecessary lifecycle overhead. A results modal displays pass/fail status per project, expandable output, and summary counts.

**Project management** — Automatically detects common run configurations, including `package.json` scripts, `server.js`, and `index.html`. It can install missing dependencies, build projects on demand, and create or delete projects through the API. Deleted projects are automatically backed up under `_backups/`.

## Requirements

- **Node.js**: >= 18
- **OpenCode CLI**: `opencode2` (OpenCode V2 beta)

The workspace targets OpenCode V2. Use the `opencode2` CLI, not the V1 `opencode` command.

Install the OpenCode V2 CLI globally:

```bash
npm install -g @opencode-ai/cli@next
```

See the [OpenCode V2 documentation](https://opencode.ai/v2/docs) for additional information.

## Quick Start

Install the workshop dependencies:

```bash
npm install
```

This installs the dashboard dependencies, including:

- `node-pty` for the embedded terminal;
- `@opencode-ai/plugin` in `.opencode` through the package `postinstall` setup.

The native `node-pty` build is pre-approved through the committed `allowScripts` configuration in `package.json`.

Start the dashboard server:

```bash
node app/server.js
```

Open the dashboard:

```text
http://localhost:3000
```

Verify that OpenCode V2 is installed:

```bash
opencode2 --version
```

Check the dashboard health endpoint:

```bash
opencode2 api get /api/health
```

Verify that the workspace plugin is loaded:

```bash
opencode2 api get "/api/plugin?location[directory]=<absolute-path-to-workspace>"
```

The `location[directory]` query parameter is required. Without it, OpenCode checks the global project context instead of this workspace.

> **Note:** The `default_agent` setting may not take effect in OpenCode V2. If the wrong agent is selected after launching OpenCode, run `/agents` and select **coder** manually.

## Project Structure

| Path                   | Purpose                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `app/server.js`        | Dashboard Express server on port 3000                                  |
| `app/project-utils.js` | Shared project discovery, dependency, build, and run-command utilities |
| `app/test-runner.js`   | Shared test execution logic                                            |
| `app/public/`          | Dashboard frontend single-page application                             |
| `projects/`            | Each subdirectory contains a sandbox project                           |
| `_backups/`            | Automatic backups created when projects are deleted                    |
| `tests/`               | Workshop test suites                                                   |
| `tests/agents/`        | Agent configuration and plugin tests                                   |
| `tests/workshop/`      | Dashboard application tests                                            |
| `tests/projects/`      | Cross-project test-runner tests                                        |
| `.active-project`      | State file tracking the currently active project                       |
| `.githooks/`           | Git hooks for formatting and scoped test validation                    |
| `opencode.json`        | OpenCode workspace configuration                                       |
| `AGENTS.md`            | Shared instructions, scope rules, and task execution guidelines        |
| `.opencode/agents/`    | Agent definitions                                                      |
| `.opencode/skills/`    | Reusable domain-specific skills loaded on demand                       |
| `.opencode/plugins/`   | Workspace plugins, including `plan-enforcer.js`                        |

The `.opencode/agents/` directory contains:

- `coder.md`
- `explore.md`
- `researcher.md`
- `reviewer.md`
- `refactor.md`

If a disabled `general.md` file exists, it is not available for normal agent or subagent use.

## API Reference

The dashboard backend exposes a JSON API under `/api/`:

| Endpoint                      | Method | Description                                                                                    |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `/api/health`                 | GET    | Server health, uptime, memory usage, and sandbox statistics                                    |
| `/api/projects`               | GET    | List all projects                                                                              |
| `/api/projects`               | POST   | Create a new project; currently not used in the UI                                             |
| `/api/active`                 | GET    | Retrieve the currently active project name                                                     |
| `/api/projects/:name`         | GET    | Retrieve project running status; equivalent to `/status`                                       |
| `/api/projects/:name/status`  | GET    | Retrieve project running status                                                                |
| `/api/projects/:name`         | DELETE | Delete a project and back it up to `_backups/`; currently not used in the UI                   |
| `/api/projects/:name/details` | GET    | Retrieve project description, scripts, dependencies, and metadata                              |
| `/api/projects/:name/logs`    | GET    | Retrieve buffered project logs                                                                 |
| `/api/projects/:name/select`  | POST   | Select and start a project                                                                     |
| `/api/projects/:name/stop`    | POST   | Stop a running project                                                                         |
| `/api/projects/:name/test`    | POST   | Run the project’s configured test script                                                       |
| `/api/projects/:name/build`   | POST   | Build the project’s distribution assets                                                        |
| `/api/projects/test-all`      | POST   | Run tests across all projects that define a test script                                        |
| `/api/projects/stop-all`      | POST   | Stop all active projects                                                                       |
| `/api/events`                 | GET    | SSE stream for real-time dashboard events                                                      |
| `/api/terminal`               | POST   | Spawn a terminal session; accepts optional `cwd`, `cols`, and `rows`, and returns a session ID |
| `/api/terminal/:id`           | GET    | SSE stream for terminal output                                                                 |
| `/api/terminal/:id/stream`    | GET    | Alias for the terminal output stream                                                           |
| `/api/terminal/:id/input`     | POST   | Send terminal input using a JSON `data` field                                                  |
| `/api/terminal/:id/resize`    | POST   | Resize a terminal using `cols` and `rows`                                                      |
| `/api/terminal/:id/opencode`  | GET    | Check whether `opencode2` is active in the session                                             |
| `/api/terminal/:id/kill`      | POST   | Terminate a terminal session                                                                   |

The terminal endpoints require the `node-pty` dependency.

## Agent Workspace

This workspace configures [OpenCode V2](https://opencode.ai) with specialized agent roles, shared skills, workspace commands, and automated workflow guardrails.

The workspace configuration allows the same agentic workflow to be used across all projects without separate per-project setup.

### Workspace Commands

The following commands are defined in `opencode.json`:

- `/review` — Runs `@reviewer` against changed files.
- `/clean` — Runs `@refactor` to remove duplication and perform structural cleanup.
- `/research` — Runs `@researcher` to investigate documentation or web resources.

### Agent Roles

- `@coder` (`.opencode/agents/coder.md`): Primary coding agent. Plans and executes code changes and coordinates subagents using role-prefixed planning.
- `@explore` (`.opencode/agents/explore.md`): Read-only agent for fast file and codebase discovery.
- `@researcher` (`.opencode/agents/researcher.md`): Read-only agent for web searches and documentation research.
- `@reviewer` (`.opencode/agents/reviewer.md`): Read-only agent for reviewing changes against a baseline commit.
- `@refactor` (`.opencode/agents/refactor.md`): Editing agent for cleanup, deduplication, and structural refactoring.

If a disabled `general.md` file exists, it is not available for normal agent or subagent use.

### Agent Workflow

#### 1. Reconnaissance

Before planning, `@coder` may delegate read-only discovery:

- `task(subagent_type="researcher")` — Provides access to read, web search, and web fetch tools.
- `task(subagent_type="reviewer")` — Provides access to read, glob, grep, skill, and read-only Git commands.
- `task(subagent_type="explore")` — Performs fast file discovery and is called directly rather than as a role-prefixed plan entry.

This optional reconnaissance stage helps the coder understand the relevant code before committing to a plan.

#### 2. Task Planning

The planning format is defined in `.opencode/agents/coder.md`.

The coder uses role-prefixed plan entries:

```text
Researcher: investigate the relevant API behavior [scope:app/]
Reviewer: inspect the affected implementation [scope:app/server.js]
Coder: implement the change [scope:app/server.js]
Refactor: remove duplication after review [scope:app/]
```

The `plan-enforcer` plugin validates this workflow and prevents unsupported subagent usage.

#### 3. Execution

- `Coder:` entries are handled directly by the primary agent.
- `Researcher:` entries are delegated to `@researcher`.
- `Reviewer:` entries are delegated to `@reviewer`.
- `Refactor:` entries are delegated to `@refactor`.

Subagents are read-only except for `@refactor`, which can edit files for structural cleanup. The `@reviewer` agent may additionally run read-only Git commands such as:

```text
git diff
git show
git rev-parse
git log
git status
```

These commands are used to scope reviews against a baseline commit.

### Plan Guardrails

The `plan-enforcer` plugin (`.opencode/plugins/plan-enforcer.js`) enforces two structural rules:

| Gate             | Rule                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Agent validation | `task()` and `subagent()` calls only accept registered, active agents with the appropriate subagent mode |
| Reviewer gate    | `@refactor` cannot run until a `@reviewer` delegation has completed during the current session           |

### Verification Pipeline

For non-trivial code changes, `@coder` follows this pipeline:

1. **Assess scope** — Trivial changes, such as a one-line fix, comment update, rename, or CSS-only change, may skip the pipeline.
2. **Review** — Spawn `@reviewer` to audit the changes against the baseline commit from `git rev-parse HEAD`.
3. **Refactor** — Spawn `@refactor` if review identifies structural or duplication issues.
4. **Test** — Run the relevant project or workshop tests when a test suite exists for the changed files.
5. **Fix** — Fix failing tests and rerun them, up to three times.

### How It Is Wired

`opencode.json` configures the workspace by:

- setting **coder** as the default agent;
- loading shared instructions from `AGENTS.md`;
- registering agents and skills;
- enabling the `plan-enforcer` plugin;
- registering workspace slash commands such as `/research`, `/review`, and `/clean`.

The instruction hierarchy is:

```text
system prompt → AGENTS.md → per-agent file
```

For example, `coder.md` adds the coding agent’s role-prefixed planning format and post-code verification pipeline on top of the shared rules in `AGENTS.md`.

Verify that the plugin is loaded for this workspace:

```bash
opencode2 api get "/api/plugin?location[directory]=<absolute-path-to-workspace>"
```

The `location[directory]` query parameter is required. Without it, OpenCode checks the global project context instead of this workspace.

## Testing

Workshop tests are grouped by scope:

- `test:agents` — Agent configuration and plugin tests.
- `test:projects` — Cross-project test-runner tests.
- `test:workshop` — Dashboard application tests.

Run the complete test suite:

```bash
npm test
```

Run an individual suite:

```bash
npm run test:agents
npm run test:projects
npm run test:workshop
```

Each sandbox project can define its own test command through `package.json`:

```json
{
  "scripts": {
    "test": "..."
  }
}
```

The dashboard reads the configured test script and executes it directly, avoiding unnecessary npm lifecycle overhead.

## Git Hooks

The committed hooks under `.githooks/` provide local validation before commits:

- Format staged files with Prettier.
- Run project tests when project files change.
- Run agent tests when agent, OpenCode, or related test configuration changes.
- Run workshop tests when files under `app/` or `tests/workshop/` change.
- Scope validation to the affected files where possible.
- Skip duplicate execution when a broader test suite has already covered the affected files.

## Configuration Files

| File                                 | Purpose                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                          | Shared instructions, scope-based reading rules, task classification, error handling, and project guidelines |
| `.opencode/agents/coder.md`          | Primary coding behavior, role-prefixed planning, and post-code verification                                 |
| `.opencode/agents/explore.md`        | Read-only codebase exploration                                                                              |
| `.opencode/agents/researcher.md`     | Web and documentation research                                                                              |
| `.opencode/agents/reviewer.md`       | Read-only code review and Git-based change inspection                                                       |
| `.opencode/agents/refactor.md`       | Deduplication and structural cleanup                                                                        |
| `.opencode/plugins/plan-enforcer.js` | Validates subagent calls and enforces the reviewer-before-refactor gate                                     |
| `opencode.json`                      | Registers agents, skills, plugins, and workspace commands                                                   |

## Project Detection

The dashboard detects common project configurations, including:

- npm projects with scripts in `package.json`;
- static projects containing `index.html`;
- Node.js projects with a `server.js` entry point;
- projects with configured build and test scripts;
- projects whose dependencies have not yet been installed.

The dashboard starts projects using the detected configuration, installs missing dependencies when necessary, builds projects on demand, and exposes their output through the log panel and live preview.
