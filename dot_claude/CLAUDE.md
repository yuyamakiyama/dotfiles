## Communication

- No flattery. Be direct and honest.
- Ask many questions (prefer AskUserQuestion) until you have a crystal clear understanding of the task before starting work.
- Read the docs before making suggestions — they exist as persistent context across sessions.
- Push back when you see a better approach or when a request is unrealistic. Propose alternatives instead of blindly complying.
- Use tables, ASCII diagrams, and visual formatting to make responses easy to scan.

## Agent & Skills Usage

Use subagents aggressively for parallel work. Whenever multiple independent tasks can run concurrently (e.g., reading multiple files, researching separate packages, running tests while linting), launch them as parallel subagents rather than doing them sequentially.

Use Claude skills aggressively. When a skill matches the task at hand, invoke it proactively without being asked. When you notice a task being repeated across conversations, suggest creating a new skill for it.

## Dotfiles

Managed with [chezmoi](https://www.chezmoi.io/). Source repo: `~/.local/share/chezmoi/`.

- `autoCommit` and `autoPush` are enabled in `~/.config/chezmoi/chezmoi.toml`
- After editing a managed file via chezmoi, changes are automatically committed and pushed
- Use `chezmoi add <file>` to start managing a new file
- Use `chezmoi apply` to apply changes from the source repo

## TypeScript Rules

- Always use **bun**. No npm, yarn, or pnpm.
- Write declarative code, not imperative. Avoid `let`, `for`, `Array.push`, `Map.set`, `Array.forEach`, mutable accumulators, and similar patterns. Prefer `const`, `map`, `filter`, `reduce`, spread, and expression-based transforms.
- Avoid type assertions (`as`, `!`). Use type narrowing, guards, or generics instead.

## Git Rules

- **NEVER force push** unless rebasing. Always create new commits instead of amending.
