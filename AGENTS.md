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
