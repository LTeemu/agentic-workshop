# Active Project Scope

Determines which directory to work in.

## Priority Order

1. **User override** — If the user explicitly specifies a path or scope, use that.
2. **Workshop infrastructure** — If working outside `projects/` entirely (e.g. `app/`, `.opencode/`, root config files), scope is the **workspace root** (ignore `.active-project`).
3. **`.active-project`** — Otherwise, read it at the workspace root. It contains a path like `projects/project-name`. Scope all file operations there. Validate the resolved path stays within the workspace root before proceeding.
4. **Uncertain** — If `.active-project` doesn't exist, is empty, or the scope is still unclear, ask the user which project to work on.

## Isolation Rule

When working within a specific project directory, never read, reference, or copy code from other projects in `projects/`. Each project is independent and may use entirely different styles, patterns, and dependencies.
