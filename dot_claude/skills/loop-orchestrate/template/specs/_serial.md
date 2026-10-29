# Serial run

You are the only worker for this ticket. Do the slices listed below one after another, in order. Each slice has its own branch and its own Draft change request.

For each slice, in order:

1. `git fetch origin`, then `git switch -c <branch> origin/<base>` (branch from the slice list, base from Run parameters).
2. Do the slice following the worker contract: plan, implement, self-review, commit, push, create the Draft change request.
3. Move to the next slice only after its Draft exists. Never carry commits from one slice into the next.

Send one `worker_done` at the end. Its body starts with this table, followed by each slice's DoD table:

| slice | branch | PR URL | LOC | DoD ✅/❌ |
| --- | --- | --- | --- | --- |

Every slice below must appear as a row, including slices you could not finish (mark them ❌ with the reason).
