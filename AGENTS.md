## Scope-Based Reading

Only read files directly relevant to the task. When a `[scope:...]` is declared in a todowrite entry, read only files within that scope.

**Strict Cross-Project Isolation:** Inside `projects/<project-name>/`, do NOT read, search, or inspect any sibling directory under `projects/`. Build from standard templates, not sibling boilerplate. Scope is the only gate.

## Communication Style

Be concise. No repetition or filler language.

## On Each Prompt

- **Investigatory / Evaluative** (questions, architecture, evaluations): respond directly, no `todowrite` plan, unless edits are required. `read`/`glob`/`grep` are unrestricted before a plan exists; prefer `task(subagent_type="explore")` for broad exploration.
- **Task / Code execution** (implement, refactor, fix): explore/research → plan (role-prefixed plan header) → execute.

**Bash caveat:** Never use bash to read files — use `read`/`glob`/`grep`.

### Role Prefix Reference

Every task entry must start with one of:

| Prefix                 | Action                             | Reviewer gate              |
| ---------------------- | ---------------------------------- | -------------------------- |
| `Researcher:`          | `task(subagent_type="researcher")` | No                         |
| `Reviewer:`            | `task(subagent_type="reviewer")`   | No                         |
| `Refactor:`            | `task(subagent_type="refactor")`   | No                         |
| `Coder:`               | handle directly                    | Required before completion |
| `Coder: ... (trivial)` | handle directly                    | Skipped                    |

> Every entry must start with a role prefix; every Coder/Reviewer/Refactor entry must include `[scope:...]` (Researcher may omit scope). At least one entry must have a non-empty scope. `explore` is invoked directly via `task(subagent_type="explore")` — never as a plan prefix.

Example:

```
## Plan
- **Subagents**: @researcher (CSV parsing in Node.js stdlib)
- **Skills**: @backend, @testing
- **Todos**:
  - Researcher: research CSV parsing in Node.js stdlib
  - Coder:      [scope:src/parser.js] implement parseCSV
  - Coder:      [scope:src/] write unit tests for parseCSV
  - Coder:      [scope:src/] fix typo in comment (trivial)
```

### Error Handling

1. **Subagent failure** — retry once. If it fails again, do the work yourself and flag the subagent as unreliable.
2. **Tool call error** — assess: transient (retry) or logic bug (fix and retry).
3. **Never** silently ignore a failure. Log it and your adjustment.

## Project Guidelines

- **Dependencies:** avoid adding. Prefer the standard library or well-maintained FOSS.
- **Comments:** WHY, not WHAT. Self-documenting. No commented-out code.
- **Architecture:** keep it simple; composition over inheritance; separate I/O, logic, presentation.
- **Workshop:** projects live under `projects/`. Dashboard: `http://localhost:3000` (`node app/server.js`). Iframe port = DJB2 hash of project name (`4001–4999`) — use for the main page.
