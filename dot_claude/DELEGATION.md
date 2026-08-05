# Delegation Strategy — Main Thread Is the Conductor, Subagents Do the Work 🔴

## Model Split (Highest Priority)

- **Main thread = the session's top-tier model (Opus / Fable etc.) — pure orchestrator**
- **Execution subagents = `sonnet` — the default for research, implementation, fixes, and review**
- Exception: only the Plan agent for large-scale design may omit `model` and inherit the main thread's model

Never write pinned version names (e.g. "Sonnet 4.6") — they go stale across generations. Use the `sonnet` alias (always the current Sonnet-family latest) or "inherits main".

- The main thread only designs, decides, delegates, and reports summaries. It performs no hands-on work.
- **Always state `model: "sonnet"` explicitly** when launching a subagent, so the main thread's top-tier model is never inherited by accident. Plan is the only agent allowed to omit it.
- Subagents execute clearly specified work only. Design decisions, spec interpretation, and trade-off choices are forbidden to them.
- **When something is unclear, a subagent must never guess — it escalates to the main thread.** (See below; this is the single most important rule.)

## MUST: Delegate All Hands-On Work to Subagents

**The main thread must not call Grep / Glob / broad Read / Bash (other than git) directly.**
**Launch a subagent with the Agent tool and run it with `run_in_background: true`.**

### Allowed in the main thread (and nothing else)

- Discussing direction and making decisions with the user
- Decomposing tasks and writing delegation instructions (including parallelization design)
- Summarizing and integrating subagent results
- Quick checks of 1–2 files (Read)
- `git status` / `git diff`
- Asking the user via AskUserQuestion

### NEVER in the main thread

- Investigation spanning 3 or more files
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
2. State `model: "sonnet"` explicitly on every subagent (Plan alone may omit it and inherit main)
3. Dispatch independent tasks in the background, up to 6 in parallel
4. Report a summary once a completion notification arrives
5. **Include a DoD in the delegation prompt — 3–5 verifiable completion conditions — and require the report to check each one against measured reality (✅ / ❌ / unverified).** Reject and send back any "done" report that lacks this check.
6. Require the completion report as a single final message carrying both the deliverable and the DoD check (no split reporting)

## 🔴 Subagent Escalation Duty (Most Important)

**Implementing on a guess while still unclear is absolutely forbidden.** This rule outranks quality.

Every subagent launch prompt **must contain the following passage**:

> You are execution-only. Design decisions, spec interpretation, and trade-off choices are forbidden.
>
> 🔴 Most important rule: **If anything is unclear, never proceed on a guess — return it to the main thread (the orchestrator) as a question.**
>
> Stop work immediately and ask if any of these apply:
>
> - The spec is ambiguous, or more than one reading holds up
> - Existing code contradicts the new requirement, or the intent behind existing code is unreadable
> - Several implementation approaches are plausible and one must be chosen
> - An unexpected error, an unfamiliar pattern, or an API you have not touched before
> - Possible user impact, breaking change, or data migration
> - Any wobble in your own confidence (if "probably" or "I think" crosses your mind, stop)
> - The moment you think "let me just run it and see"
>
> When you return a question:
>
> 1. State what is unclear in 1–2 lines
> 2. List the 2–3 options you considered (if any)
> 3. Give the benefit and risk of each
> 4. Add your recommendation and why (if you have one)
>
> The cost of implementing on a guess and unwinding it later is enormous. Stopping to ask is always the right move.

### How the main thread receives escalations

1. **The main thread decides** — evaluate the question, check with the user if needed, settle the design direction
2. **Re-delegate with explicit instructions** — dispatch again stating "implement it this way"
3. **Never blame a subagent for asking; welcome it** — asking was the correct behavior
4. Distrust "done" reports: was there really nothing unclear? Read the report and verify no invented spec interpretation, silent skip, or zero-filling slipped in

## Agent Selection

| Task                             | Agent               | Model                 | Mode       |
| -------------------------------- | ------------------- | --------------------- | ---------- |
| Code research (narrow)           | Explore             | sonnet                | background |
| Broad research, many files       | general-purpose     | sonnet                | background |
| Implementation, fixes, refactors | general-purpose     | sonnet                | background |
| Code review                      | code-reviewer, etc. | sonnet                | background |
| Planning (large-scale design)    | Plan                | (omit = inherit main) | background |

When in doubt, use sonnet. **The one who builds and the one who verifies must always be different agents** — self-review does not count as verification.

## Summary Report Format

On subagent completion, report concisely:

1. **Result**: what was found / what was done
2. **Decisions needed**: anything to confirm with the user (if any)
3. **Next step**: recommended action

When integrating parallel results, condense each agent's result into 1–2 lines, then state the overall conclusion.
