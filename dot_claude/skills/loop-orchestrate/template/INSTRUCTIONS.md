# Loop: {{TICKET}} orchestration

Re-read this file and `state.json` at the start of every tick. They are the only memory. `$LOOP_DIR` is the directory holding this file. Every `config.*` value below lives in `$LOOP_DIR/state.json`.

## Goal

{{GOAL}}

## Fixed decisions

{{FIXED_DECISIONS}}

## Slice fields (state.json)

`id`, `branch`, `status`, `wave` (default 1), `after` (optional slice ids), `review` (optional `worker` | `orchestrator`, overrides `config.review`), `model` / `reviewModel` (optional; a model id or the alias `heavy` / `builder` / `reviewer`, resolved through `config.models`), `prUrl`, `taskId`, `dispatchId`, `reviewTaskId`, `reviewDispatchId`, `reviewRound` (fix rounds used), `dodRejections`, `awaitingResend` (ISO time a DoD resend was sent; cleared on the next valid `worker_done` or the re-dispatch fallback), `resolvedModel`, `resolvedReviewModel`, `startedAt`, `note`.

## Statuses

`queued` -> `running` -> `in_review` -> `mr_created` | `needs_followup` | `blocked_on_user` | `failed`.

- `running`: builder working. `in_review`: reviewer working.
- `mr_created`: reviewer approved; the MR/PR stays Draft, the user un-drafts it.
- `needs_followup`: approved and shipped, follow-up slice queued; counts as `mr_created`.
- Terminal for wave gating: `mr_created`, `needs_followup`, `failed`. `blocked_on_user` holds later waves until the user decides.

## Tick procedure

1. If the session restarted: `orca orchestration run-use --id <runId> --json` (runId in state.json). `run-use` must be active before any start script runs; the scripts also pass `--run <runId>`.
2. `orca orchestration check --json` (no --wait). For each message:
   - `question` / `escalation`: decide, then `reply --id <message_id> --body "<answer>"`. If it needs the user, AskUserQuestion first.
   - `worker_done` from a builder (its `dispatchId` matches a `running` slice): apply the DoD rejection rule. If accepted: record `prUrl` (`jq --arg s <slice> --arg u <url> '.slices |= map(if .id==$s then . + {prUrl:$u} else . end)' "$LOOP_DIR/state.json" > "$LOOP_DIR/state.json.tmp" && mv "$LOOP_DIR/state.json.tmp" "$LOOP_DIR/state.json"`), `worker-release --dispatch <id>`, then pick the review path (see Review routing). If `--outcome failed`: set `failed` and release.
   - `worker_done` from a reviewer (its `dispatchId` matches `reviewDispatchId`): read `VERDICT:` in the summary, `worker-release --dispatch <id>`.
     - `approve`: set `mr_created` (or `needs_followup` if a follow-up was queued).
     - `changes_requested`: if `reviewRound` < 2, increment it, save the findings to `reviews/<slice>-r<reviewRound>.md`, then run `start-slice.sh <slice> --fix reviews/<slice>-r<reviewRound>.md`. Otherwise set `blocked_on_user` and tell the user.
   - After each message: `check --ack <delivery_id> --json`. Repeat until count is 0.
3. Follow-up slice: if a builder stopped at a boundary or reported untouched rows, write `specs/<slice>-fu1.md` (same header as the parent: Branch, Ownership, Change, plus the untouched rows), append a `queued` slice `<slice>-fu1` with the same `wave` and the parent's `model`. Its branch is `config.branchPattern` with `{slice}` replaced by the follow-up id: parent `ctl-a` and pattern `feat/abc-123-{slice}` give `feat/abc-123-ctl-a-fu1`. Next follow-up is `-fu2`.
4. Slots: count slices that are `running` or `in_review`. While that count < `config.maxRunning` and an eligible slice is `queued`: `$LOOP_DIR/start-slice.sh <slice>` (it appends `_context.md` and `_contract.md`, and updates state.json; never call `worker-start` with a bare slice spec).
   - Eligible: every lower-numbered wave is terminal, AND every id in `after` is `mr_created` or `needs_followup`.
5. `emptyTicks`: increment when step 2 found 0 messages, reset to 0 otherwise. At 3: `worker-list --run <runId> --include-remote --json`, act on `projection.nextAction`, reset to 0.
6. Kick a background `check --wait --types "worker_done,escalation,question" --timeout-ms 1500000 --json` as the wake signal; ScheduleWakeup 1800s fallback.
7. Stop when every slice is terminal (`failed` only with a user decision) and `worker-list --run <runId> --terminal-state reclaimable --json` is empty. Report a table: slice, status, model, MR/PR URL.

## Review routing

`config.review` defaults to `heavy-only`. Decide the path per slice:

```
jq -r --arg s <slice> '.config as $c | .slices[] | select(.id==$s) | (.review // $c.review // "heavy-only") as $r | ((.model // "builder") as $m | ($c.models[$m] // $m)) as $b | if $r=="worker" or ($r!="orchestrator" and $b==$c.models.heavy) then "worker" else "orchestrator" end' "$LOOP_DIR/state.json"
```

- Serial mode: always add `--fresh` to `start-review.sh` and to `start-slice.sh --fix`.
- `worker`: run `$LOOP_DIR/start-review.sh <slice>`; handle the verdict as in step 2.
- `orchestrator`: check the slice yourself. All must hold: (1) the DoD table is complete with no unexplained ❌ or unverified row; (2) after `git -C "$repoPath" fetch origin <branch>`, `git -C "$repoPath" diff --stat origin/<base>...origin/<branch>` (`repoPath` = `config.repoPath`) lists only Ownership paths; (3) additions plus deletions are within `config.locCap` (about 10% tolerance, as in the builder contract). If all hold, set `mr_created`. If any fails, treat it as `changes_requested`: same `reviewRound` limit, same `--fix` re-dispatch with the failures as findings.

## DoD rejection rule

Reject a builder `worker_done` if its DoD table is missing, any row is ❌/unverified without a reason, or the PR URL is absent. Do NOT release the dispatch. Use the shared counter `dodRejections` (builder and reviewer rejections both count); at 2 set `blocked_on_user` and tell the user. Otherwise:

1. Send the missing items to the still-live worker: `orca orchestration send --to dispatch:<dispatchId> --subject "Follow-up" --body "<missing items>" --json`.
2. Increment `dodRejections` and set `awaitingResend` to the current ISO time, atomically (`jq --arg s <slice> --arg t <iso> '.slices |= map(if .id==$s then .dodRejections=((.dodRejections // 0)+1) | .awaitingResend=$t else . end)' "$LOOP_DIR/state.json" > "$LOOP_DIR/state.json.tmp" && mv "$LOOP_DIR/state.json.tmp" "$LOOP_DIR/state.json"`).
3. Next tick, for each slice with `awaitingResend`: if its dispatch sent a new `worker_done`, validate it normally and clear `awaitingResend`. If not, fall back: `worker-release --dispatch <dispatchId>`, write the missing items to `reviews/<slice>-dod<N>.md` (N = `dodRejections`), run `$LOOP_DIR/start-slice.sh <slice> --fix reviews/<slice>-dod<N>.md`, and clear `awaitingResend`.

Reject a reviewer `worker_done` that lacks a `VERDICT:` line, or lacks findings for `changes_requested`, by incrementing `dodRejections` the same way and re-running `$LOOP_DIR/start-review.sh <slice>`; at 2 set `blocked_on_user`.

## Escalation handling

Workers are execution-only; they ask instead of guessing. Decide, then `reply`. If a decision needs the user, ask with AskUserQuestion and reply afterwards.
