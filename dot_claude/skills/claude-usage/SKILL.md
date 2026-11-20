---
name: claude-usage
description: >-
  Show my Claude Code usage for the last 7 days versus the previous 7 as one
  short table: est. cost, tokens, total / interactive / SDK sessions, cost per
  model family, and peak day, each with a % change. Reads local transcripts in
  ~/.claude/projects (covers interactive CLI, `claude -p`, and Agent SDK runs on
  this Mac). Use when I ask "my Claude usage", "how much did I spend on Claude",
  "weekly usage report", "token usage this week", or invoke /claude-usage.
  Optional arg: an end date YYYY-MM-DD (defaults to today).
---

# Claude Usage

Run the script and print its table verbatim. No preamble, no recap.

```bash
bun ~/.claude/skills/claude-usage/scripts/report.ts [YYYY-MM-DD]
```

After the table, add at most 2 one-line observations, only if they are notable
(e.g. one model family drove most of the change, or sessions fell while cost
rose). Skip them if nothing stands out.

## What the numbers mean

- **Cost** is ccusage's API-equivalent estimate, not an actual bill.
- **Tokens** include cache reads, which dominate the total.
- **Sessions** are unique session IDs with usage in the window. Interactive =
  `entrypoint: cli`; SDK/headless = `sdk-ts`, `sdk-py`, `sdk-cli`. A session
  spanning both weeks counts in both.
- **Not covered:** SDK runs with `persistSession: false`, direct Messages API
  calls, other machines, CI, and cloud routines.

If the script fails, show the error output as-is and stop.
