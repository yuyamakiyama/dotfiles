---
name: pr-review
description: Use when the user asks to review code, a diff, a branch, or a PR (e.g. "/pr-review", "review this", "review my changes", "check the PR before I merge", "find bugs in this") and wants logic bugs found and delivered as a visual artifact. Accepts the same arguments as the built-in /code-review.
---

# pr-review — logic-bug review

Wraps the built-in `/code-review` with a Bugbot-style logic-bug hunt, independent verification and an artifact report. The target is bugs that change behavior. Style, formatting, naming and language idioms are out of scope.

## Arguments

Pass through anything given (target, level, `--comment`, `--fix`, `--max-findings`). If no level is given, use `medium`. Add no flags by default.

## Steps

Run steps 1 and 2 in parallel.

1. **Built-in review.** Invoke the `code-review` skill with the resolved args. Collect its findings without printing them.
2. **Logic-bug hunt.** Dispatch one `general-purpose` subagent with `model: "sonnet"` and `run_in_background: true`. Give it the diff target plus the brief below, the DELEGATION.md escalation passage, and a DoD (every changed hunk traced to its callers and callees; every finding has `file:line` and a concrete failure scenario; ✅/❌ per item).
3. **Verify and enrich.** Merge the step-1 and step-2 findings and dedupe them on root cause. Move non-behavior findings to `filteredOut`, each with a reason. Dispatch a _different_ sonnet subagent with every remaining finding. For each finding it:
   - Reproduces the failure scenario by reading the code, and marks it CONFIRMED, PLAUSIBLE or REJECTED. For PLAUSIBLE, it names the external fact that would decide it.
   - Notes whether the behavior already exists on the target branch.
   - For each finding that is not REJECTED, returns `title`, `flow` and `fixOptions`, in the shapes `schema.md` defines. `flow` labels use only real code names and facts from the scenario. `fixOptions` has 2–4 options, exactly one of them recommended.

   REJECTED findings go to `rejected`, each with a reason.

4. **Report.** Write `<scratchpad>/pr-review-<target>/findings.json` following `~/.claude/skills/pr-review/schema.md`. Run `bun ~/.claude/skills/pr-review/scripts/render.ts <findings.json> <report.html>`. If it exits 1, fix the data and run it again. Publish `report.html` with the Artifact tool, using icon `code`. Republish to the same file path when the review is rerun on the same target.
5. **Terminal reply.** Lead with the single next action. Then the artifact link and counts by severity. No findings table in the terminal.
6. **`--fix` / `--comment`.** Only when they were passed. Apply to CONFIRMED findings only, using each finding's recommended fix option, and delegate the fixes to a sonnet subagent.
7. **Fix prompt pasted back.** When the user pastes a prompt beginning `Apply this fix plan from the /pr-review review`, apply each line's chosen option through a sonnet subagent. Lines with options like "Skip", "Keep as is" or "Ask … first" are not code changes; list them back to the user instead.

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

Page order: header → next action → numbers → charts → verification funnel → findings (one block per finding: flow, details, fix plan) → fix prompt → rejected → filtered out. With zero findings, a "No findings" panel replaces charts and findings.

To change the design, edit `template.html` and re-run `render.ts` on a saved `findings.json`. The design derives from visual-explainer v0.12.0 (MIT, see `visual-explainer/LICENSE`).

## Common mistakes

| Mistake                                         | Fix                                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------- |
| Style, naming or idiom nits                     | Out of scope; report only behavior-changing bugs                          |
| A finding with no concrete failure scenario     | Drop it, or verify it until a scenario exists                             |
| Reviewing the diff in isolation                 | Trace callers and callees; most logic bugs live at the boundary           |
| The verifier is the same agent that found it    | Always use a separate verifier agent                                      |
| Printing the full findings list in the terminal | Put it in the artifact; the terminal gets the next action and counts only |
