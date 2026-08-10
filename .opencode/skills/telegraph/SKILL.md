---
name: telegraph
description: Token-efficient agent communication protocol. Eliminates communication overhead. For multi-agent systems, tool chains, high-frequency loops.
modes: [minimal, selective, none]
default: selective
---

# Telegraph Protocol

## Modes

| Mode        | Rule                                                                                    |
| ----------- | --------------------------------------------------------------------------------------- |
| `minimal`   | Fragments only. Paths, values, errors, codes. Must produce visible output—never silent. |
| `selective` | Full sentences. No filler, no hedging.                                                  |
| `none`      | Full prose. All qualifiers. Explicit reasoning.                                         |

**Mode triggers.** These are invoked by the orchestrator or explicit instruction, not inferred:

- `none` required for: destructive operations, authentication changes, payment handling, PII processing, policy enforcement, handoff prompts.
- `minimal` preferred for: sub-agent responses, tool chain outputs, batch results, search hits, status checks.

## Rules

**Clarity first, brevity second.** Compression is a default, not a mandate. If any agent or human could misread the message, the message failed — escalate to `selective` or `none` rather than risk ambiguity.

**Human-readable.** Even `minimal` output must be understood by someone unfamiliar with the protocol. Short passes, cryptic fails: "cfg" fails, "config" passes; "usr/auth" passes, "u/a" fails.

**Never silent.** Every response must contain visible output. `minimal`: "ok", "done.", "fail:", "empty.", "0 results." `selective`/`none`: state what happened or didn't.

**Result first.** Lead with outcome, path, value, or error. Reasoning after, only in `none` mode. Internal reasoning is unaffected—this applies to what you output.

**Tool communication.** How you report tool outcomes:

- Fire independent tools simultaneously. No "Let me check" before acting.
- Failure: `minimal` → "EACCES /etc/shadow:13. rerun with sudo." `selective` → "Permission denied on /etc/shadow line 13. Requires elevated privileges." `none` → Full error, recovery steps, escalation.
- Raw output: never echo verbatim unless explicitly asked. Extract signal. If output exceeds ~200 words, truncate and mark `[truncated]`.

**Handoffs.** When sending tasks to other agents, use `none` mode for the prompt itself. Always include output reference or error: "done. id=4532." / "fail: id=4532, EACCES."

## Never Drop

`not` `never` `no` `null` `undefined` `false` `error` `failed` `denied`

Be exact: numbers, timestamps, durations, IDs, hashes. No rounding.

## Uncertainty

- `minimal`: `?` suffix on uncertain values. `CONFLICT` if sources disagree. `empty.` if no results.
- `selective`/`none`: "Unconfirmed:", "Low confidence:", "No results found."

## Never Do

- Invent new abbreviations. "config" not "cfg"—same length to the system, less clear to humans. Standard acronyms (EACCES, API, HTTP, ID, etc.) are permitted.
- Preamble ("Let me check", "I found", "The following")
- Narrate upcoming actions
- Emojis, ascii tables, decorative separators
- Switch modes mid-response

## Persistence Boundary

This protocol governs communication channels only: chat responses, tool outputs, handoff messages, response streams. Never apply to files, commits, documentation, or configuration. Written artifacts always use full prose.

## Quick Reference

minimal: result. path. value. error. never silent.
selective: sentences. no filler. never silent.
none: full prose. all qualifiers. never silent.
