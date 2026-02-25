_get_dinii_repo() {
  local REPO="$HOME/ghq/github.com/dinii-inc/dinii-self-all"

  # If inside a Git repo and it's dinii-self-all, override REPO
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    local remote_url repo_name
    remote_url=$(git remote get-url origin 2>/dev/null)
    repo_name=$(basename -s .git "$remote_url")

    if [[ "$repo_name" == "dinii-self-all" ]]; then
      REPO="$(git rev-parse --show-toplevel)"
    fi
  fi

  echo "$REPO"
}

# ==========================
# dn function
# ==========================
dn() {
  # Set default path
  local REPO=$(_get_dinii_repo)

  case $1 in
  "all"|"root") cd "$REPO" ;;
  "cr") cd "$REPO/packages/dinii-self-cash-register" ;;
  "be") cd "$REPO/packages/dinii-self-backend" ;;
  "ai") cd "$REPO/packages/dinii-account-identity-api" ;;
  "web") cd "$REPO/packages/dinii-self-web" ;;
  "db") cd "$REPO/packages/dinii-self-dashboard" ;;
  "hd") cd "$REPO/packages/dinii-self-handy" ;;
  "kd") cd "$REPO/packages/dinii-self-kd" ;;
  "tf") cd "$REPO/packages/dinii-self-terraform" ;;
  "ki") cd "$REPO/packages/dinii-kiosk" ;;
  "rsv") cd "$REPO/packages/dinii-reservation-management" ;;
  "") cd "$REPO" ;;
  *) cd "$REPO/packages/$1" ;;
  esac
}

# ==========================
# dn completion (_dn)
# ==========================
_dn() {
  # Set default path
  local REPO=$(_get_dinii_repo)

  # Add only actual directories under packages/ as candidates
  local dirs=()
  for p in "$REPO/packages/"*/; do
    [[ -d "$p" ]] && dirs+=("$(basename "$p")")
  done

  compadd "$dirs[@]"
}
compdef _dn dn

_open_branch_doc() {
  local doc_type="$1"
  local REPO=$(_get_dinii_repo)
  local current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  local doc_file="$REPO/docs/branches/$current_branch/${doc_type}.md"

  if [[ -z "$current_branch" ]]; then
    echo "Error: Not in a git repository" >&2
    return 1
  fi

  # Check if file exists
  if [[ ! -f "$doc_file" ]]; then
    echo "Error: ${doc_type^} file does not exist: $doc_file" >&2
    return 1
  fi
  
  # Open the file
  code "$doc_file"
}

# Main commands
rmd() {
  _open_branch_doc "review"
}

imd() {
  _open_branch_doc "impact"
}

cmhs() {
  local REPO=$(_get_dinii_repo)
  local current_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  local impact_file="$REPO/docs/branches/$current_branch/impact.md"
  local latest_commit=$(git rev-parse HEAD 2>/dev/null)

  if [[ -z "$current_branch" ]]; then
    echo "Error: Not in a git repository" >&2
    return 1
  fi

  if [[ -z "$latest_commit" ]]; then
    echo "Error: Could not get latest commit hash" >&2
    return 1
  fi

  # Check if file exists
  if [[ ! -f "$impact_file" ]]; then
    echo "Error: Impact file does not exist: $impact_file" >&2
    return 1
  fi

  # Update the commit hash using sed
  # This matches "commit hash: " followed by any characters and replaces with new hash
  sed -i '' "s/^commit hash: .*/commit hash: $latest_commit/" "$impact_file"
  
  if [[ $? -eq 0 ]]; then
    echo "Updated commit hash to: $latest_commit"
  else
    echo "Error: Failed to update commit hash" >&2
    return 1
  fi
}
