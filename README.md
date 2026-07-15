# dotfiles

Managed with [chezmoi](https://www.chezmoi.io/).

## Managed Configs

| App                | File                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------- |
| Ghostty            | `~/.config/ghostty/config`                                                                   |
| Karabiner-Elements | `~/.config/karabiner/karabiner.json`                                                         |
| Raycast            | `~/.config/raycast/extensions.txt`                                                           |
| ccstatusline       | `~/.config/ccstatusline/settings.json`                                                       |
| Cursor             | `~/.config/cursor/settings.json`                                                             |
| Claude Code        | `~/.claude/settings.base.json`, `~/.claude/CLAUDE.md`, `~/.claude/hooks/`, `~/.claude/skills/` |
| Codex              | `~/.codex/config.toml`, `~/.codex/AGENTS.md`, `~/.codex/hooks/`, `~/.codex/skills/`           |
| Neovim             | `~/.config/nvim/`                                                                            |
| duti               | `~/.config/duti/duti`, `~/duti.sh`                                                           |
| cmux               | `~/.config/cmux/cmux.json`                                                                   |
| macOS KeyBindings  | `~/Library/KeyBindings/DefaultKeyBinding.dict`                                               |
| zsh                | `~/.zshrc`, `~/.zsh/`                                                                        |

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
- `skills/stop-slop/`

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
