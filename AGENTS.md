## Scope-Based Reading

Only read files directly relevant to the task. When a `[scope:...]` is declared, read only files within that scope.

**Strict Cross-Project Isolation:** Inside `projects/<project-name>/`, do NOT read, search, or inspect any sibling directory under `projects/`. Build from standard templates, not sibling boilerplate. Scope is the only gate.

## Communication Style

Be concise. No repetition or filler language.

## On Each Prompt

- **Investigatory / Evaluative** (questions, architecture, evaluations): respond directly, no plan, unless edits are required. `read`/`glob`/`grep` are unrestricted before a plan exists; prefer `subagent(agent="explore")` for broad exploration.
- **Task / Code execution** (implement, refactor, fix): explore/research → plan (role-prefixed plan header, format in `coder.md`) → execute.

**Bash caveat:** Never use bash to read files — use `read`/`glob`/`grep`.

**Tool output limits:** Tool output is truncated when large. Pass explicit `limit`/`offset` to `read` for big files; narrow `grep` with `path`/`include`.

### Error Handling

1. **Subagent failure** — retry once. If it fails again, do the work yourself and flag the subagent as unreliable.
2. **Tool call error** — assess: transient (retry) or logic bug (fix and retry).
3. **Never** silently ignore a failure. Log it and your adjustment.

## Project Guidelines

- **Dependencies:** avoid adding. Prefer the standard library or well-maintained FOSS.
- **Comments:** Only when the code takes longer to understand than to explain. If a comment saves the next dev from re-deriving intent, write it. Otherwise, let the code speak. No commented-out code without a removal condition attached.
- **Architecture:** keep it simple; composition over inheritance; separate I/O, logic, presentation.
- **Workshop:** projects live under `projects/`. Dashboard: `http://localhost:3000` (`node app/server.js`). Iframe port = DJB2 hash of project name (`4001–4999`) — use for the main page.
