# Stage 7d — Bug Log

Record **every** defect found during development and testing, including the ones you fixed in five minutes. A well-kept bug log is evidence of real testing. Use the severities from [`07-test-strategy.md §7`](07-test-strategy.md).

**Status flow:** `New → In progress → Fixed → Verified` (or `Won't fix` / `Duplicate`, with a reason)

## Summary (update at the end)

| Severity | Found | Fixed | Open |
|---|---|---|---|
| Critical | | | |
| High | | | |
| Medium | | | |
| Low | | | |

## Bugs

| ID | Title | Severity | Found by (TC / exploratory / AI review) | Story | Steps to reproduce | Expected | Actual | Root cause | Fix (commit) | Regression test | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BUG-000 *(example: delete this row)* | Order accepted after 11:00 when server runs in UTC | High | TC-U-04 | US-09 | 1. Set clock to `2026-11-17T05:45:00Z` (11:15 IST) 2. POST order for 17 Nov | 409 `CUTOFF_PASSED` | 201 Created | `new Date().getHours()` used the server's UTC time | `a1b2c3d` fix(clock): compute cut-off in Asia/Kolkata [BUG-000] | TC-U-04 | Verified |
| BUG-001 | | | | | | | | | | | New |
| BUG-002 | | | | | | | | | | | |
| BUG-003 | | | | | | | | | | | |

## Writing a good bug entry

- **Title**: what is wrong and where, e.g. "Pickup code with lower-case letters rejected at counter". Avoid titles like "scan broken".
- **Steps**: numbered, minimal, with exact data (user, item, time, code).
- **Root cause**: one line. Judges value knowing *why*, not just *what*.
- **Regression test**: every fixed bug must have a test ID that would fail if the bug came back.
- If the bug came from AI-generated code, also log it in [`06-ai-prompt-journal.md`](06-ai-prompt-journal.md) under *AI mistakes caught*.
