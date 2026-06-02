-- Keymaps are automatically loaded on the VeryLazy event
-- Default keymaps that are always set: https://github.com/LazyVim/LazyVim/blob/main/lua/lazyvim/config/keymaps.lua
-- Add any additional keymaps here

-- GitLens-style: open the GitHub commit that last touched the current line.
local function browse_line_commit()
  local file = vim.api.nvim_buf_get_name(0)
  if file == "" then
    return Snacks.notify.warn("No file in buffer", { title = "Git Browse" })
  end
  local dir = vim.fn.fnamemodify(file, ":h")
  local line = vim.fn.line(".")
  local out = vim.fn.system({ "git", "-C", dir, "blame", "-L", line .. "," .. line, "--porcelain", "--", file })
  if vim.v.shell_error ~= 0 then
    return Snacks.notify.error(vim.trim(out), { title = "Git Browse" })
  end
  local hash = out:match("^(%x+)")
  if not hash or hash:match("^0+$") then
    return Snacks.notify.warn("Line is not committed yet", { title = "Git Browse" })
  end
  Snacks.gitbrowse({ what = "commit", commit = hash })
end

vim.keymap.set("n", "<leader>go", browse_line_commit, { desc = "Browse line commit (GitHub)" })
