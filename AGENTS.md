## Communication Style

- Be concise. Avoid repetition or filler language.

## On Each Prompt (HARD GATE)

### First Action

When you receive a new user message:

1. **Read the rules** — AGENTS.md, pipeline.md. You calibrate from them.
2. **Plan** — State your plan to the user: which subagents and skills you'll use, and in what order. Wait for confirmation.
3. **Call `todowrite`** — with role-prefixed entries (see table below). This unlocks your tools.
4. **Delegate** — Researcher/Reviewer/Refactor entries go via `task(subagent_type="...")`. Only Coder entries are for you to handle directly.

> These four steps are a hard gate. Do not use read, write, edit, glob, grep, bash, or any other tool until you have completed steps 1-3.

> **Important:** The "Todos" section in your plan output to the user must use the same role-prefixed entries as the `todowrite` call. They must match — do not output a separate todos list without prefixes.

### Role Prefix Reference

Every todowrite entry must start with one of these prefixes. The plugin enforces delegation and pipeline rules based on them.

| Prefix                 | You must delegate via...           | Pipeline?                                                 |
| ---------------------- | ---------------------------------- | --------------------------------------------------------- |
| `Researcher:`          | `task(subagent_type="researcher")` | No                                                        |
| `Reviewer:`            | `task(subagent_type="reviewer")`   | No                                                        |
| `Refactor:`            | `task(subagent_type="refactor")`   | No                                                        |
| `Coder:`               | Handle yourself — no delegation    | **Runs** (review → refactor → test)                       |
| `Coder: ... (trivial)` | Handle yourself — no delegation    | **Skipped** (single-line fix, comment, rename, CSS tweak) |

#### Example — Non-trivial feature (pipeline runs)

```
## Plan
- **Subagents**: @researcher (research CSV parsing options)
- **Skills**: @backend, @testing
- **Steps**:
  1. Researcher: research CSV parsing in Node.js stdlib
  2. Coder: implement parseCSV function
  3. Coder: write unit tests for parseCSV
- **Todos**:
  - Researcher: research CSV parsing in Node.js stdlib
  - Coder:      implement parseCSV function
  - Coder:      write unit tests for parseCSV
- **Pipeline**: will run (review → refactor → test)
```

#### Example — Trivial fix (pipeline skipped)

```
## Plan
- **Subagents**: none
- **Skills**: none
- **Steps**:
  1. Coder: fix typo in comment (trivial)
- **Todos**:
  - Coder: fix typo in comment (trivial)
- **Pipeline**: skipped (trivial)
```

Then call `todowrite` with matching role-prefixed entries, e.g.:

```
todowrite
  Researcher: research CSV parsing in Node.js stdlib
  Coder:      implement parseCSV function
  Coder:      write unit tests for parseCSV
```

### Plan Reset — Fresh Plan Per Turn

Once **all** todos are `completed` or `cancelled`, the plan resets. At the start of the next user message, you **must** state a new plan and call `todowrite` again before using tools. No stale plans from previous turns.

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
