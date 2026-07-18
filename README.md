# agentic-workshop

> Mostly AI-generated code.

A local development sandbox for spinning up and managing small agentic coding projects.

## What it does

- Runs a dashboard at `http://localhost:3000` where you can see, create, and switch between projects
- Detects how to run a project — `package.json` scripts, `server.js`, or static files
- Auto-installs dependencies when `node_modules` is missing
- Streams logs from running projects to the dashboard via SSE
- Watches project files for changes and notifies the dashboard

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

| Endpoint                      | Method | Description                                 |
| ----------------------------- | ------ | ------------------------------------------- |
| `/api/projects`               | GET    | List all projects                           |
| `/api/active`                 | GET    | Get the currently active project            |
| `/api/projects/:name/details` | GET    | Get project metadata                        |
| `/api/projects/:name/status`  | GET    | Get project running status                  |
| `/api/projects/:name/select`  | POST   | Select (start) a project                    |
| `/api/projects/:name/stop`    | POST   | Stop a running project                      |
| `/api/projects/:name/test`    | POST   | Run a project's tests                       |
| `/api/projects/:name/build`   | POST   | Build a project                             |
| `/api/projects/:name`         | DELETE | Delete a project (backed up to `_backups/`) |
| `/api/projects/test-all`      | POST   | Run tests for all projects                  |
| `/api/projects/stop-all`      | POST   | Stop all running projects                   |
| `/api/events`                 | GET    | SSE stream for real-time dashboard updates  |

## AI agent setup

This workspace is configured for use with [opencode](https://opencode.ai), an AI coding assistant:

- **`AGENTS.md`** — Instructions loaded by the AI on every task. Defines project-level conventions (dependency policy, code style, architecture).
- **`opencode.json`** — Tool configuration including model selection, command shortcuts (`@reviewer`, `@refactor`, `@researcher`), and skills paths.
- **`skills/`** (`.opencode/skills/`) — 23 domain-specific skill files that the AI loads on demand (e.g. `@backend`, `@database`, `@testing`). Each contains curated workflows for its domain.
- **`rules/`** (`.opencode/rules/`) — Pipeline rules that run automatically after code changes (scope validation, active-project sync).
