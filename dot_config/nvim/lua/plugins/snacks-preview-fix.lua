local function center()
  local view = vim.fn.winsaveview()
  local info = vim.fn.getwininfo(vim.api.nvim_get_current_win())[1]
  local height = vim.api.nvim_win_get_height(0)
  local width = vim.api.nvim_win_get_width(0) - info.textoff
  vim.fn.winrestview({
    topline = math.max(1, view.lnum - math.floor(height / 2)),
    leftcol = math.max(0, view.col - width + 1),
  })
end

return {
  {
    "folke/snacks.nvim",
    opts = function()
      local Preview = require("snacks.picker.core.preview")
      if Preview._loc_patched then
        return
      end
      Preview._loc_patched = true
      local loc = Preview.loc
      -- `norm!` in the preview while the picker input is in insert mode moves the input cursor back (Neovim 0.12)
      Preview.loc = function(self, ...)
        local cmd = vim.cmd
        vim.cmd = setmetatable({}, {
          __index = cmd,
          __call = function(_, c, ...)
            if c == "norm! zzze" then
              return center()
            end
            return cmd(c, ...)
          end,
        })
        local ok, err = pcall(loc, self, ...)
        vim.cmd = cmd
        if not ok then
          error(err, 0)
        end
      end
    end,
  },
}
