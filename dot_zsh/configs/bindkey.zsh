function insert-newline() {
  LBUFFER+=$'\n'
}
zle -N insert-newline
# Ghostty / iTerm2
bindkey '\e[27;2;13~' insert-newline
# Cursor / VSCode (via keybindings.json sendSequence)
bindkey '\e[13;2u' insert-newline
