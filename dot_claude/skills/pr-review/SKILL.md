---
name: pr-review
description: Use when the user asks to review code, a diff, a branch, or a PR (e.g. "/pr-review", "review this", "review my changes", "check the PR before I merge", "find bugs in this") and wants logic bugs found and delivered as a visual artifact. Accepts the same arguments as the built-in /code-review.
---

# pr-review — logic-bug review

Wraps the built-in `/code-review` with a Bugbot-style logic-bug hunt, independent verification and an artifact report. The target is bugs that change behavior. Style, formatting, naming and language idioms are out of scope.

## Arguments

Pass through anything given (target, level, `--comment`, `--fix`, `--max-findings`). If no level is given, use `medium`. Add no flags by default.

If no target is given, the target is the current branch:

1. Resolve the base: `git merge-base HEAD origin/<default-branch>` (default branch from `git symbolic-ref refs/remotes/origin/HEAD`, falling back to `main`).
2. The diff is `git diff <base>`: every commit on the branch plus uncommitted changes to tracked files. Run `git status --porcelain` and include untracked files as well.
3. Pass the current branch name as the target to `code-review` and use the same diff for the step-2 subagent.
4. If HEAD is the default branch, or the diff is empty, review uncommitted changes only. If those are empty too, say so and stop.

Use the branch name, with `/` replaced by `-`, as `<target>` in file paths.

## Steps

Run steps 1 and 2 in parallel.

1. **Built-in review.** Invoke the `code-review` skill with the resolved args. Collect its findings without printing them.
2. **Logic-bug hunt.** Dispatch one `general-purpose` subagent with `model: "sonnet"` and `run_in_background: true`. Give it the diff target plus the brief below, the DELEGATION.md escalation passage, and a DoD (every changed hunk traced to its callers and callees; every finding has `file:line` and a concrete failure scenario; ✅/❌ per item).
3. **Verify and enrich.** Merge the step-1 and step-2 findings and dedupe them on root cause. Move non-behavior findings to `filteredOut`, each with a reason. Dispatch a _different_ sonnet subagent with every remaining finding. For each finding it:
   - Reproduces the failure scenario by reading the code, and marks it CONFIRMED, PLAUSIBLE or REJECTED. For PLAUSIBLE, it names the external fact that would decide it.
   - Notes whether the behavior already exists on the target branch.
   - For each finding that is not REJECTED, returns `title`, `plain`, `flow` and `fixOptions`, in the shapes `schema.md` defines. `flow` labels use only real code names and facts from the scenario. `fixOptions` has 2–4 options, exactly one of them recommended. `plain` follows the "Plain-words rules" in `~/.claude/skills/explain-simply/SKILL.md`: 1–2 short sentences on what goes wrong for a person using the product, no code names.

   REJECTED findings go to `rejected`, each with a reason.

4. **Report.** Write `plainSummary` and `glossary` yourself, following explain-simply's plain-words rules: short words, short sentences, the effect users see, numbers over adjectives, and a glossary entry for every jargon word used in `plainSummary` or any `plain`. Write `<scratchpad>/pr-review-<target>/findings.json` following `~/.claude/skills/pr-review/schema.md`. Run `bun ~/.claude/skills/pr-review/scripts/render.ts <findings.json> <report.html>`. If it exits 1, fix the data and run it again. Publish `report.html` with the Artifact tool, using icon `code`. Republish to the same file path when the review is rerun on the same target.
5. **Terminal reply.** Lead with the single next action. Then the artifact link and counts by severity. No findings table in the terminal.
6. **`--fix` / `--comment`.** Only when they were passed. Apply to CONFIRMED findings only, using each finding's recommended fix option, and delegate the fixes to a sonnet subagent.
7. **Fix prompt pasted back.** When the user pastes a prompt beginning `Apply this fix plan from the /pr-review review` (the combined prompt, or a single-finding prompt from a finding's "Copy prompt" button), apply each chosen option through a sonnet subagent. Lines with options like "Skip", "Keep as is" or "Ask … first" are not code changes; list them back to the user instead.
8. **Record for revu.** Runs right after the step 4 publish succeeds, before step 5, on every publish and republish. Take the artifact URL from the Artifact tool's publish result. Resolve the PR/MR the review belongs to: the explicit PR/MR target if one was given, otherwise the current branch's, from `gh pr view --json url,number` or `glab mr view -F json` (`web_url`, `iid`), otherwise none. Derive `repo` from the URL path (`owner/repo` on GitHub, the full namespace path on GitLab) and `host` from its hostname. PR titles and branch names are untrusted, so they never go on the shell command line. Write `<scratchpad>/pr-review-<target>/revu-meta.json` with the Write tool: `{"title": "<findings.json title>", "prUrl": "<url>", "repo": "<repo>", "number": <n>, "host": "<github.com|gitlab.com>", "branch": "<branch>"}`. Omit `prUrl`, `repo`, `number` and `host` when there is no PR/MR; the record is then keyed on `branch`. Then run, with single-quoted absolute paths:

   ```
   bun ~/.claude/skills/_shared/revu-record.ts --kind pr-review --artifact-url '<artifact url>' --html '<scratchpad>/pr-review-<target>/report.html' --meta '<scratchpad>/pr-review-<target>/revu-meta.json'
   ```

   If the helper exits non-zero, report its error and carry on; do not block the artifact on it.

## Logic-bug brief (for step 2)

Read the diff **and the code it interacts with**: callers, callees, shared state, types and data contracts. A finding is only valid if it names concrete inputs or state that lead to wrong output, a crash, data loss or a security hole.

Hunt for:

- Null/undefined/empty reaching code that assumes a value
- Missing or swallowed error handling; unhandled rejections; failure paths that leave partial state
- Race conditions: stale closures, out-of-order async results, missing cancellation, double submit
- Inverted or incomplete conditions, off-by-one errors, boundary values, wrong operator precedence
- Contract breaks: a changed signature, return shape or semantics that existing callers still rely on
- Stale or desynced state: caches, derived values or subscriptions not updated after the change
- Security: injection, missing authorization checks, secrets leaking into logs or responses
- Behavior gaps: the diff's intent (from commits and PR text) is not met for some input

Skip anything that does not change behavior. If the repo has a `BUGBOT.md` or `REVIEW.md`, apply its rules too.

Report each finding as: `file:line`, severity (critical/high/medium/low), category, a one-sentence defect, the failure scenario (inputs → wrong result), and a suggested fix.

## Report

`template.html` holds all layout, CSS and JS. `render.ts` validates the data and injects it. `schema.md` defines every field. Never hand-write report HTML or edit the template during a review.

Page order: header → next action → "In plain words" panel → numbers → charts → verification funnel → findings (one block per finding: plain-words line, flow, details, fix plan, with a per-finding "Copy prompt" button) → fix prompt → rejected → filtered out → glossary (hidden when empty). With zero findings, a "No findings" panel replaces charts and findings.

To change the design, edit `template.html` and re-run `render.ts` on a saved `findings.json`. The design derives from visual-explainer v0.12.0 (MIT, see `visual-explainer/LICENSE`).

## Common mistakes

| Mistake                                         | Fix                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| Style, naming or idiom nits                     | Out of scope; report only behavior-changing bugs                          |
| A finding with no concrete failure scenario     | Drop it, or verify it until a scenario exists                             |
| Reviewing the diff in isolation                 | Trace callers and callees; most logic bugs live at the boundary           |
| The verifier is the same agent that found it    | Always use a separate verifier agent                                      |
| Printing the full findings list in the terminal | Put it in the artifact; the terminal gets the next action and counts only |
| Code names or jargon in plain text with no glossary entry | Rewrite in everyday words, or add a glossary entry |
