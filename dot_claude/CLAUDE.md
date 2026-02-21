## Notes management

When the user refers to "note" or "nb", use the `nb` CLI. Notes are stored in `~/.nb/<notebook-name>/` as markdown files with git tracking.

### Reading

```bash
nb list                              # List all notes
nb list --tags <tag>                 # Filter by tag
nb show <id> --no-color              # Display content (use --no-color to avoid ANSI codes)
nb search "query"                    # Search content
nb search "#tag" --list              # Find notes with tag
nb todos                             # List all todos
nb todos --tags <tag>                # Filter todos by tag
```

### Creating

**CRITICAL**: `-t` adds `# Title` as H1 header automatically. Do NOT include H1 in content or it duplicates.

**File naming convention**: All files use `<createdAt>.todo.md` format (e.g., `20260218091344.todo.md`). Use `-f` to set the filename explicitly.

```bash
nb todo add "Title"                                      # Create todo (.todo.md) with auto-generated timestamp name
nb todo add "Title" --description "Desc" --tags tag1     # Todo with metadata
nb todo add "Title" --task "Subtask 1" --task "Subtask 2"  # Todo with subtasks
nb import /path/to/file.md                               # Import existing file (copy)
nb import move /path/to/file.md                          # Import by moving
```

### Editing

**CRITICAL**: `--content` APPENDS by default!

```bash
nb edit <id> --content "text" --overwrite    # Replace entire content
nb edit <id> --content "text"                # Append (rarely wanted)
nb edit <id> --content "text" --prepend      # Prepend
```

For complex edits, directly modify files in `~/.nb/home/` then run `nb index reconcile`.

### Task Management

```bash
nb do <id> <task-number>      # Mark task done
nb undo <id> <task-number>    # Mark task undone
nb todo delete <id> --force   # Delete todo
```

### Todo File Format

Todos use `.todo.md` extension with checkbox in title:

```markdown
# [ ] Todo Title

#tag1 #tag2

Content here...
```

Use `# [x] Title` for completed todos.

## Dotfiles

Managed with [chezmoi](https://www.chezmoi.io/). Source repo: `~/.local/share/chezmoi/`.

- `autoCommit` and `autoPush` are enabled in `~/.config/chezmoi/chezmoi.toml`
- After editing a managed file via chezmoi, changes are automatically committed and pushed
- Use `chezmoi add <file>` to start managing a new file
- Use `chezmoi apply` to apply changes from the source repo

## Git Rules
- **NEVER force push** unless rebasing. Always create new commits instead of amending.
