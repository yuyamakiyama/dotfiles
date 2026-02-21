# dotfiles

Managed with [chezmoi](https://www.chezmoi.io/).

## Managed Configs

| App | File |
|---|---|
| Ghostty | `~/.config/ghostty/config` |
| Karabiner-Elements | `~/.config/karabiner/karabiner.json` |
| Raycast | `~/.config/raycast/extensions.txt` |
| ccstatusline | `~/.config/ccstatusline/settings.json` |
| Cursor | `~/.config/cursor/settings.json` |
| Claude Code | `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, `~/.claude/skills/` |
| zsh | `~/.zshrc`, `~/.zsh/` |

## Symlinks

| Source | Target |
|---|---|
| `~/.config/cursor/settings.json` | `~/Library/Application Support/Cursor/User/settings.json` |

Symlinks are created automatically by `run_once_setup-symlinks.sh` during `chezmoi apply`.

## Setup

```sh
chezmoi init https://github.com/yuyamakiyama/dotfiles.git
chezmoi apply
```
