return {
  "kawre/leetcode.nvim",
  cmd = "Leet",
  dependencies = {
    "nvim-lua/plenary.nvim",
    "MunifTanjim/nui.nvim",
  },
  opts = {
    lang = "typescript",
    picker = { provider = "snacks-picker" },
    console = {
      dir = "col",
      size = { width = "75%", height = "45%" },
      testcase = { size = "45%", virt_text = true },
      result = { size = "55%" },
    },
    hooks = {
      ["question_enter"] = {
        function(question)
          local map = function(lhs, rhs, desc)
            vim.keymap.set("n", lhs, rhs, { buffer = question.bufnr, desc = desc })
          end
          map("<leader>r", "<cmd>Leet run<cr>", "LeetCode Run")
          map("<leader>s", "<cmd>Leet submit<cr>", "LeetCode Submit")
          map("<leader>c", "<cmd>Leet console<cr>", "LeetCode Console")
        end,
      },
    },
  },
}
