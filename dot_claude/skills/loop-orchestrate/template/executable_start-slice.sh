#!/bin/zsh
set -euo pipefail
DIR="${0:A:h}"
STATE="$DIR/state.json"
ORCA="${ORCA_CLI_COMMAND:-orca}"
USAGE="usage: start-slice.sh <slice> [--fix <findings-file> [--fresh]]"

if [[ $# -lt 1 ]]; then
  echo "$USAGE" >&2; exit 2
fi
SLICE="$1"
FIX=""
FRESH=""
FINDINGS=""
if [[ "${2:-}" == "--fix" ]]; then
  FIX=1
  FINDINGS="${3:-}"
  if [[ -z "$FINDINGS" ]]; then
    echo "$USAGE" >&2; exit 2
  fi
  if [[ "$FINDINGS" != /* ]]; then
    FINDINGS="$DIR/$FINDINGS"
  fi
  if [[ ! -f "$FINDINGS" ]]; then
    echo "findings file not found: $FINDINGS" >&2; exit 1
  fi
  if [[ "${4:-}" == "--fresh" ]]; then
    FRESH=1
  elif [[ $# -gt 3 ]]; then
    echo "$USAGE" >&2; exit 2
  fi
elif [[ $# -gt 1 ]]; then
  echo "$USAGE" >&2; exit 2
fi

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
ROUND="$(slice reviewRound)"
if [[ -z "$BRANCH" ]]; then
  PATTERN="$(cfg branchPattern)"
  BRANCH="${PATTERN//\{slice\}/$SLICE}"
fi

MODEL="$(slice model)"
if [[ -z "$MODEL" ]]; then
  MODEL="builder"
fi
MODEL="$(resolve "$MODEL")"

if [[ -z "$RUN_ID" ]]; then
  echo "state.json runId is empty; run-create / run-use first" >&2; exit 1
fi

case "$HOST" in
  gitlab)
    CR_KIND="Merge Request"
    PR_CREATE="glab mr create --draft --target-branch $BASE --title \"Draft: $(cfg commitType)(<scope>): <summary> [$TICKET]\" --description \"<body>\" --yes" ;;
  github)
    CR_KIND="Pull Request"
    PR_CREATE="gh pr create --draft --base $BASE --title \"$(cfg commitType)(<scope>): <summary> [$TICKET]\" --body \"<body>\"" ;;
  *) echo "unsupported host: $HOST" >&2; exit 1 ;;
esac

CONTRACT="$(<"$DIR/specs/_contract.md")"
CONTRACT="${CONTRACT//\{\{PR_CREATE\}\}/$PR_CREATE}"

PARAMS="## Run parameters

- Ticket: $TICKET
- Slice: $SLICE
- Branch: $BRANCH
- Base branch: $BASE
- Change request kind: $CR_KIND (host: $HOST)
- Commit type: $(cfg commitType)
- Build/verify command: $(cfg buildCmd)
- LOC cap: $(cfg locCap)
"

SPEC="$(<"$DIR/specs/$SLICE.md")

$(<"$DIR/specs/_context.md")

$PARAMS
$CONTRACT"

if [[ -n "$FIX" ]]; then
  PUSH_LINE=""
  if [[ -n "$FRESH" ]]; then
    PUSH_LINE="Push with \`git push origin HEAD:$BRANCH\`; do not open a new PR. The existing PR updates.
"
    PLACEMENT=(--worktree new-top-level --repo "id:$REPO_ID" --name "$BRANCH-fix${ROUND:-0}" --base-branch "$BRANCH" --setup skip)
  else
    PLACEMENT=(--worktree "branch:$BRANCH")
  fi
  SPEC="$SPEC

## Review findings to address (rework round)

The branch already exists and has a Draft $CR_KIND. Fix every finding below on this branch, push, and do not create a new $CR_KIND.
$PUSH_LINE
$(<"$FINDINGS")"
else
  PLACEMENT=(--worktree new-top-level --repo "id:$REPO_ID" --name "$BRANCH" --base-branch "$BASE" --setup skip)
fi

MODEL_ARGS=()
if [[ -n "$MODEL" ]]; then
  MODEL_ARGS=(--model "$MODEL")
fi

OUT="$($ORCA orchestration worker-start \
  --run "$RUN_ID" \
  --spec "$SPEC" \
  --task-title "$TICKET $SLUG: $SLICE" \
  "${PLACEMENT[@]}" \
  --agent "$(cfg agent)" "${MODEL_ARGS[@]}" \
  --json)"

DISPATCH="$(jq -r '[.. | objects | .dispatchId? // empty] | first // empty' <<<"$OUT")"
TASK="$(jq -r '[.. | objects | .taskId? // empty] | first // empty' <<<"$OUT")"
if [[ -z "$DISPATCH" || -z "$TASK" ]]; then
  echo "worker-start returned no taskId/dispatchId: $OUT" >&2
  exit 1
fi

NOW="$(date -u +%Y-%m-%dT%H:%MZ)"
jq --arg s "$SLICE" --arg b "$BRANCH" --arg t "$TASK" --arg d "$DISPATCH" --arg m "$MODEL" --arg n "$NOW" \
  '.slices |= map(if .id==$s then . + {branch:$b, status:"running", taskId:$t, dispatchId:$d, resolvedModel:$m, startedAt:(.startedAt // $n)} else . end)' \
  "$STATE" > "$STATE.tmp"
mv "$STATE.tmp" "$STATE"
echo "$OUT"
