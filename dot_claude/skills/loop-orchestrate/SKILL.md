---
name: loop-orchestrate
description: Use when asked to split a ticket into many parallel MRs/PRs, set up an orchestration loop, fan out workers across Orca worktrees, or run one worker per merge request.
---

# loop-orchestrate

Scaffolds `$LOOP_DIR` from `template/` and runs it via `loop`. Default `$LOOP_DIR`: `~/.claude/loops/<slug>`, overridable.

## Steps

1. AskUserQuestion until clear (fewer than 4 independent slices: Serial mode, no INSTRUCTIONS, no `/loop`): ticket, slug, repo id, base branch, host (`gitlab`|`github`), maxRunning, branch pattern, commit type, build/verify command, LOC cap, models.
2. `cp -R ~/.claude/skills/loop-orchestrate/template $LOOP_DIR`.
3. Fill placeholders: `sed` for INSTRUCTIONS.md, `jq --arg` into state.json (`maxRunning`, `locCap` via jq).
4. `mv specs/_context.example.md specs/_context.md`; write it with the user. Write one `specs/<slice>.md` per slice from `_slice.example.md`, then delete the example.
5. Add each slice to `state.json` `slices[]`: `{id, branch, status:"queued", wave, after?, model?, reviewModel?, review?}`.
6. `orca orchestration run-create --objective "<ticket>" --json`; read `runId` from the JSON output (verify on first run) and store it.
7. Start: `/loop Follow $LOOP_DIR/INSTRUCTIONS.md for one tick.` (dynamic mode; substitute the real path).

## Placeholders

| Placeholder | File | Meaning |
| --- | --- | --- |
| `{{TICKET}}` | INSTRUCTIONS.md, state.json | ticket id |
| `{{SLUG}}` | state.json | loop dir name |
| `{{GOAL}}` | INSTRUCTIONS.md | end state for every slice |
| `{{FIXED_DECISIONS}}` | INSTRUCTIONS.md | user decisions list |
| `{{REPO_ID}}` | state.json | Orca repo id, bare (no `id:`; scripts strip it if present) |
| `{{REPO_PATH}}` | state.json | absolute path of the invoking repo checkout |
| `{{BASE_BRANCH}}` | state.json | MR/PR target |
| `{{HOST}}` | state.json | `gitlab` or `github` |
| `{{BRANCH_PATTERN}}` | state.json | contains `{slice}` token |
| `{{COMMIT_TYPE}}` | state.json | Conventional Commit type |
| `{{BUILD_CMD}}` | state.json | build/verify command |
| `{{PR_CREATE}}` | specs/_contract.md | filled by start-slice.sh per host |

## Model selection

`config.models` = `{builder, reviewer, heavy}`, `agent` = `claude`. Per slice `model` / `reviewModel`: a model id or alias `heavy` / `builder` / `reviewer` (via `config.models`). No haiku.

| Work | Model |
| --- | --- |
| Mechanical single-module edits with a clear spec | sonnet |
| Cross-cutting or new-code slices, many modules, ambiguous rows | heavy (fable/opus) |
| Review of a sonnet slice | sonnet |
| Review of a heavy slice | heavy |
| Follow-up `-fuN` slices | same as parent |

Reviewer is heavy when the resolved builder model equals `models.heavy`. Resolved models are written to `resolvedModel` / `resolvedReviewModel`.

## Review

`config.review` defaults to `heavy-only`; a slice's `review` (`worker` | `orchestrator`) overrides it. Heavy builder or `worker`: `start-review.sh`. Otherwise the orchestrator checks DoD table, Ownership paths in `git diff --stat`, and LOC cap, then sets `mr_created`; failure uses `--fix`. Trade-off: orchestrator check weakens builder≠verifier for mechanical slices; accepted to halve reviewer cost.

## Serial mode

One worker, one worktree, all slices in order. Copy only `state.json`, `specs/`, `reviews/`, `SERIAL.md`, `start-serial.sh`, `start-slice.sh`, `start-review.sh` to `$LOOP_DIR` (no INSTRUCTIONS.md, no `/loop`). Run `start-serial.sh`, then follow `SERIAL.md`. Reviews and fixes always use `--fresh`.

## Flow

Builder (`start-slice.sh`) makes a Draft MR/PR; after DoD validation, review returns `VERDICT: approve|changes_requested`. Max 2 fix rounds, then `blocked_on_user`. Bad DoD reports get `send` (`dodRejections`, `awaitingResend`), then `--fix` as fallback. Approval sets `mr_created`; the user un-drafts.
