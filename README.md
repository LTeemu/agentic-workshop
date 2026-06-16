# agentic-workshop

> Fully AI-generated experimental project. Built entirely through agentic LLM tooling as a coding sandbox playground.

A local development sandbox for spinning up and managing small coding projects.

## What it does

- Runs a dashboard at `http://localhost:3000` where you can see, create, and switch between projects
- Detects how to run a project — `package.json` scripts, `server.js`, or static files
- Auto-installs dependencies when `node_modules` is missing
- Streams logs from running projects to the dashboard via SSE
- Watches project files for changes and notifies the dashboard
- Scaffolds new projects from templates in `_templates/`

## How to use

```
node app/server.js
```

Then open `http://localhost:3000`.

## Project structure

| Path              | Purpose                                    |
| ----------------- | ------------------------------------------ |
| `app/server.js`   | Dashboard server (port 3000)               |
| `app/public/`     | Dashboard frontend (HTML/CSS/JS)           |
| `projects/`       | Each subdirectory is a project             |
| `_templates/`     | Scaffold templates for new projects        |
| `_backups/`       | Auto-generated backups on project deletion |
| `.active-project` | Tracks which project is currently active   |
| `AGENTS.md`       | Instructions for the AI assistant          |
| `opencode.json`   | Configuration for the opencode AI tool     |

## API

The dashboard exposes a JSON API under `/api/` — endpoints for listing, creating, selecting, stopping, and building projects. See `app/server.js` for details.

## Why

This is a companion tool for [opencode](https://opencode.ai), an AI coding assistant. The workshop gives it a place to create, run, and preview projects without leaving the editor.
