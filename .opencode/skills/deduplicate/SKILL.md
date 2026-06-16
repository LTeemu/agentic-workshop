---
name: deduplicate
description: Use when the user asks about duplicate code detection, DRY violations, or wants to clean up repeated code patterns in the codebase.
---

# Duplicate Code Detection

Helps identify and eliminate duplicate code systematically.

## Detection Strategy

| Type       | Description                            | Min threshold           | Action                        |
| ---------- | -------------------------------------- | ----------------------- | ----------------------------- |
| Exact      | Identical blocks (ignoring whitespace) | 5+ lines, 2+ locations  | Extract to function           |
| Near       | Differs only in names/types/formatting | 8+ lines, 2+ locations  | Extract with parameterization |
| Structural | Same control flow on different data    | 10+ lines, 3+ locations | Introduce abstraction         |
| Conceptual | Same logic implemented differently     | 2+ implementations      | Consolidate                   |

## Refactoring Techniques

- **Extract Function**: Move repeated block into a named function. Most common fix.
- **Extract Module**: Group related extracted functions into a module or class.
- **Parameterize**: Generalize duplicated blocks with parameters instead of copying and tweaking.
- **Pull Up**: Move duplicate code in subclasses to the base class.
- **Template Method**: Define an algorithm skeleton, let subclasses fill in details.
- **Strategy Pattern**: Replace conditional-heavy duplication with strategy objects.

## Prevention Checklist

When adding new code:

1. Grep for related terms — is there existing code that does this?
2. Check existing utilities, helpers, and base classes before writing new ones.
3. If adding similar functionality to existing code, extend rather than copy-paste.
4. If you must write similar code, extract the shared part immediately — before the third occurrence.
