source <(fzf --zsh)

function fzf-select-history() {
    BUFFER=$(history -n -r 1 | fzf --query "$LBUFFER" --reverse)
    CURSOR=$#BUFFER
    zle reset-prompt
}
zle -N fzf-select-history
bindkey '^r' fzf-select-history

if [[ -n $(echo ${^fpath}/chpwd_recent_dirs(N)) && -n $(echo ${^fpath}/cdr(N)) ]]; then
    autoload -Uz chpwd_recent_dirs cdr add-zsh-hook
    add-zsh-hook chpwd chpwd_recent_dirs
    zstyle ':completion:*' recent-dirs-insert both
    zstyle ':chpwd:*' recent-dirs-default true
    zstyle ':chpwd:*' recent-dirs-max 1000
    zstyle ':chpwd:*' recent-dirs-file "$HOME/.cache/chpwd-recent-dirs"
fi

function fzf-cdr () {
  local selected_dir="$(cdr -l 2>/dev/null | sed 's/^[0-9]\+ \+//' | fzf --prompt="cdr >" --query "$LBUFFER")"
  if [ -n "$selected_dir" ] && [ -d "$selected_dir" ]; then
    cd "$selected_dir"
    clear
  fi
}

zle -N fzf-cdr
bindkey '^G' fzf-cdr

function fzf-src () {
  local selected_dir=$(ghq list -p 2>/dev/null | fzf --prompt="repositories >" --query "$LBUFFER")
  if [ -n "$selected_dir" ] && [ -d "$selected_dir" ]; then
    cd "${selected_dir}"
    clear
  fi
}

zle -N fzf-src
bindkey '^P' fzf-src
