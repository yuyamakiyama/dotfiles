#!/bin/zsh
set -euo pipefail
DIR="${0:A:h}"
STATE="$DIR/state.json"
ORCA="${ORCA_CLI_COMMAND:-orca}"

if [[ $# -ne 0 ]]; then
  echo "usage: start-serial.sh" >&2; exit 2
fi

cfg() { jq -r ".config.$1 // empty" "$STATE"; }

TICKET="$(jq -r .ticket "$STATE")"
SLUG="$(jq -r .slug "$STATE")"
RUN_ID="$(jq -r .runId "$STATE")"
HOST="$(cfg host)"
REPO_ID="$(cfg repoId)"
REPO_ID="${REPO_ID#id:}"
BASE="$(cfg baseBranch)"
PATTERN="$(cfg branchPattern)"

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

IDS=("${(@f)$(jq -r '.slices[].id' "$STATE")}")
if [[ ${#IDS[@]} -eq 0 || -z "${IDS[1]}" ]]; then
  echo "state.json has no slices" >&2; exit 1
fi

HEAVY_ANY="$(jq -r '.config.models as $m | [.slices[] | (.model // "builder") | ($m[.] // .)] | any(. == $m.heavy)' "$STATE")"
if [[ "$HEAVY_ANY" == "true" ]]; then
  MODEL="$(jq -r '.config.models.heavy // empty' "$STATE")"
else
  MODEL="$(jq -r '.config.models.builder // empty' "$STATE")"
fi

SLICE_LIST=""
SLICE_SPECS=""
for ID in "${IDS[@]}"; do
  BRANCH="$(jq -r --arg s "$ID" '.slices[] | select(.id==$s) | .branch // empty' "$STATE")"
  if [[ -z "$BRANCH" ]]; then
    BRANCH="${PATTERN//\{slice\}/$ID}"
  fi
  SLICE_LIST+="- $ID: branch \`$BRANCH\`"$'\n'
  SLICE_SPECS+="
# Slice spec: $ID (branch $BRANCH)

$(<"$DIR/specs/$ID.md")
"
done

CONTRACT="$(<"$DIR/specs/_contract.md")"
CONTRACT="${CONTRACT//\{\{PR_CREATE\}\}/$PR_CREATE}"

SPEC="$(<"$DIR/specs/_serial.md")

Slices, in order:

$SLICE_LIST
$(<"$DIR/specs/_context.md")

## Run parameters

- Ticket: $TICKET
- Base branch: $BASE
- Change request kind: $CR_KIND (host: $HOST)
- Commit type: $(cfg commitType)
- Build/verify command: $(cfg buildCmd)
- LOC cap: $(cfg locCap) (per slice)

$CONTRACT
$SLICE_SPECS"

MODEL_ARGS=()
if [[ -n "$MODEL" ]]; then
  MODEL_ARGS=(--model "$MODEL")
fi

OUT="$($ORCA orchestration worker-start \
  --run "$RUN_ID" \
  --spec "$SPEC" \
  --task-title "$TICKET $SLUG: serial" \
  --worktree new-top-level --repo "id:$REPO_ID" --name "$SLUG-serial" --base-branch "$BASE" --setup skip \
  --agent "$(cfg agent)" "${MODEL_ARGS[@]}" \
  --json)"

DISPATCH="$(jq -r '[.. | objects | .dispatchId? // empty] | first // empty' <<<"$OUT")"
TASK="$(jq -r '[.. | objects | .taskId? // empty] | first // empty' <<<"$OUT")"
if [[ -z "$DISPATCH" || -z "$TASK" ]]; then
  echo "worker-start returned no taskId/dispatchId: $OUT" >&2
  exit 1
fi

jq --arg t "$TASK" --arg d "$DISPATCH" '.config.serialDispatch = {dispatchId:$d, taskId:$t}' "$STATE" > "$STATE.tmp"
mv "$STATE.tmp" "$STATE"
echo "$OUT"
