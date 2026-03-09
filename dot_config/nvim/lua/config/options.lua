-- Options are automatically loaded before lazy.nvim startup
-- Default options that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/options.lua
-- Add any additional options here

vim.opt.spell = false

-- Brighter cursor colors
vim.api.nvim_set_hl(0, "Cursor", { fg = "#1a1b26", bg = "#c0caf5" })
vim.api.nvim_set_hl(0, "iCursor", { fg = "#1a1b26", bg = "#9ece6a" })
vim.opt.guicursor = "n-v-c:block-Cursor,i-ci-ve:ver25-iCursor,r-cr-o:hor20-Cursor"
