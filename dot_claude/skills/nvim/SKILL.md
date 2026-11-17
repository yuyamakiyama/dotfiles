---
name: nvim
description: "Neovim shortcut cheat sheet. Use when the user asks how to do something in neovim, vim, or asks for keybindings/shortcuts."
---

# nvim — Neovim Shortcut Helper

`$ARGUMENTS` — a natural language description of what the user wants to do in neovim

## User's Setup

- **LazyVim** (default keymaps plus a few custom ones in `~/.config/nvim/lua/config/keymaps.lua`)
- Leader key: `<Space>`
- Plugins: flash.nvim, which-key, mini.ai, mini.pairs, gitsigns, trouble, snacks, grug-far, bufferline, noice, conform, nvim-lint, persistence, todo-comments, ts-comments, nvim-treesitter-textobjects, nvim-ts-autotag

## Response Format

1. **First line**: The keystrokes in backtick-wrapped format. Keep it to ONE line. If there are multiple approaches, show the best one first, then alternatives separated by `|`.
2. **Breakdown**: Below the keystrokes, show what each key stands for in a compact `key` = meaning format.
3. **Optional tip** (only if genuinely useful): Add 1-2 short lines prefixed with "Tip:" after a blank line.

Prefer LazyVim keybindings over vanilla Vim equivalents when both exist. For example, suggest `H`/`L` for buffer navigation instead of `[b`/`]b`, and `<leader>bd` instead of `:bd`. LazyVim remaps should be the primary suggestion, with vanilla Vim as alternatives.

Keep answers terse: keystrokes, breakdown, optional tip.

## Examples

User: "delete all items in an array"
Response:
`vi[d` — select inner brackets then delete
`v` = visual mode, `i` = inner, `[` = bracket pair, `d` = delete

Tip: `va[d` deletes the brackets too (`a` = around). Works with `{`, `(`, `<` as well.

User: "go to line 5 from current line"
Response:
`5j` (down) | `5k` (up)
`5` = count, `j` = down, `k` = up

Tip: `5G` jumps to absolute line 5 (`G` = go to line). `:5<CR>` does the same via command mode.

User: "go to next buffer"
Response:
`L` (next) | `H` (prev)
`L` = next buffer, `H` = prev buffer (LazyVim remaps)

Tip: `<leader>fb` opens the buffer picker to jump to any buffer. `<leader>bd` to close current buffer.

User: "find and replace foo with bar in the whole file"
Response:
`:%s/foo/bar/g`
`%` = whole file, `s` = substitute, `g` = global (all occurrences per line)

Tip: Add `c` flag (`gc`) for confirmation on each match. `<leader>sr` opens grug-far for project-wide search/replace.

User: "comment out this line"
Response:
`gcc`
`gc` = toggle comment (operator), `c` = current line (doubled operator = line)

Tip: `gc` + motion (e.g., `gcip`) comments a paragraph (`ip` = inner paragraph). Provided by ts-comments.nvim.

User: "jump to a word I can see on screen"
Response:
`s` then type 2 chars of the target word (flash.nvim)
`s` = flash search (plugin replaces default `s`)

Tip: After matches appear, type the label letter to jump. `S` for treesitter-based selection.

## LazyVim Key Reference

Keep these in mind when answering:

### Leader (`<Space>`) Groups

- `<leader>f` — Find (snacks picker): `ff` files, `fg` grep, `fb` buffers, `fr` recent
- `<leader>s` — Search: `sg` grep, `ss` symbols, `sr` replace (grug-far)
- `<leader>c` — Code: `ca` action, `cr` rename, `cf` format
- `<leader>g` — Git: `gg` lazygit, `gb` blame, `gd` diff
- `<leader>b` — Buffers: `bd` delete, `bp` pin, `bo` close others
- `<leader>w` — Windows: `wd` delete, `ws` split, `wv` vsplit
- `<leader>x` — Diagnostics/Trouble: `xx` toggle, `xq` quickfix
- `<leader>u` — UI toggles: `uw` wrap, `ul` line numbers, `ud` diagnostics
- `<leader>q` — Quit/Session: `qq` quit, `qs` restore session

### Navigation

- `gd` go to definition, `gr` references, `gI` implementation, `gy` type definition
- `K` hover doc, `gK` signature help
- `]d` / `[d` next/prev diagnostic
- `H` / `L` prev/next buffer (LazyVim remap, preferred over `[b`/`]b`)
- `]]` / `[[` next/prev function (treesitter)
- `<C-h/j/k/l>` window navigation
- `<A-j>` / `<A-k>` move line up/down

### Editing

- `gcc` toggle line comment, `gc{motion}` toggle comment
- `vi{char}` select inside, `va{char}` select around (enhanced by mini.ai)

### Flash.nvim

- `s` — jump to char (2-char search)
- `S` — treesitter select
- `r` — remote flash (in operator-pending mode)
- `<C-s>` — toggle flash in telescope

If the question is ambiguous, give the most common interpretation first, then mention alternatives.
