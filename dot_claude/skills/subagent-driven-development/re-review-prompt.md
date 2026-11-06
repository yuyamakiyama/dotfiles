# Scoped Re-Review Prompt Template

Use this template when dispatching a re-review after a fix round. The
re-reviewer verifies the findings were addressed and checks the fix diff for
new breakage. It is not a fresh review — the full review already happened.

**Purpose:** Verify each finding from the previous review was addressed, and
that the fix itself broke nothing.

```
Agent (subagent_type: general-purpose):
  description: "Re-review Task N fix round R"
  model: sonnet
  run_in_background: true
  prompt: |
    You are re-reviewing one task's fix round. A previous review produced
    findings; an implementer has attempted to fix them. Your job is to
    verdict each finding and inspect the fix diff — nothing else.

    ## Delegation Contract (from ~/.claude/DELEGATION.md)

    Original ticket / user brief: [TICKET_AND_BRIEF]
    Notes file: [NOTES_FILE]

    [ESCALATION_PASSAGE — copy verbatim from the "Subagent Escalation Duty"
    section of ~/.claude/DELEGATION.md]

    You are execution-only. If a Blocking matter is unclear, stop and return
    it as a question (4 parts: what is unclear, options, benefit and risk of
    each, your recommendation). Reversible and local matters: choose the
    most conservative option and log it under "Deviations from plan".

    ## Definition of Done

    [DOD — 3-5 verifiable conditions]

    ## Required Report Sections

    Your single final report must contain all of these, or it is rejected:
    1. **Result**
    2. **DoD check** — each DoD condition marked ✅ / ❌ / unverified against measured reality
    3. **Decisions and assumptions**
    4. **Deviations from plan**
    5. **What the checks don't prove**

    ## The Task

    Read the task brief. From the repo root, run
    `bash ~/.claude/skills/subagent-driven-development/scripts/task-brief [PLAN_FILE] [N]`
    (same output file the implementer worked from) and read the path it prints.

    ## The Findings Under Verification

    [FINDINGS]

    ## The Fix

    Read the implementer's report (fix reports are appended at the end):
    [REPORT_FILE] (= [WORKSPACE]/task-N-report.md)
    Workspace: [WORKSPACE]

    **Fix base:** [FIX_BASE_SHA] (the head the previous review saw)
    **Head:** [HEAD_SHA]
    **Diff file:** from the repo root, run
    `bash ~/.claude/skills/subagent-driven-development/scripts/review-package [PLAN_FILE] [FIX_BASE_SHA] [HEAD_SHA]`
    and use the path it prints.

    Read the diff file once — it contains the fix commits, a stat summary,
    and the fix diff with surrounding context. Do not re-run git commands.
    If the diff file is missing, fetch the diff yourself:
    `git diff --stat [FIX_BASE_SHA]..[HEAD_SHA]` and
    `git diff [FIX_BASE_SHA]..[HEAD_SHA]`.

    Your review is read-only on this checkout. Do not mutate the working
    tree, the index, HEAD, or branch state in any way.

    ## You Do Not Dispatch Subagents

    Do all of this review yourself. Never spawn a subagent to review part
    of the diff, and never spawn another reviewer for a second opinion.
    This process already provides every review seat the work gets; a
    reviewer you spawn duplicates one of them at full cost, and its
    verdict counts for nothing. If the diff feels too large for one
    pass, review it in passes yourself and say so in your report.

    ## Scope

    Your scope is the findings list and the fix diff. Verdict every finding.
    Inspect the fix diff for new problems the fix itself introduced. Do NOT
    re-review code the fix did not touch: if you notice an issue entirely
    outside the fix diff, report it under Out-of-Scope Observations — it
    does not block this task and does not extend the loop. A broad
    whole-branch review happens after all tasks are complete.

    ## Tests

    The implementer re-ran the tests covering the amended code and appended
    the results to the report file. Treat the report as unverified claims:
    confirm the fix report names the covering tests and shows their output,
    and verify the claims against the diff. Do not re-run the suite to
    confirm their report. Run a test only when reading the code raises a
    specific doubt that no existing run answers — and then a focused test,
    never a package-wide suite.

    ## Output Format

    Your final message is the report itself and must also carry the Required
    Report Sections (the DoD check covers your review conditions). Begin
    directly with the first finding's verdict. Every line is a verdict, a finding with file:line,
    or a check you ran — no preamble, no process narration.

    ### Finding Verdicts

    For each finding in The Findings Under Verification, in order:
    - **[finding one-liner]** — ADDRESSED | NOT ADDRESSED, with file:line
      evidence. "Attempted" is not addressed: the specific defect must no
      longer exist.

    ### New Breakage in the Fix Diff

    Anything the fix itself broke or introduced, with severity
    (Critical/Important/Minor) and file:line. "None" if clean.

    ### Out-of-Scope Observations

    Issues you noticed entirely outside the fix diff. Non-blocking; the
    controller ledgers these for the final review. "None" if none.

    ### Verdict

    **Fix round:** [All findings addressed, no new Critical/Important
    breakage | Findings remain open] — list the open ones.
```

**Placeholders:**
- `[TICKET_AND_BRIEF]`, `[NOTES_FILE]`, `[ESCALATION_PASSAGE]`, `[DOD]` — the delegation contract slots (see SKILL.md, DELEGATION.md Overrides)
- `[PLAN_FILE]`, `[N]` — the plan path and task number; the re-reviewer runs
  `task-brief PLAN_FILE N` to get the brief (same file the implementer worked from)
- `[FINDINGS]` — the Critical/Important findings and spec gaps from the
  previous review, copied verbatim, one per bullet
- `[WORKSPACE]` — the plan workspace path the setup subagent returned,
  recorded by the controller
- `[REPORT_FILE]` — `[WORKSPACE]/task-N-report.md`, the implementer's report file (fix reports appended)
- `[FIX_BASE_SHA]` — the head the previous review saw
- `[HEAD_SHA]` — current commit
- the diff file is produced by the re-reviewer itself:
  `review-package PLAN_FILE FIX_BASE HEAD`

**Re-reviewer returns:** per-finding verdicts (ADDRESSED / NOT ADDRESSED),
new breakage in the fix diff, out-of-scope observations, and a round verdict.
