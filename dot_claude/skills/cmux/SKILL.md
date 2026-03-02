---
name: cmux
description: "Manage cmux terminal — workspaces, splits, notifications, sidebar, and browser. Use when the user mentions cmux, wants to manage terminal panes/workspaces, send notifications, read screen content, or use the built-in browser."
user-invocable: true
---

# cmux — Terminal Management

`$ARGUMENTS` — optional subcommand (e.g., "notify", "status", "split", "read", "browser")

## Overview

cmux is a Ghostty-based macOS terminal with vertical tabs, workspaces, notifications, and an integrated browser. Control it via the `cmux` CLI over a Unix socket.

## Environment Variables

cmux auto-sets these in child shells:

| Variable            | Description                                   |
| ------------------- | --------------------------------------------- |
| `CMUX_WORKSPACE_ID` | Current workspace (default for `--workspace`) |
| `CMUX_SURFACE_ID`   | Current surface/tab (default for `--surface`) |
| `CMUX_TAB_ID`       | Current tab (alias for `--tab`)               |
| `CMUX_SOCKET_PATH`  | Unix socket path (default: `/tmp/cmux.sock`)  |

## Common Operations

### Notifications

```bash
# Send notification to current pane
cmux notify --title "Task complete" --body "Tests passed"

# Send notification to specific workspace
cmux notify --title "Build done" --workspace workspace:1

# List and clear notifications
cmux list-notifications
cmux clear-notifications
```

### Sidebar Metadata

```bash
# Set status key-value in sidebar
cmux set-status "task" "reviewing PR #123" --icon "star" --color "#00ff00"
cmux clear-status "task"
cmux list-status

# Progress bar
cmux set-progress 0.75 --label "Running tests"
cmux clear-progress
```

### Workspace Management

```bash
cmux list-workspaces
cmux new-workspace
cmux select-workspace --workspace workspace:2
cmux rename-workspace "my-project"
cmux close-workspace --workspace workspace:3
cmux current-workspace
cmux reorder-workspace --workspace workspace:3 --index 1
```

### Surface/Tab Management

```bash
cmux list-pane-surfaces
cmux new-surface
cmux close-surface --surface surface:2
cmux rename-tab "backend"
cmux move-surface --surface surface:2 --after surface:1
cmux reorder-surface --surface surface:3 --index 1
```

### Split Panes

```bash
cmux new-split right     # Split right (like Cmd+D)
cmux new-split down      # Split down (like Cmd+Shift+D)
cmux list-panes
cmux focus-pane --pane pane:2
cmux resize-pane --pane pane:1 -R --amount 20
cmux swap-pane --pane pane:1 --target-pane pane:2
```

### Screen Reading

```bash
# Read current terminal content
cmux read-screen
cmux read-screen --lines 50
cmux read-screen --scrollback

# Read specific surface
cmux read-screen --surface surface:2
```

### Send Input

```bash
# Send text to a surface
cmux send "echo hello"
cmux send --surface surface:2 "bun test"

# Send key
cmux send-key Enter
cmux send-key --surface surface:2 "C-c"
```

### Browser

```bash
# Open browser in split
cmux browser open "https://example.com"

# Navigation
cmux browser navigate "https://github.com"
cmux browser back
cmux browser forward
cmux browser reload
cmux browser url

# Page inspection
cmux browser snapshot          # Get accessibility tree
cmux browser snapshot --compact
cmux browser eval "document.title"
cmux browser get text
cmux browser get title

# Interaction
cmux browser click "button.submit"
cmux browser fill "input[name=search]" "query"
cmux browser type "textarea" "hello world"
cmux browser press Enter
cmux browser select "select#country" "JP"
cmux browser scroll --dy 500
cmux browser wait --selector ".loaded"

# Console/errors
cmux browser console list
cmux browser errors list
```

### Logging

```bash
cmux log "Starting deployment"
cmux log --level error "Build failed"
cmux list-log --limit 20
cmux clear-log
```

### Claude Code Hook Integration

```bash
# Dedicated hook command for Claude Code events
cmux claude-hook session-start
cmux claude-hook stop
cmux claude-hook notification
```

### Window Management

```bash
cmux list-windows
cmux new-window
cmux focus-window --window window:1
cmux move-workspace-to-window --workspace workspace:1 --window window:2
```

### Utilities

```bash
cmux ping                          # Check connection
cmux version                       # Show version
cmux capabilities                  # List supported features
cmux identify                      # Show current workspace/surface context
cmux find-window --select "query"  # Find window by content
```

## Keyboard Shortcuts Reference

| Action                | Shortcut                  |
| --------------------- | ------------------------- |
| New workspace         | Cmd+N                     |
| Jump to workspace 1-8 | Cmd+1-8                   |
| Last workspace        | Cmd+9                     |
| Close workspace       | Cmd+Shift+W               |
| Rename workspace      | Cmd+Shift+R               |
| Toggle sidebar        | Cmd+B                     |
| New tab               | Cmd+T                     |
| Close tab             | Cmd+W                     |
| Next/prev tab         | Cmd+Shift+] / Cmd+Shift+[ |
| Jump to tab 1-8       | Ctrl+1-8                  |
| Split right           | Cmd+D                     |
| Split down            | Cmd+Shift+D               |
| Focus split           | Opt+Cmd+Arrows            |
| Flash focused panel   | Cmd+Shift+H               |
| Notifications panel   | Cmd+I                     |
| Jump to latest unread | Cmd+Shift+U               |
| Open browser          | Cmd+Shift+L               |
| Clear scrollback      | Cmd+K                     |
| Find                  | Cmd+F                     |

## Steps

### 1. Check cmux availability

```bash
command -v cmux && echo "cmux available" || echo "cmux not installed"
```

### 2. Route by argument

- If `$ARGUMENTS` is empty or "status": run `cmux identify` and `cmux list-status` to show current context
- If `$ARGUMENTS` starts with "notify": send a notification with `cmux notify`
- If `$ARGUMENTS` starts with "split": create a split with `cmux new-split`
- If `$ARGUMENTS` starts with "read": read screen with `cmux read-screen`
- If `$ARGUMENTS` starts with "browser": run `cmux browser` subcommand
- If `$ARGUMENTS` starts with "workspace": run workspace management command
- If `$ARGUMENTS` starts with "shortcuts" or "keys": display the keyboard shortcuts table
- Otherwise: interpret as a direct cmux subcommand and execute
