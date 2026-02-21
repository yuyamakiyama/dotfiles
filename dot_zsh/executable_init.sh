#!/bin/bash

# init.sh - Initialize zsh configuration by installing necessary packages
# This script installs all required packages for the zsh setup

set -e

ZSH_DIR="$HOME/.zsh"

PREZTO_DIR="$ZSH_DIR/.zprezto"
PREZTORC="$PREZTO_DIR/runcoms/zpreztorc"
if [ -d "$PREZTO_DIR" ]; then
  echo "✓ .zprezto already exists, skipping..."
else
  echo "Cloning .zprezto (this may take a while due to submodules)..."
  git clone --recursive https://github.com/sorin-ionescu/prezto.git "$PREZTO_DIR"
  echo "✓ .zprezto cloned successfully"
fi

BREW_PACKAGES=(
  "fzf"
  "zsh-syntax-highlighting"
  "zsh-autosuggestions"
)

install_brew_package() {
  local package=$1
  
  if brew list "$package" &>/dev/null; then
    echo "✓ $package already installed via Homebrew, skipping..."
    return 0
  fi
  
  echo "Installing $package via Homebrew..."
  brew install "$package"
  echo "✓ $package installed successfully"
}

if [ -f "$PREZTORC" ]; then
  if grep -q "^# zstyle ':prezto:module:prompt' theme 'pure'" "$PREZTORC"; then
    echo "Enabling prompt theme in zpreztorc..."
    sed -i '' "s/^# zstyle ':prezto:module:prompt' theme 'pure'/zstyle ':prezto:module:prompt' theme 'pure'/" "$PREZTORC"
    echo "✓ Prompt theme enabled"
  fi
fi

for package in "${BREW_PACKAGES[@]}"; do
  install_brew_package "$package"
done

ZSRC_SOURCE="$ZSH_DIR/.zshrc"
ZSRC_TARGET="$HOME/.zshrc"

if [ -L "$ZSRC_TARGET" ]; then
  echo "✓ .zshrc symlink already exists"
elif [ -f "$ZSRC_SOURCE" ]; then
  [ -f "$ZSRC_TARGET" ] && mv "$ZSRC_TARGET" "${ZSRC_TARGET}.backup.$(date +%Y%m%d_%H%M%S)"
  ln -s "$ZSRC_SOURCE" "$ZSRC_TARGET"
  echo "✓ Created .zshrc symlink"
else
  echo "⚠ Warning: $ZSRC_SOURCE not found, skipping symlink creation"
fi

echo ""
echo "✓ All packages installed successfully!"
echo "You can now source ~/.zshrc to use your zsh configuration."

