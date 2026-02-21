#!/bin/bash

# Cursor: symlink from Library path to ~/.config/cursor
mkdir -p "$HOME/Library/Application Support/Cursor/User"
ln -sf "$HOME/.config/cursor/settings.json" "$HOME/Library/Application Support/Cursor/User/settings.json"
