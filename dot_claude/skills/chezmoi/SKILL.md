---
name: chezmoi
description: "Manage dotfiles with chezmoi. Use when the user wants to add, edit, or sync config files across machines."
---

# chezmoi — Dotfiles Manager

`$ARGUMENTS` — optional subcommand or file path

## Overview

chezmoi manages dotfiles across machines. Source repo is at `~/.local/share/chezmoi/`. `autoCommit` and `autoPush` are enabled, so changes are automatically committed and pushed after `chezmoi add` or `chezmoi apply`.

## Common Operations

### Add a new file

```bash
chezmoi add ~/.config/app/config.json
```

This copies the file into the source repo. With autoCommit/autoPush, it's committed and pushed automatically.

### Edit a managed file

Edit the file directly (e.g. with the Edit tool), then update chezmoi:

```bash
chezmoi add ~/.config/app/config.json
```

Or edit in the source directory directly, then apply:

```bash
chezmoi apply ~/.config/app/config.json
```

### Check what's managed

```bash
chezmoi managed          # List all managed files
chezmoi diff             # Show pending changes
chezmoi status           # Show status of managed files
```

### Apply changes from source

```bash
chezmoi apply            # Apply all
chezmoi apply <target>   # Apply specific file
```

### Git operations on the source repo

```bash
chezmoi git -- status
chezmoi git -- log --oneline
chezmoi git -- pull --rebase
chezmoi git -- push
```

## Source Directory Layout

chezmoi uses naming conventions in `~/.local/share/chezmoi/`:

| Prefix | Meaning |
|---|---|
| `dot_` | `.` prefix in target (e.g. `dot_config` → `.config`) |
| `private_` | Restrictive permissions (owner only) — rename to remove if not needed |
| `run_once_` | Script that runs once per machine during `chezmoi apply` |
| `run_` | Script that runs every `chezmoi apply` |
| `.tmpl` suffix | Template file — supports `{{ .chezmoi.homeDir }}` etc. |

## Symlink Pattern

For files that must live in awkward paths (e.g. `~/Library/Application Support/`):

1. Store the actual file in `~/.config/<app>/` (managed by chezmoi)
2. Create a symlink from the original path
3. Add a `run_once_setup-symlinks.sh` script to automate symlink creation

Existing symlinks are defined in `run_once_setup-symlinks.sh` in the source repo.

## Templates

Use `.tmpl` suffix for files that differ across machines:

```
{{ .chezmoi.homeDir }}/some/path    # Resolves to correct home directory
{{ .chezmoi.hostname }}              # Machine hostname
{{ .chezmoi.os }}                    # "darwin", "linux", etc.
```

## Ignoring Files

Create `.chezmoiignore` inside a directory in the source repo to exclude subdirectories/files:

```
extensions/
node_modules/
```

## Steps

### 1. Determine the action

- If `$ARGUMENTS` is a file path: run `chezmoi add <path>`
- If `$ARGUMENTS` is a chezmoi subcommand: run `chezmoi $ARGUMENTS`
- If `$ARGUMENTS` is empty: run `chezmoi managed` to show current state

### 2. Handle push failures

If autoPush fails due to remote divergence:

```bash
chezmoi git -- pull --rebase
chezmoi git -- push
```

### 3. Update README if needed

If files were added or removed, update `README.md` in the source repo to reflect the current managed configs.
