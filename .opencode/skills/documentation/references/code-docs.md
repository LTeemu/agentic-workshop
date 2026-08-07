# Code-level docs

Code docs cover docstrings/JSDoc and comments. The reader is a developer editing the code later — the doc must survive contact with the codebase for months.

## Ground truth first

- Read the actual function signatures, return statements, thrown errors, and edge-case branches before documenting.
- Never document behavior the code doesn't have.

## Docstrings / JSDoc

Document the **public API** of a module: exported functions, classes, and options objects. Private helpers get a comment only when the name isn't enough.

For each public function, cover:

- **What it does** — one sentence, not a restatement of the name.
- **`@param`** — name, type, and meaning, plus constraints ("must be a 2–30 char string"). Match the real parameter names.
- **`@returns`** — type and meaning, including what the code actually returns on edge cases (e.g. `null` for missing data).
- **`@throws` / errors** — what failures can happen and when.
- **Example** — a short usage snippet, only when the call shape is non-obvious. Verify it compiles against the signature.

The docstring is complete when a developer can call the function correctly without reading its body.

## Comments

- Explain **why**, never **what**. The code already says what it does; a comment that repeats it rots faster than the code it describes.
- Reserve comments for: non-obvious invariants, workarounds, performance rationale, and decisions that look wrong without context.
- Don't comment out code — delete it. History is for version control.

## Rules of thumb

- Match the language's convention: JSDoc for JS/TS, `"""..."""` for Python, `///` for Rust, `/** */` for Go.
- When the signature changes, the docstring changes with it — re-verify `@param`/`@returns` against the new code.
- Types in docstrings must match the code; if types are already in the signature (TS), don't repeat them in prose.
