# README

A README is the front door of a project. It must answer, in order of a developer's urgency: _what is this_, _can I use it_, _how do I run it_, _how do I use it_, _how do I contribute_.

## Ground truth first

- Name and description come from `package.json` / module metadata, not from the title of the repo or memory.
- Installation and run commands must match `package.json` scripts (`npm start`, `npm run dev`, etc.), the `bin` field, and declared dependencies.
- Every feature mentioned must exist in the code. Read the entry point and exported modules before describing behavior.

## Section order

1. **Title + one-liner** — name, then a single sentence: what it does and for whom. No paragraphs before the one-liner.
2. **Features** — a short bullet list, each item traceable to actual behavior. Skip generic filler ("fast", "easy").
3. **Requirements** — runtime/version constraints, e.g. "Node.js >= 18". Only what the code actually requires.
4. **Installation** — exact commands. `npm install` for a package; for a CLI, also mention running it locally (`npm install -g .` only if that is real).
5. **Quick start** — the shortest path from clone to first visible result, as copy-pasteable commands. Prefer `npm start` over manual `node` invocations when a script exists.
6. **Usage / Examples** — realistic usage with real inputs and real outputs, matching what the code returns.
7. **API overview** — for libraries: table of exported functions/classes (name, signature, one-line purpose). For apps: table of main endpoints/commands. Full detail can live in the API reference; keep this to what a user needs at a glance.
8. **Configuration** — every environment variable or config option the code reads, with its default (verify in code) and meaning. Use a table.
9. **Contributing** — only if the project has contributing conventions; otherwise omit rather than invent.
10. **License** — only if a license file or an explicit `license` field in the manifest exists; state which one you took it from.

## Rules of thumb

- Skip what doesn't apply. A tiny script doesn't need a Contributing section.
- Use tables for anything repetitive (options, env vars, endpoints).
- Don't document what doesn't exist; don't promise what the code doesn't do.
- Keep the README working: if you change a command or flag, you must re-verify it against the code.
