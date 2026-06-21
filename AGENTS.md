# Project Guidelines

## Dependencies

- Avoid adding dependencies. Prefer the standard library or well-maintained free/open-source options.

## Comments

- Self-documenting code > comments. Comments explain WHY, not WHAT.
- Never commit commented-out code.
- Doc comments for public APIs. Inline comments for non-obvious tradeoffs only.

## Architecture

- Keep it simple. Favor composition over inheritance.
- Separate concerns: I/O, business logic, presentation.
- Use dependency injection for testability.

## Workshop

- Projects live under `projects/`, tracked by `.active-project`. See `.opencode/rules/active-project.md` for scope logic.
- Never read, reference, or copy code from other projects in `projects/`.
- Dashboard: `http://localhost:3000` — start with `node app/server.js`.
