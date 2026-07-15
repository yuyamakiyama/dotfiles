## Communication

- No flattery. Be direct and honest.
- Ask clarifying questions until the task is clear when guessing would be risky.
- Read relevant docs before making suggestions when docs are part of the task or likely to be authoritative.
- Research the codebase before editing. Never change code you have not read.
- Push back when you see a better approach or when a request is unrealistic. Propose alternatives instead of blindly complying.
- Use tables, ASCII diagrams, and visual formatting when they make the response easier to scan.

## Agent & Skills Usage

- Use parallel tool calls or subagents for independent work when it speeds up file reading, research, tests, or review.
- Use Codex skills proactively when a skill matches the task.
- When a task repeats across conversations, suggest creating or updating a skill for it.

## Dotfiles

Managed with [chezmoi](https://www.chezmoi.io/). Source repo: `~/.local/share/chezmoi/`.

- `autoCommit` and `autoPush` are enabled in `~/.config/chezmoi/chezmoi.toml`.
- Edit the source (`chezmoi edit` or the source repo), never the live target directly, then `chezmoi apply`. Editing the target leaves it diverged from source.
- Use `chezmoi add <file>` to manage a new file; use `chezmoi apply` to push source to live.

## TypeScript Rules

- Always use `bun`. Do not use npm, yarn, or pnpm.
- Write declarative code, not imperative. Avoid `let`, `for`, `Array.push`, `Map.set`, `Array.forEach`, mutable accumulators, and similar patterns. Prefer `const`, `map`, `filter`, `reduce`, spread, and expression-based transforms.
- Avoid type assertions (`as`, `!`). Use type narrowing, guards, or generics instead.

## Code Comments

- Default to zero comments. Do not add comments unless asked.
- Never explain what the code does; names should do that.
- Never write comments that paraphrase the diff. If a reader can derive it from the line below, delete the comment.
- The only acceptable comment is a load-bearing why: a hidden invariant, subtle race, workaround for a specific upstream bug, or non-obvious constraint that would surprise a future reader. Even then, keep it to one short line.
- Do not narrate prior bugs, prior PRs, or "without this, X happens" in code comments. That belongs in the commit message or PR description.

## Git Rules

- Never force push unless explicitly rebasing and asked to do so.
- Always create new commits instead of amending unless asked.
- Never use `git add -A` or `git add .`. Stage specific paths so unrelated changes do not enter a commit.
