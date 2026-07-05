---
name: pr-status
description: >-
  Show a ranked status dashboard of my open and draft pull requests — CI
  pass/fail, review & gate state, mergeable/conflict/behind, draft flag, and
  staleness — sorted so the ones needing my attention float to the top. Defaults
  to the repo of the current working directory; pass `--all` for every repo I
  have PRs in org-wide. Use this whenever I ask about the state of my PRs, e.g.
  "check my PRs", "PR status", "how are my PRs doing", "which of my PRs are ready
  to merge", "do any of my PRs have failing CI", "any of my PRs have conflicts",
  "my open PRs", "my draft PRs", or before I sit down to clear my PR queue. This
  is a read-only multi-PR overview — NOT the same as watch-pr (which monitors one
  specific PR and fixes it), and NOT create-pr. Prefer this skill any time the
  request is about the status of more than one of my PRs.
disable-model-invocation: false
user-invocable: true
argument-hint: "[--mine] [--all] [--repo <name>]"
---

# PR Status

A read-only dashboard of the user's open/draft pull requests. One GraphQL call →
an attention-ranked table. The script does all the fetching, ranking, and
rendering; your job is to run it and present the result.

## Run it

```bash
bun ~/.claude/skills/pr-status/scripts/pr-status.ts
```

**Default scope is the repo of the current working directory** (detected via
`gh repo view`). Run it from within the project the user is asking about. Add
`--all` to widen to every repo the user has PRs in, or `--repo <name>` to target
a different single repo. If the cwd isn't a GitHub repo, it falls back to all
repos.

To keep personal/side-project repos out of the dashboard, set the
`PR_STATUS_EXCLUDE` environment variable to a comma-separated list of repo names
(e.g. `export PR_STATUS_EXCLUDE=my-side-project,another-repo` in your shell
profile). The script reads it from the environment, so no repo names are stored
in this skill. Matches either a bare repo name or a full `owner/name`.

Optionally, set `PR_STATUS_REVIEW_GATE` to the login of a bot/reviewer that acts
as a required review gate (e.g. an org's automated review bot). When that
reviewer is still a pending requested reviewer on a PR, the Review column shows
`· gate` and the next action becomes "review gate pending". Unset by default —
no org-specific reviewer name lives in this skill.

Then **paste the script's Markdown output verbatim into your reply** — it is a
ready-to-render GFM table with a one-line summary and a legend. Don't rebuild
the table yourself; the script already ranked and formatted it. Add at most a
one-line headline (e.g. "1 ready to merge, 3 need a fix") if it helps.

## Flags

| Flag            | Effect                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| _(none)_        | Scope to the current directory's repo. Two sections: **My open PRs** (authored + assigned) and **Awaiting your review** (review-requested). |
| `--all`         | Widen from the current repo to every repo the user has PRs in, org-wide.                                                                    |
| `--mine`        | My PRs only; skip the "Awaiting your review" section.                                                                                       |
| `--repo <name>` | Scope to a specific repo instead of the current one (matches `owner/name` or bare `name`, e.g. `--repo my-repo`).                           |

## How to read the table

The **My open PRs** table is sorted so the most actionable rows are on top:

1. ✅ **ready to merge** — approved, CI green, mergeable clean, not draft
2. **needs a fix** — CI failing, merge conflict, or changes requested
3. **needs rebase** — branch is behind its base
4. **waiting** — review gate pending, awaiting review, or CI still running
5. 📝 **draft**

Column meanings:

- **Branch**: `head → base` — the PR's own (current) branch and the branch it merges into. The base reveals stacked PRs (a parent feature branch) and release targets (`release/*`).
- **CI**: ✅ pass · ❌ fail · ⏳ running · `–` no checks configured.
- **Review**: `✅ N` approvals · `🔴 changes` requested · `⏳ review` required · `· gate` = the configured review-gate reviewer (`PR_STATUS_REVIEW_GATE`) is still a pending reviewer.
- **Merge**: `✅ clean` · `🟠 behind` (rebase needed) · `🔴 conflict` · `🚧 blocked` (a required check/review is blocking) · `⚠️ unstable` (mergeable but a non-required check is red) · `· ?` (GitHub hasn't computed it yet — re-run to resolve).
- **Age**: time since last update; `⏰` marks PRs stale >7 days.

Rows are still ranked most-actionable-first (ready to merge → broken → behind →
waiting → draft); that ordering drives the sort and the one-line summary even
though the per-row action text is no longer shown as a column.

## Follow-ups

The user may ask a deeper question after seeing the table ("why is #123 blocked?",
"what CI check is failing on #456?"). Get the details straight from GitHub with
`gh pr view <n> --repo <owner/name>` or `gh pr checks <n> --repo <owner/name>`
rather than guessing.

To actually _do_ something about a PR (fix CI, reply to reviews, monitor it),
that's a different tool: `watch-pr` monitors and fixes a single PR autonomously.
Point the user there rather than acting from this skill.

## Notes

- Auth is `gh` (GitHub CLI). If it prints an auth error, the user needs `gh auth login`.
- `· ?` in the Merge column means GitHub is still computing mergeability; a second
  run a few seconds later usually resolves it to clean/conflict/behind.
- The search caps at 50 PRs per bucket (authored / assigned / review-requested) —
  more than enough in practice, but note it if the user has an unusually large queue.
