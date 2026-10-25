---
description: Mandatory explicit approval before modifying any code files
---

# Code Modification Approval Rule

1. **Explicit Approval Required:** Never modify, edit, create, or delete any source code files (including `.js`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.html`, `.css`, `.json`, `.sql`) without first obtaining explicit approval from the user.
2. **Analysis First:** When asked to investigate, debug, or implement a feature:
   - Perform read-only inspections, diagnosis, or testing.
   - Explain the root cause and propose the exact changes/diffs to the user.
   - Wait for the user to explicitly approve (e.g., "theek hai", "approved", "change kar do") before applying any edits.
3. **Exceptions:** Scratch scripts stored exclusively in the IDE brain/artifact scratch directory (`<appDataDir>/brain/<conversation-id>/scratch/`) for read-only diagnostics are permitted, provided they do not alter repository or production files.
