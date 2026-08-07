# agentic-workshop

A local development sandbox for building and running small agentic coding projects with a shared AI agent configuration.

> Mostly AI-generated, reviewed code.

## Features

- **Shared AI Agent Workspace**: Pre-configured OpenCode V2 setup with custom agents (`coder`, `explore`, `researcher`, `reviewer`, `refactor`), domain skills (`.opencode/skills/`), and the `plan-enforcer` plugin (`.opencode/plugins/plan-enforcer.js`).
- **Interactive Dashboard**: Live control panel running at `http://localhost:3000` to manage, run, and preview projects.
- **Sidebar Navigation**: Overview of sandbox projects with status badges, npm script shortcut runner, and project metadata viewer.
- **Live Preview Overlay**: Sandboxed iframe preview with auto-reload on file edits and progress indicators.
- **Real-Time Log Streaming**: SSE-backed color-coded log panel with text filtering, scroll locking, and height persistence.
- **Embedded Terminal**: In-browser shell (`node-pty` + `xterm.js`) supporting PowerShell on Windows and `$SHELL` on Unix, with output replay and `opencode2` shortcut integration.
- **Cross-Project Test Runner**: One-click per-project and global test execution with aggregated results modal.

## Requirements

- **Node.js**: >= 18
- **OpenCode CLI**: `opencode2` (OpenCode V2 beta) installed globally via `npm install -g @opencode-ai/cli@next`

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dashboard server:
   ```bash
   node app/server.js
   ```
3. Open `http://localhost:3000` in your browser.

To verify the agent workspace configuration:

```bash
opencode2 --version
opencode2 api get "/api/plugin?location[directory]=<absolute-path-to-workspace>"
```

> **Note**: In OpenCode V2, select the **coder** agent manually after launching if needed by running `/agents` and choosing **coder**.

## Project Structure

| Path                   | Purpose                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `app/server.js`        | Dashboard Express server (port 3000)                                                        |
| `app/project-utils.js` | Shared project discovery, build, and dependency utilities                                   |
| `app/test-runner.js`   | Shared test execution logic                                                                 |
| `app/public/`          | Dashboard frontend single-page application (HTML/CSS/JS)                                    |
| `projects/`            | Sandbox project workspace directory                                                         |
| `_backups/`            | Automatic backups created upon project deletion                                             |
| `tests/`               | Workshop test suites (`test:agents`, `test:projects`, `test:workshop`)                      |
| `.active-project`      | State file tracking the currently active project                                            |
| `.githooks/`           | Pre-commit hooks for formatting and scoped test validation                                  |
| `opencode.json`        | OpenCode workspace config (registers agents, skills, plugins, slash commands)               |
| `AGENTS.md`            | Core instructions, scope-based rules, and task execution guidelines                         |
| `.opencode/agents/`    | Agent definitions (`coder.md`, `explore.md`, `researcher.md`, `reviewer.md`, `refactor.md`) |
| `.opencode/skills/`    | Domain skills loaded on demand (e.g. backend, database, testing, documentation)             |
| `.opencode/plugins/`   | Workspace plugins including `plan-enforcer.js`                                              |

## API Reference

The dashboard backend exposes a JSON API under `/api/`:

| Endpoint                      | Method | Description                                    |
| ----------------------------- | ------ | ---------------------------------------------- |
| `/api/health`                 | GET    | Server health, memory usage, and sandbox stats |
| `/api/projects`               | GET    | List all projects                              |
| `/api/projects`               | POST   | Create a new project                           |
| `/api/active`                 | GET    | Retrieve the active project name               |
| `/api/projects/:name`         | GET    | Retrieve project status                        |
| `/api/projects/:name/status`  | GET    | Retrieve project status                        |
| `/api/projects/:name`         | DELETE | Delete project (backed up to `_backups/`)      |
| `/api/projects/:name/details` | GET    | Retrieve project scripts and dependencies      |
| `/api/projects/:name/logs`    | GET    | Retrieve buffered project logs                 |
| `/api/projects/:name/select`  | POST   | Select and start project                       |
| `/api/projects/:name/stop`    | POST   | Stop running project                           |
| `/api/projects/:name/test`    | POST   | Run project test script                        |
| `/api/projects/:name/build`   | POST   | Build project distribution assets              |
| `/api/projects/test-all`      | POST   | Run tests across all projects                  |
| `/api/projects/stop-all`      | POST   | Stop all active projects                       |
| `/api/events`                 | GET    | SSE stream for real-time dashboard events      |
| `/api/terminal`               | POST   | Spawn a new shell session (`node-pty`)         |
| `/api/terminal/:id`           | GET    | SSE stream for terminal output                 |
| `/api/terminal/:id/input`     | POST   | Send input data to terminal session            |
| `/api/terminal/:id/resize`    | POST   | Resize terminal dimensions (`cols`, `rows`)    |
| `/api/terminal/:id/opencode`  | GET    | Check if `opencode2` TUI is active in session  |
| `/api/terminal/:id/kill`      | POST   | Terminate shell session                        |

## AI Agent Workspace & Workflow

This workspace configures OpenCode V2 with specialized agent roles and automated safety guardrails.

### Workspace Commands

Defined in `opencode.json`:

- `/review` — Runs `@reviewer` on changed files to check code quality.
- `/clean` — Runs `@refactor` to eliminate duplicate code.
- `/research` — Runs `@researcher` to investigate docs or web resources.

### Agent Subagent Roles

- `@coder` (`.opencode/agents/coder.md`): Primary coding agent. Directly executes code edits and coordinates subagent delegations using role-prefixed planning.
- `@explore` (`.opencode/agents/explore.md`): Read-only subagent for fast file and codebase discovery.
- `@researcher` (`.opencode/agents/researcher.md`): Read-only subagent for web search and documentation research.
- `@reviewer` (`.opencode/agents/reviewer.md`): Read-only subagent for auditing code changes against baseline commits.
- `@refactor` (`.opencode/agents/refactor.md`): Editing subagent for cleanup, deduplication, and refactoring.

### Plan Guardrails (`plan-enforcer`)

The `plan-enforcer` plugin (`.opencode/plugins/plan-enforcer.js`) enforces structural workflow rules:

1. **Agent Validation**: Restricts subagent calls strictly to registered, active subagents.
2. **Reviewer Gate**: Blocks `@refactor` execution until a `@reviewer` pass has run within the session.

### Post-Code Verification Pipeline

When non-trivial code changes are made, `@coder` executes a 4-step verification flow:

1. **Review**: `@reviewer` audits changes against the baseline commit (`git rev-parse HEAD`).
2. **Refactor**: `@refactor` resolves blocking review findings.
3. **Test**: Project test suites run automatically.
4. **Fix**: Auto-remediates failing test cases (up to 3 retries).
