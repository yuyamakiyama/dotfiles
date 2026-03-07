local web_ft = { "typescript", "javascript", "typescriptreact", "javascriptreact", "json", "css" }

local function use_biome()
  return vim.fs.find("biome.json", { upward = true, path = vim.fn.expand("%:p:h") })[1] ~= nil
end

local function web_formatter()
  if use_biome() then
    return { "biome" }
  end
  return { "prettierd" }
end

local formatters_by_ft = {}
for _, ft in ipairs(web_ft) do
  formatters_by_ft[ft] = web_formatter
end

return {
  {
    "stevearc/conform.nvim",
    opts = {
      formatters_by_ft = formatters_by_ft,
    },
  },
}
