#!/bin/bash
set -euo pipefail

db="${ORCA_PROFILE_STATE_DB:-$HOME/Library/Application Support/orca/profiles/local-default/profile-state.db}"
curated="${CHEZMOI_SOURCE_DIR:-$(chezmoi source-path)}/dot_config/orca/settings.json"

[ -f "$db" ] && [ -f "$curated" ] || exit 0

current="$(sqlite3 "$db" "SELECT payload FROM profile_state_documents WHERE domain = 'settings'")"
[ -n "$current" ] || exit 0

merged="$(jq -c -n --argjson cur "$current" --slurpfile new "$curated" '$cur + $new[0]')"

if [ "$(jq -S -c . <<<"$current")" = "$(jq -S -c . <<<"$merged")" ]; then
  exit 0
fi

if pgrep -xq Orca; then
  echo "orca: settings differ but Orca is running; quit Orca and re-run chezmoi apply" >&2
  exit 0
fi

changed="$(jq -n --argjson cur "$current" --argjson mer "$merged" '[$mer | to_entries[] | select($cur[.key] != .value)] | length')"

sqlite3 "$db" ".backup '$db.chezmoi-backup'"

payload_file="$(mktemp)"
trap 'rm -f "$payload_file"' EXIT
printf '%s' "$merged" >"$payload_file"
hash="$(shasum -a 256 "$payload_file" | cut -d' ' -f1)"
now_ms="$(perl -MTime::HiRes=time -e 'printf "%d", time * 1000')"

sqlite3 "$db" <<SQL
.timeout 5000
BEGIN IMMEDIATE;
UPDATE profile_state_meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'revision';
UPDATE profile_state_documents
SET payload = CAST(readfile('$payload_file') AS TEXT),
    revision = (SELECT CAST(value AS INTEGER) FROM profile_state_meta WHERE key = 'revision'),
    updated_at = $now_ms,
    content_hash = '$hash'
WHERE domain = 'settings';
COMMIT;
SQL

echo "orca: applied $changed settings" >&2
