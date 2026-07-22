# Pipeline

Run this order before marking code changes as completed. Skip entirely if no code was changed.

> **Enforcement:** The plan-enforcer plugin blocks `Coder:` → completed
> for non-trivial items unless the reviewer subagent was called first.
> Mark trivial changes with `(trivial)` in the todowrite entry to skip.
> Only the review step is enforced; refactor, test, and fix are conventional
> (follow them when applicable, but not gated by the plugin).

> **How this relates to Task Planning (AGENTS.md):**  
> The coder's task planning runs **before** code changes (identifying which subagents and skills to use).  
> The pipeline steps fire **after** code changes (verification pass on the new code).  
> They are complementary phases — the pipeline is not redundant with the initial task plan.

## 1. Assess scope

Before running anything, assess the change:

- **Trivial change** (e.g., single-line toggle, comment fix, rename, CSS tweak) or **no files changed** -> skip the pipeline entirely. Note: the plugin blocks non-trivial Coder completion without review — append `(trivial)` to the todowrite entry to bypass.
- **No test suite exists** for the changed files (no `*.test.*` or `*.spec.*` files, no test script in package.json) -> skip step 4 (testing), but still run review if the change is non-trivial.
- **Non-trivial change with tests** -> run full pipeline.

## 2. Review (if applicable)

If the change is non-trivial, spawn the **reviewer** subagent (`task(subagent_type="reviewer")`) passing the files you changed.

## 3. Refactor (if needed)

If reviewer flagged any issues, spawn the **refactor** subagent (`task(subagent_type="refactor")`).

## 4. Test (if applicable)

Auto-detect the test command from project config files. Only run if tests exist for the changed files.

## 5. Fix (if needed)

If tests fail, fix and rerun tests.
