# Changelog

A changelog tells a reader what changed between versions, in their project's actual history. It must match reality: every entry traceable to a commit or code change.

## Ground truth first

- The current version comes from `package.json` (or the equivalent manifest), not from guessing.
- If git history is available, read it: `git log --oneline`, tags, and `git log <old-tag>..HEAD` for the unreleased window. Group commits by subject prefixes (`feat:`, `fix:`, `docs:`) when present; read diffs when unclear.
- When git history isn't available, use the facts the user provides (versions, dates, change lists) — reconcile them with the manifest and the code rather than inventing extra entries.

## Format (Keep a Changelog)

1. **`## [Unreleased]`** — changes since the last release, listed under category headings.
2. **`## [x.y.z] - YYYY-MM-DD`** — one section per released version, newest first, with a real date.
3. **Category headings** — use only the ones with content:
   - `### Added` — new features/endpoints/functions
   - `### Changed` — behavior changes
   - `### Fixed` — bug fixes
   - `### Removed` — removed behavior
   - `### Security` — security fixes
4. **Entries** — one line per change, imperative mood ("Add forecast endpoint", not "added forecast endpoint"), describing the user-visible effect. No line numbers, no commit hashes unless the project's convention includes them.

## Rules of thumb

- Link each entry to the change that caused it; if a change isn't in the history, don't invent it.
- If the manifest says `1.2.0` and history shows a prior release tag, that history defines the entries — reconcile the manifest with the tags rather than fabricating versions.
- `Deprecated` category only when code is actually deprecated.
- Keep the past intact: if a changelog exists, add to it — never rewrite or re-date prior entries.
- Never invent release dates. If the real date is unknown (no tag, no record, not given by the user), omit the date from the version heading — a missing date is honest; a wrong one is a lie. If you do use a date, state in the section how you know it.
