## Communication

- No flattery. Be direct and honest.
- Ask many questions (prefer AskUserQuestion) until you have a crystal clear understanding of the task before starting work.
- Read the docs before making suggestions — they exist as persistent context across sessions.
- Research the codebase before editing. Never change code you haven't read.
- Push back when you see a better approach or when a request is unrealistic. Propose alternatives instead of blindly complying.
- Use tables, ASCII diagrams, and visual formatting to make responses easy to scan.

## Agent & Skills Usage

Use subagents aggressively for parallel work. Whenever multiple independent tasks can run concurrently (e.g., reading multiple files, researching separate packages, running tests while linting), launch them as parallel subagents rather than doing them sequentially.

Use Claude skills aggressively. When a skill matches the task at hand, invoke it proactively without being asked. When you notice a task being repeated across conversations, suggest creating a new skill for it.

## Dotfiles

Managed with [chezmoi](https://www.chezmoi.io/). Source repo: `~/.local/share/chezmoi/`.

- `autoCommit` and `autoPush` are enabled in `~/.config/chezmoi/chezmoi.toml`
- Edit the **source** (`chezmoi edit` / the source repo), never the live target directly, then `chezmoi apply` — editing the target leaves it diverged from source
- `chezmoi add <file>` to manage a new file; `chezmoi apply` to push source → live

## TypeScript Rules

- Always use **bun**. No npm, yarn, or pnpm.
- Write declarative code, not imperative. Avoid `let`, `for`, `Array.push`, `Map.set`, `Array.forEach`, mutable accumulators, and similar patterns. Prefer `const`, `map`, `filter`, `reduce`, spread, and expression-based transforms.
- Avoid type assertions (`as`, `!`). Use type narrowing, guards, or generics instead.

## Code Comments

- **Default to zero comments.** Do not add comments unless I ask for them.
- Never explain _what_ the code does — names already do that.
- Never write comments that paraphrase the diff ("autoFocus so the keyboard opens", "use Platform.OS to gate Android-only"). If a reader can derive it from the line below, delete the comment.
- The only acceptable comment is a _load-bearing why_ — a hidden invariant, a subtle race, a workaround for a specific upstream bug, or a non-obvious constraint that would surprise a future reader. Even then, one short line.
- Do not narrate prior bugs, prior PRs, or "without this, X happens" in code comments — that belongs in the commit message / PR description.

## Git Rules

- **NEVER force push** unless rebasing. Always create new commits instead of amending.
- Never `git add -A` or `git add .` — stage specific paths so unrelated changes don't sneak into a commit.
