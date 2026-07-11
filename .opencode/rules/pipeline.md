# Pipeline

Run this order after completing code changes. Skip entirely if no code was changed.

## 1. Assess scope

Before running anything, assess the change:

- **Trivial change** (e.g., single-line toggle, comment fix, rename, CSS tweak) -> skip the pipeline entirely.
- **No test suite exists** for the changed files (no `*.test.*` or `*.spec.*` files, no test script in package.json) -> skip step 3-4 (testing), but still run review if the change is non-trivial.
- **Non-trivial change with tests** -> run full pipeline.

## 2. Review (if applicable)

If the change is non-trivial, invoke `@reviewer` passing the files you changed.

## 3. Refactor (if needed)

If reviewer flagged any issues, run `@refactor`.

## 4. Test (if applicable)

Auto-detect the test command from project config files. Only run if tests exist for the changed files.

## 5. Fix (if needed)

If tests fail, fix and rerun tests.
