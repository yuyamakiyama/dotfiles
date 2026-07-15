---
name: difit
description: "Open diffs in difit, a GitHub-style diff viewer. Use when reviewing code changes locally — uncommitted changes, specific commits, branch comparisons, or GitHub PRs."
---

# difit — GitHub-Style Diff Viewer

`$ARGUMENTS` — optional target (commit, branch, `.`, `staged`, `working`, or `--pr <url>`)

## Overview

difit launches a local web server to display Git diffs with a GitHub-like "Files changed" UI. It supports line comments that can be formatted as AI prompts.

## Usage

Run `bunx difit` with the appropriate arguments. The browser opens automatically.

### Common Patterns

```bash
# Uncommitted changes (staged + unstaged)
bunx difit .

# Only staged changes
bunx difit staged

# Latest commit (HEAD)
bunx difit

# Specific commit
bunx difit <commit-hash>

# Compare current branch vs base
bunx difit @ main
bunx difit @ origin/release/1.228.x

# Compare two branches
bunx difit feature-branch main

# GitHub PR
bunx difit --pr https://github.com/owner/repo/pull/123
```

### Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `--pr <url>` | — | Review a GitHub PR |
| `--port <n>` | 4966 | Server port |
| `--no-open` | false | Don't auto-open browser |
| `--mode <m>` | split | `unified` or `split` view |
| `--clean` | false | Clear comments and viewed state |
| `--include-untracked` | false | Include untracked files (with `.` or `working`) |

## Steps

### 1. Determine the target

- If `$ARGUMENTS` is empty or not provided: use `.` (uncommitted changes) as default
- If `$ARGUMENTS` contains a GitHub PR URL: use `--pr <url>`
- Otherwise: pass `$ARGUMENTS` directly

### 2. Launch difit

```bash
bunx difit $ARGUMENTS
```

Run in the background so it doesn't block the conversation. The user will review diffs in their browser.

### 3. Report

Tell the user difit is running and they can review changes in their browser.
