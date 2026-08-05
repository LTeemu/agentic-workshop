# opencode-skill-creator (vendored)

Eval-driven skill creation workflow for OpenCode: draft → eval set → trigger
benchmarks → description optimization → review → install.

- **Source:** https://github.com/antongulin/opencode-skill-creator
- **Package:** `opencode-skill-creator` on npm
- **Vendored version:** 0.2.25
- **License:** Apache-2.0 — https://github.com/antongulin/opencode-skill-creator/blob/main/LICENSE

Vendored from the published npm tarball's `dist/skill/` directory so the
workflow instructions live in this repo (version-controlled), separate from
the plugin's own global auto-copy.

> **Precedence:** the plugin auto-copies its bundled skill to the user-global
> skills dir (`~/.config/opencode/skills/opencode-skill-creator/`) on startup.
> This project-scoped copy overrides that one, so keep edits here (not global).

The executable tools (`skill_eval`, `skill_optimize_loop`,
`skill_aggregate_benchmark`, `skill_generate_report`, `skill_serve_review`,
`skill_export_static_review`, ...) come from the `opencode-skill-creator` npm
plugin, registered (version-pinned) in `opencode.json`. The plugin runs eval
queries via `opencode run` subprocesses.

To update: re-extract from a newer published tarball (`npm pack
opencode-skill-creator`) and bump the version above.
