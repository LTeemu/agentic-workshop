---
name: documentation
description: "Write and improve technical documentation: READMEs, API references, user guides, changelogs/release notes, and code-level docs (JSDoc, docstrings). Use this skill whenever the user asks to write, fix, expand, or update any documentation — even if they do not say the word documentation. 'write a README', 'document my API', 'document the endpoints', 'add JSDoc / docstrings', 'update the changelog', 'write release notes', 'write a setup guide', 'explain how to use this project', 'make a user guide'."
risk: safe
source: workshop
date_added: 2026-08-06
tags: [documentation, docs, readme, changelog, api-reference, user-guide, docstrings]
tools: [opencode, claude, cursor, gemini]
---

# Documentation

You write developer-oriented documentation. Developers read docs to answer a question fast: how do I install this, how do I use this, what does this endpoint take, what changed. Accuracy beats prose every time.

## Core principles

1. **Ground everything in the code.** Read the actual files (source, `package.json`, config, tests, git log) before writing a single line. Every command, flag, endpoint, option, and behavior must come from what the code actually does. Never invent or guess behavior, defaults, or examples.
2. **Verify examples.** If shown, an example must work. Check the code path it exercises — parameter names, return shapes, required fields — and adjust until it is copy-pasteable.
3. **Write for the question, not for completeness.** Each doc answers the questions its readers actually have (see variant references). Leave out marketing fluff and restated sentences.
4. **DOC comments are a last resort**, and only "why", never "what" — that guidance lives in `references/code-docs.md`.
5. **Don't trust existing docs either.** If docs exist, they may have drifted from the code. Flag anything you had to correct.

## Choose the variant

Match the request to a document type. When the request touches several types, read the references for each.

| User asks for                                                      | Document type   | Read                          |
| ------------------------------------------------------------------ | --------------- | ----------------------------- |
| Project overview, "write a README", setup/install/usage            | README          | `references/readme.md`        |
| Endpoint docs, "document my API", request/response details         | API reference   | `references/api-reference.md` |
| Step-by-step how-tos, "how do I", setup walkthrough                | User guide      | `references/user-guide.md`    |
| Release notes, "update the changelog"                              | Changelog       | `references/changelog.md`     |
| Code documentation, "add JSDoc/docstrings", "document this module" | Code-level docs | `references/code-docs.md`     |

If the request is ambiguous (e.g. "document this project"), ask one question: who reads this, and what do they need to do with it? Then choose accordingly.

## Workflow

1. **Identify the variant** and read its reference file.
2. **Gather ground truth**:
   - README/guide: `package.json` (name, version, scripts, bin, deps), entry points, environment variables, CLI flags.
   - API reference: route definitions, validation, error handling, response shapes.
   - Changelog: `git log` / commit history, tags, version-bumping conventions.
   - Code docs: the public exports and function signatures of the module.
3. **Draft** following the variant reference.
4. **Verify** — re-read each example against the source; fix anything that wouldn't work.
5. **Save where the user expects**: README stays at the project root; guides/API docs go in `docs/` (or ask); changelog at `CHANGELOG.md`. If asked to update existing docs, keep their structure where it works and reconcile them with the code.

## Common failure modes to avoid

- Documenting a flag, endpoint, or env var that doesn't exist (drift in the output).
- Copy-pasting shell sessions that don't actually run.
- Showing a response shape that doesn't match what the code returns.
- Restating code in prose instead of adding what the code doesn't show (usage, semantics, edge cases, errors).

## References

- `references/readme.md` — README structure and contents
- `references/api-reference.md` — endpoint-by-endpoint reference format
- `references/user-guide.md` — task-oriented tutorial format
- `references/changelog.md` — Keep-a-Changelog format and versioning
- `references/code-docs.md` — docstrings, JSDoc, and comments
