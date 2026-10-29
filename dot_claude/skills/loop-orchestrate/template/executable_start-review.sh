#!/bin/zsh
set -euo pipefail
DIR="${0:A:h}"
STATE="$DIR/state.json"
ORCA="${ORCA_CLI_COMMAND:-orca}"

USAGE="usage: start-review.sh <slice> [--fresh]"
if [[ $# -lt 1 || $# -gt 2 || ( $# -eq 2 && "$2" != "--fresh" ) ]]; then
  echo "$USAGE" >&2; exit 2
fi
SLICE="$1"
FRESH="${2:-}"

cfg() { jq -r ".config.$1 // empty" "$STATE"; }
slice() { jq -r --arg s "$SLICE" ".slices[] | select(.id==\$s) | .$1 // empty" "$STATE"; }
resolve() {
  case "$1" in
    heavy|builder|reviewer) jq -r --arg k "$1" '.config.models[$k] // empty' "$STATE" ;;
    *) print -r -- "$1" ;;
  esac
}

TICKET="$(jq -r .ticket "$STATE")"
SLUG="$(jq -r .slug "$STATE")"
RUN_ID="$(jq -r .runId "$STATE")"
HOST="$(cfg host)"
REPO_ID="$(cfg repoId)"
REPO_ID="${REPO_ID#id:}"
BASE="$(cfg baseBranch)"
BRANCH="$(slice branch)"
if [[ -z "$BRANCH" ]]; then
  PATTERN="$(cfg branchPattern)"
  BRANCH="${PATTERN//\{slice\}/$SLICE}"
fi
PR_URL="$(slice prUrl)"
ROUND="$(slice reviewRound)"
HEAVY="$(jq -r '.config.models.heavy // empty' "$STATE")"

if [[ -z "$PR_URL" ]]; then
  echo "slice $SLICE has no prUrl in state.json; record it before starting the review" >&2; exit 1
fi
if [[ -z "$RUN_ID" ]]; then
  echo "state.json runId is empty; run-create / run-use first" >&2; exit 1
fi

BUILDER_MODEL="$(slice model)"
if [[ -z "$BUILDER_MODEL" ]]; then
  BUILDER_MODEL="builder"
fi
BUILDER_MODEL="$(resolve "$BUILDER_MODEL")"

MODEL="$(slice reviewModel)"
if [[ -n "$MODEL" ]]; then
  MODEL="$(resolve "$MODEL")"
elif [[ -n "$HEAVY" && "$BUILDER_MODEL" == "$HEAVY" ]]; then
  MODEL="$HEAVY"
else
  MODEL="$(resolve reviewer)"
fi

case "$HOST" in
  gitlab) CR_KIND="Merge Request" ;;
  github) CR_KIND="Pull Request" ;;
  *) echo "unsupported host: $HOST" >&2; exit 1 ;;
esac

RULES="$(awk '/<!-- review:begin -->/{f=1;next} /<!-- review:end -->/{f=0} f' "$DIR/specs/_contract.md")"

SPEC="$(<"$DIR/specs/_review.md")

## Run parameters

- Ticket: $TICKET
- Slice: $SLICE
- Branch: $BRANCH (your worktree is at its tip)
- Base branch: $BASE
- Change request kind: $CR_KIND (host: $HOST), URL: $PR_URL
- Build/verify command: $(cfg buildCmd)
- LOC cap: $(cfg locCap)
- Review round: ${ROUND:-0}

# Slice spec under review

$(<"$DIR/specs/$SLICE.md")

# Ticket context

$(<"$DIR/specs/_context.md")

# Builder's rules (reference only — you are the reviewer, not the builder)

$RULES"

if [[ -n "$FRESH" ]]; then
  PLACEMENT=(--worktree new-top-level --repo "id:$REPO_ID" --name "$BRANCH-review$(( ${ROUND:-0} + 1 ))" --base-branch "$BRANCH" --setup skip)
else
  PLACEMENT=(--worktree "branch:$BRANCH")
fi

MODEL_ARGS=()
if [[ -n "$MODEL" ]]; then
  MODEL_ARGS=(--model "$MODEL")
fi

OUT="$($ORCA orchestration worker-start \
  --run "$RUN_ID" \
  --spec "$SPEC" \
  --task-title "$TICKET $SLUG: review $SLICE" \
  "${PLACEMENT[@]}" \
  --agent "$(cfg agent)" "${MODEL_ARGS[@]}" \
  --json)"

DISPATCH="$(jq -r '[.. | objects | .dispatchId? // empty] | first // empty' <<<"$OUT")"
TASK="$(jq -r '[.. | objects | .taskId? // empty] | first // empty' <<<"$OUT")"
if [[ -z "$DISPATCH" || -z "$TASK" ]]; then
  echo "worker-start returned no taskId/dispatchId: $OUT" >&2
  exit 1
fi

jq --arg s "$SLICE" --arg t "$TASK" --arg d "$DISPATCH" --arg m "$MODEL" \
  '.slices |= map(if .id==$s then . + {status:"in_review", reviewTaskId:$t, reviewDispatchId:$d, resolvedReviewModel:$m} else . end)' \
  "$STATE" > "$STATE.tmp"
mv "$STATE.tmp" "$STATE"
echo "$OUT"
