function orca-sync-settings() {
  local live="$HOME/Library/Application Support/orca/profiles/local-default/orca-data.json"
  local curated="$HOME/.config/orca/settings.json"
  local filter="$(chezmoi source-path)/.orca-settings-exclude.jq"

  [[ -f $live ]]   || { print -u2 "orca-sync-settings: no live data at $live"; return 1; }
  [[ -f $filter ]] || { print -u2 "orca-sync-settings: no filter at $filter"; return 1; }

  local tmp=$(mktemp)
  # Unsorted on purpose: the committed file keeps Orca's own key order, so
  # sorting here would rewrite all 159 keys on the next export.
  if ! jq '.settings' "$live" | jq -f "$filter" > "$tmp"; then
    rm -f "$tmp"
    return 1
  fi

  if [[ -f $curated ]] && diff -q "$curated" "$tmp" >/dev/null; then
    rm -f "$tmp"
    print "orca-sync-settings: no changes"
    return 0
  fi

  if [[ -f $curated ]]; then
    jq -r --slurpfile new "$tmp" '
      ([$new[0]|keys[]] - [keys[]]) as $added |
      ([keys[]] - [$new[0]|keys[]]) as $removed |
      ([to_entries[] | . as $e | select(($new[0]|has($e.key)) and ($new[0][$e.key] != $e.value)) | $e.key]) as $changed |
      "  added:   \($added|length)\(if ($added|length)   > 0 then "  \($added|join(", "))"   else "" end)",
      "  removed: \($removed|length)\(if ($removed|length) > 0 then "  \($removed|join(", "))" else "" end)",
      "  changed: \($changed|length)\(if ($changed|length) > 0 then "  \($changed|join(", "))" else "" end)"
    ' "$curated"
  else
    print "  new file: $(jq 'length' "$tmp") keys"
  fi

  mv "$tmp" "$curated"
  chezmoi add "$curated" && print "orca-sync-settings: committed and pushed by chezmoi autoCommit/autoPush"
}
