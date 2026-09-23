# dotfiles

Managed with [chezmoi](https://www.chezmoi.io/).

## Managed Configs

| App                | File                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| Ghostty            | `~/.config/ghostty/config`                                                                     |
| Karabiner-Elements | `~/.config/karabiner/karabiner.json`                                                           |
| Raycast            | `~/.config/raycast/extensions.txt`                                                             |
| ccstatusline       | `~/.config/ccstatusline/settings.json`                                                         |
| Cursor             | `~/.config/cursor/settings.json`                                                               |
| Claude Code        | `~/.claude/settings.base.json`, `~/.claude/CLAUDE.md`, `~/.claude/hooks/`, `~/.claude/skills/` |
| Codex              | `~/.codex/config.toml`, `~/.codex/AGENTS.md`, `~/.codex/hooks/`, `~/.codex/skills/`            |
| Neovim             | `~/.config/nvim/`                                                                              |
| duti               | `~/.config/duti/duti`, `~/duti.sh`                                                             |
| cmux               | `~/.config/cmux/cmux.json`                                                                     |
| macOS KeyBindings  | `~/Library/KeyBindings/DefaultKeyBinding.dict`                                                 |
| zsh                | `~/.zshrc`, `~/.zsh/`                                                                          |
| Orca               | `~/.orca/keybindings.json`, `~/.config/orca/settings.json` (curated app settings)              |

## Agent Configs

Claude Code and Codex keep tool-specific entry points separate:

- Claude Code: `~/.claude/CLAUDE.md`, `~/.claude/settings.base.json`
- Codex: `~/.codex/AGENTS.md`, `~/.codex/config.toml`

Shared hooks and skills are canonical under `~/.claude`. The matching `~/.codex` paths are symlinks managed by chezmoi, so update the Claude copy only:

- `hooks/block-japanese-commit.ts`
- `hooks/flag-redundant-comments.ts`
- `skills/chezmoi/`
- `skills/cmux/`
- `skills/difit/`
- `skills/nb/`
- `skills/nvim/`
- `skills/pr-status/`
- `skills/stop-slop/`

## Orca

Orca keeps `.settings` inside `~/Library/Application Support/orca/profiles/local-default/orca-data.json`, alongside volatile app state (repos, worktrees, sessions) that must never be put under chezmoi management. Instead:

- `~/.config/orca/settings.json` is a curated, hand-refreshed copy of `.settings`, minus machine-specific values, secrets, app-owned migration flags, and UI state. It's a normal chezmoi target — edit it (or re-export, below) and `chezmoi add` it like any other file.
- A `modify_` script (source: `Library/Application Support/private_orca/profiles/private_local-default/modify_orca-data.json`) shallow-merges that curated file's keys into the live `orca-data.json`'s `.settings` on every `chezmoi apply`, leaving every other key and all volatile state untouched. It refuses to run (passes the file through unchanged, with a warning) while Orca is open — quit Orca before running `chezmoi apply` if you want settings changes to take effect.

**Refreshing the curated file** after changing settings in the Orca UI:

```sh
LIVE="$HOME/Library/Application Support/orca/profiles/local-default/orca-data.json"
jq '.settings' "$LIVE" | jq -f ~/.local/share/chezmoi/.orca-settings-exclude.jq > ~/.config/orca/settings.json
chezmoi add ~/.config/orca/settings.json
```

The exclusion list lives in `.orca-settings-exclude.jq` at the source repo root (a dot-prefixed file, so chezmoi never treats it as a target).

## Symlinks

| Source                           | Target                                                    |
| -------------------------------- | --------------------------------------------------------- |
| `~/.config/cursor/settings.json` | `~/Library/Application Support/Cursor/User/settings.json` |

Symlinks are created automatically by `run_once_setup-symlinks.sh` during `chezmoi apply`.

## Setup

```sh
chezmoi init https://github.com/yuyamakiyama/dotfiles.git
chezmoi apply
```
