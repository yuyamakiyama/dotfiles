-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

-- Cmd+Z sends <C-_> in cmux; remap to undo instead of terminal toggle
vim.keymap.set({ "n", "i", "v" }, "<C-_>", "<cmd>undo<cr>", { desc = "Undo" })
