-- Override snacks.nvim tree formatter to use narrower indent (1 col per level instead of 2)
local function narrow_tree(item, picker)
  local ret = {} ---@type snacks.picker.Highlight[]
  local indent = {} ---@type string[]
  local node = item
  while node and node.parent do
    local is_last, icon = node.last, ""
    if node ~= item then
      icon = is_last and " " or "│"
    else
      icon = is_last and "└" or "├"
    end
    table.insert(indent, 1, icon)
    node = node.parent
  end
  ret[#ret + 1] = { table.concat(indent), "SnacksPickerTree" }
  return ret
end

return {
  {
    "folke/snacks.nvim",
    opts = {
      picker = {
        sources = {
          explorer = {
            hidden = true,
            ignored = true,
            layout = { layout = { width = 45, min_width = 45 } },
            format = function(item, picker)
              local ret = {} ---@type snacks.picker.Highlight[]
              local F = require("snacks.picker.format")

              if item.label then
                ret[#ret + 1] = { item.label, "SnacksPickerLabel" }
                ret[#ret + 1] = { " ", virtual = true }
              end

              if item.parent then
                vim.list_extend(ret, narrow_tree(item, picker))
              end

              if item.status then
                vim.list_extend(ret, F.file_git_status(item, picker))
              end

              if item.severity then
                vim.list_extend(ret, F.severity(item, picker))
              end

              vim.list_extend(ret, F.filename(item, picker))

              if item.comment then
                table.insert(ret, { item.comment, "SnacksPickerComment" })
                table.insert(ret, { " " })
              end

              return ret
            end,
          },
          files = {
            hidden = true,
          },
        },
      },
    },
  },
}
