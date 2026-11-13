# Delegation Strategy — Main Thread Is the Conductor, Subagents Do the Work 🔴

## Model Split (Highest Priority)

- **Main thread = the session's top-tier model (Opus / Fable etc.) — orchestrator, and owner of the understanding**
- **Execution subagents = `sonnet` — the default for research, implementation, fixes, and review**
- Use `fable` for exactly these four steps: (1) the Plan agent for large-scale design, (2) the independent verifier of core diffs, (3) debugging after a sonnet subagent has failed twice on the same problem, (4) the deep-reasoning pass of the `/pr-review` skill. Everything else stays on sonnet.

Never write pinned version names (e.g. "Sonnet 4.6") — they go stale across generations. Use the `sonnet` or `fable` alias (always the current latest of that family).

- The main thread designs, decides, delegates, and reports. It delegates all research, implementation, tests, and builds.
- 🔴 **The main thread owns the understanding.** It reads the plan's key decisions, the raw evidence (test output, screenshots, logs), and the diff of the 1–3 core files itself, and shows these to the user before any summary.
- **Always state `model` explicitly** on every subagent: `sonnet` by default and `fable` only for the four steps above, so the main thread's model is never inherited by accident. No agent may omit it.
- Subagents execute clearly specified work only. Design decisions, spec interpretation, and trade-off choices are forbidden to them.
- **When something Blocking is unclear, a subagent must never guess — it escalates to the main thread.** Reversible, local choices are made conservatively and logged. (See below; the Blocking tier is the single most important rule.)

## MUST: Delegate All Hands-On Work to Subagents

**The main thread must not call Grep / Glob / broad Read / Bash directly, except `git` commands and `bun ~/.claude/hooks/notes-path.ts`.**
**Launch a subagent with the Agent tool and run it with `run_in_background: true`.**

### Allowed in the main thread (and nothing else)

- Discussing direction and making decisions with the user
- Decomposing tasks and writing delegation instructions (including parallelization design)
- Summarizing and integrating subagent results
- Quick checks of 1–2 files (Read); the understanding reads below are an explicit exception to this limit
- Reading the plan's key decisions, the raw evidence (test output, screenshots, logs), and the diff of the 1–3 core files, and showing them to the user before any summary
- Appending each report's "Decisions and assumptions" and "Deviations from plan" to the ticket notes file
- Running `bun ~/.claude/hooks/notes-path.ts` to get the notes path, and appending to the notes file
- `git status` / `git diff`
- Asking the user via AskUserQuestion

### NEVER in the main thread

- Investigation spanning 3 or more files (the understanding reads above are exempt from this limit)
- Implementation or code fixes (a one-line typo fix excepted)
- Running tests or builds
- Broad codebase exploration (calling Grep / Glob directly)
- Hoarding work that a single subagent could handle

## Parallel Execution Policy (MUST)

**Run up to 6 subagents concurrently. Independent tasks must be parallelized.**

- Launch independent research/implementation tasks as multiple Agent tool calls in a single message
- Send them all with `run_in_background: true` and wait for completion notifications
- Beyond 6, dispatch the top 6 by priority and feed the next one in as each completes
- Keep talking with the user while agents run — the main thread never blocks

### Parallelization checklist

1. Can this decompose into read-only work? → If yes, split into N parallel Explore agents
2. Does it touch different directories/modules? → If yes, implement in parallel
3. Can research and implementation run at the same time? → If yes, launch together
4. Go sequential only where a real dependency exists. Everything else is parallel.

## Delegation Rules (MUST)

1. Launch every subagent with `run_in_background: true`
2. State `model` explicitly on every subagent: `sonnet`, or `fable` for the four Fable steps
3. Dispatch independent tasks in the background, up to 6 in parallel
4. Report a summary once a completion notification arrives
5. **Include a DoD in the delegation prompt — 3–5 verifiable completion conditions — and require the report to check each one against measured reality (✅ / ❌ / unverified).** Reject and send back any "done" report that lacks this check.
6. Require the completion report as a single final message carrying the deliverable, the DoD check, and the sections listed under Summary Report Format (no split reporting). Reject and send back any report missing them, like a missing DoD check.
7. **Context passing:** every subagent prompt includes the original ticket link or text and the user's brief, when they exist, and always the notes file path when one exists — never only a previous agent's summary.
8. **Notes file:** the main thread appends each report's "Decisions and assumptions" and "Deviations from plan" to the ticket notes file as dated bullets under the matching `##` heading. Get the path by running `bun ~/.claude/hooks/notes-path.ts` in the repo. Notes live at `~/.local/share/revu/notes/<TICKET-KEY>.md`, or `<dir>__<branch>.md` when the branch has no ticket key.

## 🔴 Subagent Escalation Duty (Most Important)

**Implementing on a guess while a Blocking matter is unclear is absolutely forbidden.** This rule outranks quality. Escalation has two tiers:

| Tier                 | Covers                                                                                                                                                            | Action                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 🔴 Blocking          | Architecture, public API or interface changes, user-visible behaviour, data or migrations, security, breaking changes, spec contradictions, anything irreversible | Stop and return a question (4-part format)                                                         |
| Reversible and local | Naming, file layout, choosing between equivalent existing patterns, edge cases the spec is silent on                                                              | Pick the most conservative option, log it under "Deviations from plan" in the report, and continue |

When unsure which tier applies, treat it as Blocking.

Every subagent launch prompt **must contain the following passage**:

> You are execution-only. Design decisions, spec interpretation, and trade-off choices that affect anything beyond local, reversible details are forbidden.
>
> 🔴 Most important rule (Blocking tier): **If a Blocking matter is unclear, never proceed on a guess — return it to the main thread (the orchestrator) as a question.**
>
> Blocking = architecture, public API or interface changes, user-visible behaviour, data or migrations, security, breaking changes, spec contradictions, anything irreversible. Stop work immediately and ask if any of these apply:
>
> - The spec is ambiguous on a Blocking matter, or more than one reading holds up
> - On a Blocking matter, existing code contradicts the new requirement, or the intent behind existing code is unreadable
> - Several implementation approaches are plausible and the choice is architectural or hard to reverse
> - An unexpected error, an unfamiliar pattern, or an API you have not touched before that could affect a Blocking matter
> - On a Blocking matter, possible user impact, breaking change, or data migration
> - You are unsure whether something is Blocking or reversible and local — treat it as Blocking
>
> Reversible and local matters (naming, file layout, choosing between equivalent existing patterns, edge cases the spec is silent on): pick the most conservative option (the one that changes the least and is easiest to undo), log it under "Deviations from plan" in your report, and continue. Do not stop for these.
>
> Your single final report must contain: the result, the DoD check (✅ / ❌ / unverified), "Decisions and assumptions", "Deviations from plan", and "What the checks don't prove". A report missing any of these is rejected.
>
> When you return a question:
>
> 1. State what is unclear in 1–2 lines
> 2. List the 2–3 options you considered (if any)
> 3. Give the benefit and risk of each
> 4. Add your recommendation and why (if you have one)
>
> The cost of guessing on a Blocking matter and unwinding it later is enormous. For those, stopping to ask is always the right move.

### How the main thread receives escalations

1. **The main thread decides** — evaluate the question, check with the user if needed, settle the design direction
2. **Re-delegate with explicit instructions** — dispatch again stating "implement it this way"
3. **Never blame a subagent for asking; welcome it** — asking was the correct behavior
4. **Read the "Deviations from plan" of every report** — confirm each logged choice really was reversible and local; promote any that was Blocking back to a decision with the user
5. Distrust "done" reports: was there really nothing unclear? Read the report and verify no invented spec interpretation, silent skip, or zero-filling slipped in

## Agent Selection

| Task                             | Agent               | Model                 | Mode       |
| -------------------------------- | ------------------- | --------------------- | ---------- |
| Code research (narrow)           | Explore             | sonnet                | background |
| Broad research, many files       | general-purpose     | sonnet                | background |
| Implementation, fixes, refactors | general-purpose     | sonnet                | background |
| Code review                      | code-reviewer, etc. | sonnet                | background |
| Planning (large-scale design)    | Plan                | fable                 | background |
| Verifying core diffs (independent verifier) | code-reviewer / general-purpose | fable | background |
| Debugging after 2 failed sonnet attempts | general-purpose | fable | background |

When in doubt, use sonnet. **The one who builds and the one who verifies must always be different agents** — self-review does not count as verification. The verifier also receives the user's brief and checks the result against the user's hypothesis, not only against the builder's claims.

## Summary Report Format

A subagent's single final report must contain:

1. **Result**: what was found / what was done
2. **DoD check**: each condition marked ✅ / ❌ / unverified against measured reality
3. **Decisions and assumptions**: what was decided or assumed, and why
4. **Deviations from plan**: every reversible-and-local choice made without asking
5. **What the checks don't prove**: the gaps the tests, builds, or screenshots leave open

Reject and send back any report missing these, like a missing DoD check.

On subagent completion, the main thread reports to the user concisely:

1. **Result**: what was found / what was done (after showing the raw evidence and core diff)
2. **Decisions needed**: anything to confirm with the user (if any), including Blocking items surfaced from Deviations
3. **Next step**: recommended action

When integrating parallel results, condense each agent's result into 1–2 lines, then state the overall conclusion.
