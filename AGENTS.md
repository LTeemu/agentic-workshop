## Scope-Based Reading

Only read files directly relevant to the task. When a `[scope:...]` is declared in a todowrite entry, read only files within that scope. **Strict Cross-Project Isolation:** No browsing sibling projects under `projects/` for reference code, boilerplate, or examples. Build projects from standard templates rather than inspecting sibling projects. Scope is the only gate.

## Communication Style

- Be concise. No repetition or filler language.

## On Each Prompt

When you receive a new user message:

- **Investigatory / Evaluative Queries** (answering questions, explaining architecture, evaluating changes): You can respond directly without a formal `todowrite` plan, provided no file edits or direct code mutations are required. Note: direct `read`/`glob`/`grep` calls require either a `todowrite` plan or `task(subagent_type="explore")` delegation.
- **Task / Code Execution Queries** (implementing features, refactoring, fixing bugs):
  1. **Explore / Research** — Use `task(subagent_type="explore")` / `task(subagent_type="researcher")` / `task(subagent_type="reviewer")` for read-only exploration.
  2. **Plan** — Determine relevant subagents, skills, and scope. State your plan to the user via a role-prefixed plan header.
  3. **Execute** — `Researcher:`/`Reviewer:`/`Refactor:` entries → delegate via `task(subagent_type="...")`. `Coder:` entries → handle directly.

**Bash caveat:** Don't use bash to read files — use `read`/`glob`/`grep` instead.

### Role Prefix Reference

Every task entry must start with one of these prefixes:

| Prefix                 | You must delegate via...           | Pipeline reviewer gate?                                  |
| ---------------------- | ---------------------------------- | -------------------------------------------------------- |
| `Researcher:`          | `task(subagent_type="researcher")` | No                                                       |
| `Reviewer:`            | `task(subagent_type="reviewer")`   | No                                                       |
| `Refactor:`            | `task(subagent_type="refactor")`   | No                                                       |
| `Coder:`               | Handle yourself — no delegation    | **Required** (reviewer must be called before completion) |
| `Coder: ... (trivial)` | Handle yourself — no delegation    | Skipped                                                  |

> **Every entry MUST start with the role prefix. Every Coder/Reviewer/Refactor entry MUST include `[scope:...]`.** Researcher may omit scope (exploratory search). At least one entry must have a non-empty scope.

#### Example — Non-trivial feature

```
## Plan
- **Subagents**: @researcher (research CSV parsing options)
- **Skills**: @backend, @testing
- **Todos**:
  - Researcher: research CSV parsing in Node.js stdlib
  - Coder:      [scope:src/parser.js] implement parseCSV function
  - Coder:      [scope:src/] write unit tests for parseCSV
```

#### Example — Trivial fix

```
## Plan
- **Todos**:
  - Coder: [scope:src/] fix typo in comment (trivial)
```

### Error Handling

When something fails:

1. **Subagent failure** — retry once. If it fails again, do the work yourself and flag the subagent as unreliable in your output.
2. **Tool call error** — assess: transient (retry) or logic bug (fix and retry).
3. **Never** silently ignore a failure. Log what happened and how you adjusted.

## Project Guidelines

### Dependencies

- Avoid adding dependencies. Prefer the standard library or well-maintained free/open-source options.

### Comments

- Prefer self-documenting code. Comments: WHY, not WHAT. Keep them concise.
- No commented-out code.

### Architecture

- Keep it simple. Favor composition over inheritance.
- Separate concerns: I/O, business logic, presentation.

### Workshop

- Projects live under `projects/`. Dashboard: `http://localhost:3000` — start with `node app/server.js`.
- Dashboard iframe uses a port based on project name (DJB2 hash → `4001–4999`). Use it for the main page.
