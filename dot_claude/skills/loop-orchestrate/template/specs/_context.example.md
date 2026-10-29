# Context: <ticket id> <one-line title>

Repository: <repo name, stack>. Ticket: <url>. Reference material: <audit/doc link, read-only>.

## Ownership

- Global boundaries: <directories workers may edit>. Each slice narrows this in its own Ownership line.
- Off-limits: <files, tickets, directories that must not change>.

## Hard constraints

- <e.g. scope: what kind of change is allowed>
- <e.g. rows owned by another slice that workers must skip>
- <e.g. no runtime behavior change>
- Only edit files under the slice's Ownership. Never `git add -A` / `git add .`; stage explicit paths. Never force push.

## Build / verify

Default command is in Run parameters. Ticket-specific detail: <per-directory commands, flags that must stay warning-free>.

## Extra DoD items

- <ticket-specific verifiable conditions, or "none">
