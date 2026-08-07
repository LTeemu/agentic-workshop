# User guide

A user guide walks a developer through real tasks, step by step. Its test is: _could someone follow this without asking a single question?_

## Ground truth first

- Steps must reflect the actual commands and files of the project (`package.json` scripts, config files, directory layout).
- Each step's expected result must match what the code actually prints or produces. Run the commands mentally against the source; if you can execute them, do.

## Structure

1. **Prerequisites** — anything that must exist before starting: Node version, API keys, other services. Verify against code/config; don't assume.
2. **Setup steps** — numbered steps, each one a single action:
   - One command or file edit per step.
   - State the expected result after the step ("You should see `Server running on port 3000`") — only if that output is real.
   - Put commands in fenced blocks with the exact text to type.
3. **Configuration** — how to set options/env vars, with what the code does with each one.
4. **Common tasks** — 2–5 short how-tos for the operations real users perform, each with a worked example.
5. **Troubleshooting** — a table: symptom → cause → fix. Only entries grounded in actual error behavior (validation messages, thrown errors, exit codes) or genuinely common issues.

## Rules of thumb

- Numbered steps only where order matters; use bullets for unordered lists of things.
- Don't include steps you can't verify (e.g. an account you must create on a service the code doesn't touch).
- Show expected output only when you can confirm it from the code path.
- Keep each step short — a long step hides a missing step.
