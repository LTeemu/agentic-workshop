# agentic-workshop

> Mostly AI-generated code.

A local development sandbox for spinning up and managing small agentic coding projects.

## What it does

A dashboard at `http://localhost:3000` for managing multiple web projects:

**Sidebar** — lists all projects with type badges (npm, static, Python, etc.), running indicators, and active state. Click a project to start/preview it; click again to stop. Collapsible to compact mode (persisted). Per-project details panel shows description, npm scripts (with copy), dependencies, and devDependencies.

**Live preview** — embedded iframe of the running project, sandboxed for security. Auto-reloads on file changes. Shows startup progress and error states in a central overlay. "Open in Tab" for external browsing.

**Log panel** — collapsible, resizable panel with real-time log streaming via SSE. Color-coded output (stdout/stderr/system), text filter, auto-scroll toggle, clear. Panel height persists across sessions.

**Testing** — "Run Tests" button per project, "Test All" across every project. Results modal shows pass/fail per project with expandable output and summary counts.

**Project management** — auto-detects run commands (`package.json` scripts, `server.js`, `index.html`). Auto-installs missing dependencies. Builds projects on demand. Creating and deleting projects available via API (with automatic backup on delete).

## How to use

```
node app/server.js
```

Then open `http://localhost:3000`.

## Project structure

| Path                   | Purpose                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `app/server.js`        | Dashboard server (port 3000)                                           |
| `app/project-utils.js` | Shared dependency/build infrastructure                                 |
| `app/test-runner.js`   | Shared test execution logic                                            |
| `app/public/`          | Dashboard frontend (HTML/CSS/JS)                                       |
| `projects/`            | Each subdirectory is a project                                         |
| `_backups/`            | Auto-generated backups on project deletion                             |
| `scripts/test-all.js`  | CLI tool to run tests across all projects                              |
| `.active-project`      | Tracks which project is currently active                               |
| `.githooks/`           | Git hooks (auto-format + smart test on commit — only changed projects) |
| `AGENTS.md`            | Instructions for the AI assistant                                      |
| `opencode.json`        | Configuration for the opencode AI tool                                 |

## API

The dashboard exposes a JSON API under `/api/`:

| Endpoint                      | Method | Description                                              |
| ----------------------------- | ------ | -------------------------------------------------------- |
| `/api/health`                 | GET    | Server health (uptime, memory, project stats)            |
| `/api/projects`               | GET    | List all projects                                        |
| `/api/projects`               | POST   | Create a new project — not in use                        |
| `/api/active`                 | GET    | Get the currently active project                         |
| `/api/projects/:name`         | GET    | Get project running status (same as `/status`)           |
| `/api/projects/:name/status`  | GET    | Get project running status                               |
| `/api/projects/:name`         | DELETE | Delete a project — not in use (backed up to `_backups/`) |
| `/api/projects/:name/details` | GET    | Get project metadata (scripts, deps)                     |
| `/api/projects/:name/logs`    | GET    | Get project log output                                   |
| `/api/projects/:name/select`  | POST   | Select (start) a project                                 |
| `/api/projects/:name/stop`    | POST   | Stop a running project                                   |
| `/api/projects/:name/test`    | POST   | Run a project's tests                                    |
| `/api/projects/:name/build`   | POST   | Build a project (minifies CSS/JS to dist/)               |
| `/api/projects/test-all`      | POST   | Run tests for all projects                               |
| `/api/projects/stop-all`      | POST   | Stop all running projects                                |
| `/api/events`                 | GET    | SSE stream for real-time dashboard updates               |

## AI agent workflow

This workspace is configured for [opencode](https://opencode.ai). The `opencode.json` loads `AGENTS.md` as project instructions and registers the agent files under `.opencode/agents/`. When you give the coder a task, it follows this chain:

### Instructions loaded on every task

```
┌─ System prompt ─────────────── built-in behavioral instructions, tools, skills
├─ AGENTS.md ─────────────────── project rules (loaded via opencode.json)
├─ .opencode/agents/coder.md ─── coder-specific style rules
└─ .opencode/rules/active-project.md ── scope (checked when needed)
```

**AGENTS.md** applies to all agents (coder, researcher, reviewer, refactor). It defines:

- **Task Planning** — analyze → select subagents/skills → order → state plan
- **Project Guidelines** — dependency policy, code style, architecture

**coder.md** is specific to the primary coding agent. It defines:

- **Communication** — clarify ambiguous requirements, propose approach, call out risks
- **Code quality** — zero duplication, clean code, consistency, testing
- **Pipeline reference** — run `.opencode/rules/pipeline.md` after code changes

### Task Planning phase (before code)

The coder follows this sequence:

1. **Reconnaissance (optional)** — delegate a researcher or reviewer via `task()` to explore the codebase before committing to a plan. This unlocks read tools (glob, grep, web fetch) without writing yet.
2. **Identify** which subagents (research, review, refactor) and skills the task needs.
3. **State the plan** to you — which subagents and skills will be used and in what order.
4. **Create a task list** — call `todowrite` with role-prefixed items (`Researcher:`, `Reviewer:`, `Refactor:`, `Coder:`) to unlock write tools.

Then execution begins: `Coder:` items are handled directly; `Researcher:`/`Reviewer:`/`Refactor:` items are delegated via `task()`.

### Subagents

Spawned on demand via `@mention` or automatic task planning:

| File                             | Agent         | Purpose                                         |
| -------------------------------- | ------------- | ----------------------------------------------- |
| `.opencode/agents/researcher.md` | `@researcher` | Research docs, APIs, unfamiliar technology      |
| `.opencode/agents/reviewer.md`   | `@reviewer`   | Review code for duplication, quality, standards |
| `.opencode/agents/refactor.md`   | `@refactor`   | Eliminate duplication, improve structure        |

### Pipeline phase (after code changes)

After making changes, the coder runs a verification pass defined in `.opencode/rules/pipeline.md`. What runs depends on the change type:

| Change type                                     | Pipeline steps                         | Enforced by plugin?     |
| ----------------------------------------------- | -------------------------------------- | ----------------------- |
| No code changes (question, research)            | Skipped entirely                       | No                      |
| Trivial (single-line fix, comment, rename, CSS) | Skipped — mark with `(trivial)`        | No                      |
| Non-trivial, no test suite                      | **Review** → refactor (if issues)      | Yes — reviewer must run |
| Non-trivial, with tests                         | **Review** → refactor → **test** → fix | Yes — reviewer must run |

```
Assess scope → review → refactor (if needed) → test (if applicable) → fix
```

The task planning phase (before code) decides **what** to change and **how**. The pipeline phase (after code) verifies the change — not a repeat of planning.
