# Task Planning

- **Always plan first.** State a plan to the user before using _any_ tool. Then call `todowrite` with role-prefixed entries (`Researcher:`, `Reviewer:`, `Refactor:`, `Coder:`)
- Delegate `Researcher:`/`Reviewer:`/`Refactor:` to subagents via `task(subagent_type="...")`. Only `Coder:` items are for you.

### Order of operations

Before any tool call, follow this sequence:

1. **Reconnaissance (optional)** — If you need to explore the codebase or research first, delegate a read-only subagent via `task()` to unlock read tools before committing to a plan:
   - `task(subagent_type="researcher")` → unlocks read, glob, grep, websearch, webfetch
   - `task(subagent_type="reviewer")` → unlocks read, glob, grep
2. **Identify** which subagents and skills the task needs.
3. **State the plan** to the user — which subagents and skills you'll use, and in what order.
4. **Create a task list** — call `todowrite` with role-prefixed items to unlock all tools.

## Plan Format — Role Prefixes Required

Every step in the plan must use a role prefix so the plugin can enforce
delegation and pipeline rules. Coder entries must also indicate whether the
pipeline runs or is skipped.

| Prefix                 | Delegation                         | Pipeline?                                                 |
| ---------------------- | ---------------------------------- | --------------------------------------------------------- |
| `Researcher:`          | `task(subagent_type="researcher")` | No                                                        |
| `Reviewer:`            | `task(subagent_type="reviewer")`   | No                                                        |
| `Refactor:`            | `task(subagent_type="refactor")`   | No                                                        |
| `Coder:` (default)     | Do not delegate — handle yourself  | **Runs** (review → refactor → test)                       |
| `Coder: ... (trivial)` | Do not delegate — handle yourself  | **Skipped** (single-line fix, comment, rename, CSS tweak) |

### Example — Non-trivial feature (pipeline runs)

```
## Plan
- **Subagents**: @researcher (research CSV parsing options)
- **Skills**: @backend, @testing
- **Steps**:
  1. Researcher: research CSV parsing in Node.js stdlib
  2. Coder: implement parseCSV function
  3. Coder: write unit tests for parseCSV
- **Pipeline**: will run (review → refactor → test)
```

### Example — Trivial fix (pipeline skipped)

```
## Plan
- **Subagents**: none
- **Skills**: none
- **Steps**:
  1. Coder: fix typo in comment (trivial)
- **Pipeline**: skipped (trivial)
```

Then call `todowrite` with matching role-prefixed entries, e.g.:

```
todowrite
  Researcher: research CSV parsing in Node.js stdlib
  Coder:      implement parseCSV function
  Coder:      write unit tests for parseCSV
```

**Rules:**

- `Coder:` without `(trivial)` → pipeline **required** (reviewer subagent must run before marking completed).
- `Coder: ... (trivial)` → pipeline **skipped**. Use only for truly trivial changes (single-line fix, comment typo, rename that doesn't change behavior, CSS tweak).
- Non-Coder items (`Researcher:`, `Reviewer:`, `Refactor:`) must be delegated via `task()` before they can start.

## Plan Reset — Fresh Plan Per Turn

Once **all** todos are `completed` or `cancelled`, the plan automatically resets.
The next tool call (other than `todowrite`) will be **blocked** until you state
a new plan and call `todowrite` again. This ensures every prompt starts with a
fresh plan — no stale todo lists from previous turns.

# Project Guidelines

## Dependencies

- Avoid adding dependencies. Prefer the standard library or well-maintained free/open-source options.

## Comments

- Prefer self-documenting code. Comments: WHY, not WHAT. Keep them concise.
- No commented-out code.

## Architecture

- Keep it simple. Favor composition over inheritance.
- Separate concerns: I/O, business logic, presentation.

## Workshop

- Projects live under `projects/`, tracked by `.active-project`. See `.opencode/rules/active-project.md` for scope logic.
- Dashboard: `http://localhost:3000` — start with `node app/server.js`.
