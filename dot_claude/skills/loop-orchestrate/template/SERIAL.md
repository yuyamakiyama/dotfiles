# Serial mode: orchestrator procedure

`$LOOP_DIR` is the directory holding this file. `state.json` is the only memory. No `/loop`: wait in-session.

1. Run `$LOOP_DIR/start-serial.sh` (needs `runId` bound with `run-use`).
2. Wait: `orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 1500000 --json`. Answer `question` / `escalation` with `reply`; ack every batch with `check --ack <delivery_id>`.
3. Match the first `worker_done` to `config.serialDispatch.dispatchId`. Afterwards match each `worker_done` to a slice's `dispatchId` (fix worker) or `reviewDispatchId` (reviewer).
4. Validate the serial table: one row per slice with branch, PR URL, LOC and DoD, and the DoD rule from INSTRUCTIONS (complete table, no unexplained ❌/unverified). A slice with no PR URL is `failed`; tell the user.
5. DoD rejection: do not release. `send --to dispatch:<dispatchId> --subject "Follow-up" --body "<missing items>" --json`; on each deficient slice increment `dodRejections` and set `awaitingResend` (atomic jq, tmp then mv). After one empty wait with no new `worker_done`: `worker-release --dispatch <dispatchId>`, write `reviews/<slice>-dod<N>.md`, run `$LOOP_DIR/start-slice.sh <slice> --fix reviews/<slice>-dod<N>.md --fresh`, clear `awaitingResend`. At `dodRejections` 2: `blocked_on_user`.
6. Once accepted: record `prUrl` per row (jq, tmp then mv), then `worker-release --dispatch <dispatchId>`.
7. Route each slice with this jq (prints `worker` or `orchestrator`):

```
jq -r --arg s <slice> '.config as $c | .slices[] | select(.id==$s) | (.review // $c.review // "heavy-only") as $r | ((.model // "builder") as $m | ($c.models[$m] // $m)) as $b | if $r=="worker" or ($r!="orchestrator" and $b==$c.models.heavy) then "worker" else "orchestrator" end' "$LOOP_DIR/state.json"
```

   - `worker`: `$LOOP_DIR/start-review.sh <slice> --fresh` (status `in_review`); read `VERDICT:` on its `worker_done`, release it. `approve` sets `mr_created`.
   - `orchestrator`: check DoD, `git -C "$repoPath" fetch origin <branch>` then `git -C "$repoPath" diff --stat origin/<base>...origin/<branch>` (Ownership paths only), and LOC within `config.locCap` (`repoPath` = `config.repoPath`). All pass: `mr_created`.
8. `changes_requested` or a failed orchestrator check: if `reviewRound` < 2, increment it, save findings to `reviews/<slice>-r<reviewRound>.md`, run `$LOOP_DIR/start-slice.sh <slice> --fix reviews/<slice>-r<reviewRound>.md --fresh` (status `running`; its `worker_done` goes back through steps 4-7). Otherwise `blocked_on_user`.

## Status flow

`queued` -> `in_review` | `mr_created` | `blocked_on_user` | `failed`; `in_review` -> `mr_created` | `running` (fix) | `blocked_on_user`; `running` (fix) -> `in_review` | `mr_created` | `blocked_on_user`.

## Stop

When every slice is `mr_created`, `failed` or `blocked_on_user` (decided by the user) and `worker-list --run <runId> --terminal-state reclaimable --json` is empty, report a table: slice, status, model, PR URL. PRs stay Draft; the user un-drafts.
