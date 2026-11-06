---
name: where-was-i
description: Use when the user wants to resume or re-orient on a ticket or branch (e.g. "where was I", "resume", "catch me up on this ticket", "what's the state of this branch", "/where-was-i"). Reads the ticket notes file, branch commits, working tree, PR/MR state and revu records, then prints a 10-line Done / In flight / Next / Open decisions summary. Read-only.
---

# where-was-i — resume a ticket in 10 lines

Read-only. Never edit, create or delete files, and never run a command that changes git, PR/MR or notes state.

## Gather

Run these in the current repo, in parallel where possible. Skip any source that is missing and say so only if it changes the answer.

1. **Notes file.** `bun ~/.claude/hooks/notes-path.ts` prints the path. Read it with the Read tool. If the script or file is missing, note "no notes file".
2. **Branch history.** Resolve the default branch from `git symbolic-ref refs/remotes/origin/HEAD`, falling back to `main`. Then `git log --oneline $(git merge-base HEAD origin/<default>)..HEAD`.
3. **Working tree.** `git status --short`.
4. **PR/MR state.** Pick the tool from `git remote get-url origin`: github.com → `gh pr view --json url,number,state,isDraft,reviewDecision,statusCheckRollup`; a GitLab host → `glab mr view`. Skip when the command reports no PR/MR for the branch.
5. **revu records.** Read `~/.local/share/revu/artifacts.jsonl` (one JSON object per line). Keep records whose `ticketKey` equals this ticket's key or whose `prUrl` equals the PR URL from step 4. The ticket key comes from the notes file title or the branch name. A missing file means no records.

## Output

Print at most 10 lines in the terminal, nothing else:

```
**Done:** …
**In flight:** …
**Next:** <one concrete action>
**Open decisions:** …
```

- **Done:** commits and PR/MR milestones already landed, plus decisions the notes file records.
- **In flight:** uncommitted changes, open review threads or failing checks, a quiz not yet passed.
- **Next:** exactly one action the user can take now (a command, a file to open, a question to answer).
- **Open decisions:** unresolved items from the notes file, unanswered kickoff questions, deviations needing sign-off. Write "none" when empty.

Cite `path:line` or the commit hash where it helps. Do not pad: a source with nothing to say contributes nothing.
