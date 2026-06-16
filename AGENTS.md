# Project Guidelines

## Code Quality

- Zero duplication is the goal. Every repeated block is a bug waiting to happen.
- Small functions, single responsibility, meaningful names.

## Dependencies

- Avoid adding dependencies and external services unless absolutely necessary.
- When a dependency is needed, prefer popular, well-maintained, free/open-source options.
- Never add a dependency for something the standard library can do adequately.

## Workflow

1. Understand the problem before writing code.
2. Search codebase for existing solutions before creating new ones.
3. Write the minimal code that works correctly.
4. Test before calling something done.

## Testing

- Every public function or module needs tests. Untested code is unfinished code.
- Test behavior, not implementation. Mock at boundaries.
- Follow Arrange/Act/Assert. One logical assertion per test.
- Tests live alongside the code they test. Mirror the source tree.

## Comments

- Prefer self-documenting code. Comments explain WHY, not WHAT.
- Never commit commented-out code. Delete it.
- Use doc comments for public APIs. Keep inline comments for non-obvious tradeoffs only.

## Architecture

- Keep it simple. Don't over-engineer.
- Favor composition over inheritance.
- Separate concerns: I/O, business logic, presentation.
- Use dependency injection for testability.

## Workshop

- This workspace is a project sandbox. Projects live under `projects/`.
- `.active-project` tracks the currently selected project. All work should target that project's directory.
- **Never read, reference, or copy code from other projects in `projects/`.** Each project is independent and projects differ massively in structure, style, and conventions. Only the active project is relevant.
- The Workshop dashboard runs at `http://localhost:3000` — start it with `node app/server.js`.

## Review

- Run `@reviewer` on all changes before merging.
- Use `@refactor` when duplication is found.
