#!/bin/sh
set -eu

env="${1:?usage: mcp-grafana.sh <dev|prod>}"
shift

case "$env" in
  dev) url="https://grafana.dev.mapsindoors.com" ;;
  prod) url="https://grafana.mapsindoors.com" ;;
  *) echo "Unknown environment '$env'; expected dev or prod" >&2; exit 1 ;;
esac

service="grafana-mcp-$env"
token=$(security find-generic-password -s "$service" -a "$USER" -w 2>/dev/null) || {
  echo "Keychain item '$service' not found. Add it with: security add-generic-password -s $service -a \"\$USER\" -w" >&2
  exit 1
}

export GRAFANA_URL="$url"
export GRAFANA_SERVICE_ACCOUNT_TOKEN="$token"

exec "$HOME/.local/bin/uvx" mcp-grafana --disable-write "$@"
