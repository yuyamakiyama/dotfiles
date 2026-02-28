#!/bin/bash
# Generate ~/.claude/settings.json from base + local plugins
set -euo pipefail

BASE="$HOME/.claude/settings.base.json"
LOCAL_PLUGINS="$HOME/.claude/plugins.local.json"
OUTPUT="$HOME/.claude/settings.json"

if [ ! -f "$BASE" ]; then
  echo "settings.base.json not found, skipping"
  exit 0
fi

if [ -f "$LOCAL_PLUGINS" ]; then
  # Merge local plugins into base
  jq -s '.[0].enabledPlugins += .[1] | .[0]' "$BASE" "$LOCAL_PLUGINS" > "$OUTPUT"
else
  cp "$BASE" "$OUTPUT"
fi
