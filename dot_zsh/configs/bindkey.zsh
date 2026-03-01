function insert-newline() {
  LBUFFER+=$'\n'
}
zle -N insert-newline
# Ghostty / iTerm2
bindkey '\e[27;2;13~' insert-newline
# Cursor / VSCode (via keybindings.json sendSequence)
bindkey '\e[13;2u' insert-newline

# Resize cmux panes (Cmd+Shift+Arrow)
# Moves the divider in the arrow direction. If the focused pane has no border
# on that side, resizes the neighbor pane instead.
function _cmux-resize() {
  local dir=$1
  if ! cmux resize-pane -$dir --amount 150 2>/dev/null; then
    local focused=$(cmux identify --no-caller 2>/dev/null | sed -n 's/.*"pane_ref" *: *"\([^"]*\)".*/\1/p')
    local other=$(cmux list-panes 2>/dev/null | grep -v '\[focused\]' | grep -o 'pane:[0-9]*' | head -1)
    [[ -n $other ]] && cmux resize-pane --pane "$other" -$dir --amount 150 2>/dev/null
  fi
}
function cmux-resize-left()  { _cmux-resize L }
function cmux-resize-right() { _cmux-resize R }
function cmux-resize-up()    { _cmux-resize U }
function cmux-resize-down()  { _cmux-resize D }
zle -N cmux-resize-left
zle -N cmux-resize-right
zle -N cmux-resize-up
zle -N cmux-resize-down
bindkey '\e[1;10D' cmux-resize-left
bindkey '\e[1;10C' cmux-resize-right
bindkey '\e[1;10A' cmux-resize-up
bindkey '\e[1;10B' cmux-resize-down
