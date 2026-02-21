# dotfiles

Managed with [chezmoi](https://www.chezmoi.io/).

## Managed Configs

| App | File |
|---|---|
| Ghostty | `~/.config/ghostty/config` |
| Karabiner-Elements | `~/.config/karabiner/karabiner.json` |
| Raycast | `~/.config/raycast/extensions.txt` |
| ccstatusline | `~/.config/ccstatusline/settings.json` |
| Claude Code | `~/.claude/settings.json` |
| Cursor | `~/Library/Application Support/Cursor/User/settings.json` |

## Setup

```sh
chezmoi init https://github.com/yuyamakiyama/dotfiles.git
chezmoi apply
```
