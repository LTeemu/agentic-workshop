# agentic-workshop

> Mostly AI-generated, reviewed code.

A local development sandbox for building and running small agentic coding projects, with a shared AI agent configuration.

## What it does

### 1. Shared AI agent workspace

Pre-configured [opencode](https://opencode.ai) setup with custom agent files (under `.opencode/agents/`), reusable subagents (`@researcher`, `@reviewer`, `@refactor`, `@explore`), a library of skills (`.opencode/skills/`), a post-code verification pipeline (in `coder.md`), and a plan-enforcer plugin (`.opencode/plugins/plan-enforcer.js`) — so the same agentic workflow applies to every project in the workshop without per-project setup.

### 2. Dashboard at `http://localhost:3000`

A live control panel for spinning up, previewing, and testing any project in the sandbox:

**Sidebar** — lists all projects with type badges (npm, static, Python, etc.), running indicators, and active state. Click a project to start/preview it; click again to stop. Collapsible to compact mode (persisted). Per-project details panel shows description, npm scripts (with copy), dependencies, and devDependencies.

**Live preview** — embedded iframe of the running project, sandboxed for security. Auto-reloads on file changes. Shows startup progress and error states in a central overlay. "Open in Tab" for external browsing.

**Log panel** — collapsible, resizable panel with real-time log streaming via SSE. Color-coded output (stdout/stderr/system), text filter, auto-scroll toggle, clear. Panel height persists across sessions.

**Terminal** — real shell session (PowerShell on Windows, `$SHELL` on Unix) spawned via node-pty and rendered with xterm.js. Output streams over SSE; input and resize go back over JSON. A shortcut launches the `opencode2` TUI inside the same session. The shell respawns in place after a crash (rate-limited), and sessions survive page refreshes via an output replay buffer. Requires `npm install` — node-pty's native build is pre-approved via the committed `allowScripts` in `package.json`.

**Testing** — "Run Tests" button per project, "Test All" across every project. Convention: each project declares its test command in `package.json` `scripts.test` — regardless of language. The dashboard reads the script and executes it directly (bypassing npm to avoid lifecycle overhead). Results modal shows pass/fail per project with expandable output and summary counts.

**Project management** — auto-detects run commands (`package.json` scripts, `server.js`, `index.html`). Auto-installs missing dependencies. Builds projects on demand. Creating and deleting projects available via API (with automatic backup on delete).

## How to use

```
npm install          # node-pty (in-dashboard terminal) + @opencode-ai/plugin in .opencode via postinstall;
                     # node-pty's native build is pre-approved via the committed allowScripts in package.json
node app/server.js
```

Then open `http://localhost:3000`.

The agent workspace (`.opencode/`, agents, plugins, skills) targets **OpenCode V2** (beta) — use the `opencode2` CLI, not V1's `opencode`. Install it with `npm install -g @opencode-ai/cli@next`; see the [V2 docs](https://opencode.ai/v2/docs):

```
opencode2 --version
opencode2 api get /api/health
```

**Switch to the coder agent.** The `default_agent` setting in `opencode.json` doesn't seem to work in V2, so select the **coder** agent manually after launching: type `/agents` and pick **coder**.

## Project structure

| Path                        | Purpose                                                                                                                                                                                                                                                                           |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/server.js`             | Dashboard server (port 3000)                                                                                                                                                                                                                                                      |
| `app/project-utils.js`      | Shared dependency/build infrastructure                                                                                                                                                                                                                                            |
| `app/test-runner.js`        | Shared test execution logic                                                                                                                                                                                                                                                       |
| `app/public/`               | Dashboard frontend (HTML/CSS/JS)                                                                                                                                                                                                                                                  |
| `projects/`                 | Each subdirectory is a project                                                                                                                                                                                                                                                    |
| `_backups/`                 | Auto-generated backups on project deletion                                                                                                                                                                                                                                        |
| `tests/`                    | Test suites: `tests/agents/` (agent config & plugin), `tests/workshop/` (dashboard app), `tests/projects/` (cross-project runner) — `npm run test:*`                                                                                                                              |
| `.active-project`           | Tracks which project is currently active                                                                                                                                                                                                                                          |
| `.githooks/`                | Git hooks (format staged files with prettier + tests scoped to changed files: per-project suites, agent suite on agent/opencode paths or `tests/package.json`, workshop suite on `app/`/`tests/workshop/` paths — skipped when the agent suite already ran the full tests/ suite) |
| `opencode.json`             | Reads `AGENTS.md`; registers agents, plugins, slash commands (`research`)                                                                                                                                                                                                         |
| `AGENTS.md`                 | Shared instructions (scope-based reading, task classification, project guidelines) — role-prefix plan format lives in `coder.md`                                                                                                                                                  |
| `.opencode/agents/`         | One file per agent (`coder.md`, `explore.md`, `researcher.md`, `reviewer.md`, `refactor.md`; `general.md` exists but is disabled) — each defines an agent's behavior and tools                                                                                                    |
| `.opencode/agents/coder.md` | Primary coding agent — role-prefix plan format (`Researcher:` / `Reviewer:` / `Refactor:` / `Coder:` with `[scope:...]`) + post-code pipeline                                                                                                                                     |
| `.opencode/skills/`         | One file per skill — reusable domain instructions loaded on demand (e.g. backend, testing, database)                                                                                                                                                                              |
| `.opencode/plugins/`        | `plan-enforcer.js` — gates subagent calls (valid types; `refactor` needs prior `reviewer`)                                                                                                                                                                                        |

## API

The dashboard exposes a JSON API under `/api/`:

| Endpoint                      | Method | Description                                                                                          |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| `/api/health`                 | GET    | Server health (uptime, memory, project stats)                                                        |
| `/api/projects`               | GET    | List all projects                                                                                    |
| `/api/projects`               | POST   | Create a new project — not used in the UI                                                            |
| `/api/active`                 | GET    | Get the currently active project                                                                     |
| `/api/projects/:name`         | GET    | Get project running status (same as `/status`)                                                       |
| `/api/projects/:name/status`  | GET    | Get project running status                                                                           |
| `/api/projects/:name`         | DELETE | Delete a project — not used in the UI (backed up to `_backups/`)                                     |
| `/api/projects/:name/details` | GET    | Get project metadata (scripts, deps)                                                                 |
| `/api/projects/:name/logs`    | GET    | Get project log output                                                                               |
| `/api/projects/:name/select`  | POST   | Select (start) a project                                                                             |
| `/api/projects/:name/stop`    | POST   | Stop a running project                                                                               |
| `/api/projects/:name/test`    | POST   | Run a project's tests                                                                                |
| `/api/projects/:name/build`   | POST   | Build a project (minifies CSS/JS to dist/)                                                           |
| `/api/projects/test-all`      | POST   | Run tests for all projects that define a test script                                                 |
| `/api/projects/stop-all`      | POST   | Stop all running projects                                                                            |
| `/api/events`                 | GET    | SSE stream for real-time dashboard updates                                                           |
| `/api/terminal`               | POST   | Start a terminal session (body: `cwd?`, `cols?`, `rows?`) — returns session `id` (requires node-pty) |
| `/api/terminal/:id`           | GET    | SSE output stream for a terminal (alias: `/api/terminal/:id/stream`)                                 |
| `/api/terminal/:id/input`     | POST   | Write input to a terminal (body: `data`)                                                             |
| `/api/terminal/:id/resize`    | POST   | Resize a terminal (body: `cols`, `rows`)                                                             |
| `/api/terminal/:id/opencode`  | GET    | Check whether `opencode2` is running in the session                                                  |
| `/api/terminal/:id/kill`      | POST   | Kill a terminal session                                                                              |

## AI agent workflow

This workspace is configured for [opencode](https://opencode.ai). The default agent is **coder**, which follows this flow:

### 1. Reconnaissance (optional, before planning)

Before committing to a plan, the coder can dispatch a read-only subagent for codebase exploration:

- `task(subagent_type="researcher")` — unlocks read, websearch, webfetch
- `task(subagent_type="reviewer")` — unlocks read, glob, grep, skill, read-only git diff/show/rev-parse/log/status
- `task(subagent_type="explore")` — not a role-prefixed entry; called directly via `task()` for fast file discovery

This is the intended way to explore before a plan exists — direct reads are unrestricted, but delegating keeps the main agent focused.

### 2. Task planning

Defined in `.opencode/agents/coder.md`. The coder states a role-prefixed plan, then executes. The **plan-enforcer** plugin gates:

| Gate                       | Rule                                                                                                             |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Invalid subagent type      | `task()`/`subagent()` only accepts agent types registered in `.opencode/agents/` (mode `subagent`, not disabled) |
| Refactor requires reviewer | a `refactor` delegation is blocked until a `reviewer` delegation ran in the session                              |

### 3. Execution

The coder works through the task list:

- `Coder:` entries — handled directly (editing, writing code)
- `Researcher:` entries — delegated via `task(subagent_type="researcher")`
- `Reviewer:` entries — delegated via `task(subagent_type="reviewer")`
- `Refactor:` entries — delegated via `task(subagent_type="refactor")`

Subagents are read-only except **refactor**, which can edit files for structural changes; **reviewer** may additionally run read-only git commands (`git diff`/`show`/`rev-parse`/`log`/`status`) to scope its review to a baseline commit.

### 4. Pipeline (post-code verification)

Defined in `.opencode/agents/coder.md`. Runs after code changes:

1. **Assess scope** — trivial changes (single-line fix, comment, rename, CSS) skip entirely
2. **Review** — spawn `@reviewer`; plugin blocks `refactor` until a `reviewer` ran
3. **Refactor** — spawn `@refactor` if review flagged issues
4. **Test** — runs tests if a test suite exists for the changed files
5. **Fix** — if tests fail, fix and rerun

### How it's wired

`opencode.json` sets **coder** as the default agent, reads `AGENTS.md`, and enables the **plan-enforcer** plugin. Instruction hierarchy: system prompt → `AGENTS.md` → per-agent file (e.g. `coder.md`).

Verify the plugin is loaded for this workspace:

```
opencode2 api get "/api/plugin?location[directory]=<absolute-path-to-workspace>"
```

The `location[directory]` query is required — without it the command lists plugins for the global project context, not this workspace.

Key files:

| File                                 | Purpose                                                                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md`                          | Shared instructions: scope-based reading, task classification, error handling, project guidelines                         |
| `.opencode/agents/coder.md`          | Primary coding agent — role-prefix plan format, handles `Coder:` tasks directly; includes post-code verification pipeline |
| `.opencode/agents/explore.md`        | `@explore` — read-only codebase exploration (not a role prefix)                                                           |
| `.opencode/agents/researcher.md`     | `@researcher` — web research, doc lookup (read-only)                                                                      |
| `.opencode/agents/reviewer.md`       | `@reviewer` — code quality review (read-only; read-only git diff/log for scope)                                           |
| `.opencode/agents/refactor.md`       | `@refactor` — deduplication and cleanup (can edit)                                                                        |
| `.opencode/plugins/plan-enforcer.js` | Gates subagent calls (valid agent types; `refactor` requires prior `reviewer`)                                            |
