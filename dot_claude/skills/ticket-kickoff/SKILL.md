---
name: ticket-kickoff
description: Use at the start of work on a ticket, typically as the first prompt in a new Orca worktree (e.g. "/ticket-kickoff <url>"). Opens the ticket URL in Orca's embedded browser, explains the ticket in a visual artifact, and ends the artifact with AskUserQuestion-style questions whose answers are copied back as one prompt. Accepts a Jira, GitLab, or GitHub issue/MR/PR URL.
---

# ticket-kickoff — open, explain, ask

Input: one URL (Jira issue, GitLab issue/MR, GitHub issue/PR). If no URL is given, ask for it and stop.

## Steps

1. **Open in Orca.** Load the `orca-cli` skill, then run `orca goto --url <url> --json` in the current worktree. On `browser_no_tab`, run `orca tab create --url <url> --json`. The tab is for the user to read along; do not scrape it for ticket content.
2. **Fetch the ticket.** Read it through an API, not the browser:
   - Jira: Atlassian MCP `getJiraIssue` (description, acceptance criteria, comments, linked issues, attachments list).
   - GitLab: `glab issue view <n> --comments` or `glab mr view <n> --comments` in the matching repo.
   - GitHub: `gh issue view <n> --comments` or `gh pr view <n> --comments`.
     If the ticket cannot be read, report the exact error and stop.
3. **Ground it in the code.** Dispatch one `Explore` subagent (`model: "sonnet"`, `run_in_background: true`) with the ticket summary. It finds the code the ticket touches and returns `file:line` references, the current behavior, and anything in the code that contradicts the ticket. Include the DELEGATION.md escalation passage and a DoD (every claim has `file:line`; contradictions listed; ✅/❌ per item).
4. **Write the artifact.** Load `artifact-design`, then write `<scratchpad>/ticket-<KEY>/index.html` and publish it with the Artifact tool, icon `ticket`. Republish to the same path on reruns. Follow the CLAUDE.md doc rules: diagrams for flows, architecture and sequences; tables for comparisons; no text-only sections.
5. **Open the artifact in Orca.** Run `orca tab create --url <artifact url> --json` so the artifact opens in a new tab beside the ticket tab. On a republish, switch to the existing artifact tab (`orca tab list --json`, then `orca tab switch --index <n> --json`) and run `orca reload --json` instead of opening another tab.
6. **Terminal reply.** Lead with the single next action (usually "answer the questions in the artifact and paste the prompt back"). Then the artifact link and the question count. No ticket summary in the terminal.
7. **Answers pasted back.** When the user pastes a prompt beginning `Answers for the /ticket-kickoff questions on`, treat each line as a decision. Restate the resulting scope in one table, then ask whether to start implementation.
8. **Record for revu.** Runs right after the step 4 publish succeeds, before step 5, on every publish and republish. Take the artifact URL from the Artifact tool's publish result and run:

   ```
   bun ~/.claude/skills/_shared/revu-record.ts --kind ticket-kickoff --title "<KEY> <title>" --artifact-url <artifact url> --html <scratchpad>/ticket-<KEY>/index.html [--ticket-key <KEY>] [--pr-url <url>]
   ```

   Pass `--ticket-key` with the Jira key (or the key in the GitLab/GitHub title or branch name); omit it when there is none. Pass `--pr-url` only when the input URL is a PR/MR. If the helper exits non-zero, report its error and carry on; do not block the artifact on it.

## Artifact sections

Page order:

| #   | Section            | Content                                                                         |
| --- | ------------------ | ------------------------------------------------------------------------------- |
| 1   | Header             | Ticket key, title linked to the URL, type, status, assignee, priority           |
| 2   | Next action        | One line                                                                        |
| 3   | TL;DR              | 2–3 plain-language sentences: what is asked and why                             |
| 4   | In plain words     | Non-technical explanation of the issue; see below                               |
| 5   | Context            | Diagram of the affected flow or architecture, current vs. desired behavior      |
| 6   | Requirements       | Table: requirement, source (description / AC / comment), `file:line` it maps to |
| 7   | Affected code      | Table from step 3: file, role, expected change                                  |
| 8   | Risks and unknowns | Contradictions, missing info, breaking-change risk                              |
| 9   | Questions          | See below                                                                       |

Only state what the ticket or code says. Anything inferred goes under Risks and unknowns, marked as inferred.

## Plain-language explanation

Sections 2–5 and every question are written for a reader who is not a developer. Sections 6–8 stay technical.

- No jargon, class names, method names, or acronyms. If a technical term is unavoidable, define it in the same sentence ("the map's icon loader — the part that fetches the little pictures shown on the map").
- Describe the issue from the end user's point of view: what someone using the app sees, does, or waits for.
- "In plain words" answers four questions, each as a short heading with 1–3 sentences:
  1. **What's going wrong?** The symptom as a user would notice it.
  2. **Why does it happen?** The cause through an everyday analogy (a waiter who takes the order but never comes back, a letter sent to an old address).
  3. **Who is affected and how badly?** Which users or customers, how often, what it costs them.
  4. **What will fixing it change?** The before/after a user would notice.
- Back it with one simple picture: a before/after strip or a cartoon-style flow using everyday labels ("App asks for icon" → "nobody answers" → "app waits forever"), not code boxes.
- Questions: the question text and option labels in plain words; put the technical detail in the option description or `preview`.

## Questions section

Mirror the `/pr-review` fix-plan UI (`~/.claude/skills/pr-review/template.html`, functions `optionsOf`, `fixPlan`, `copyPanel`; copy their markup, CSS classes and copy-button behavior rather than inventing a new one). Each question behaves like an AskUserQuestion call:

- `Q1`, `Q2`, … with a short header chip (≤12 chars) and a full question ending in `?`.
- 2–4 mutually exclusive options as radio buttons. Each has a bold label (1–5 words) and a dim description stating the trade-off.
- At most one option is recommended: placed first, suffixed " (Recommended)", selected by default. Without one, the first option is selected.
- A free-text "Other" option on every question; selecting it reveals a text input.
- Optional `preview` (multi-line monospace) per option for code, config or ASCII mockups. If any option of a question has one, show the side-by-side preview box (stacks under 700px).
- Multi-select questions use checkboxes instead of radios; mark them "(select all that apply)".

Ask only questions whose answer changes what gets built: ambiguous scope, conflicting requirements, contradictions between ticket and code, choice between plausible approaches, rollout or compatibility decisions. Facts that the code or ticket answers are not questions. With zero questions, show a "No open questions" panel instead.

After the last question, an "Answers prompt" panel with a Copy button builds one line per question from the current selections:

```
Answers for the /ticket-kickoff questions on "<KEY> <title>":
- Q1 · <header> → <label>: <description or Other text>
- Q2 · <header> → <label>, <label>
```

## Common mistakes

| Mistake                                          | Fix                                                        |
| ------------------------------------------------ | ---------------------------------------------------------- |
| Reading ticket content from the browser snapshot | Use the Jira MCP, `glab`, or `gh`; the tab is for the user |
| Questions the code already answers               | Answer them in Requirements or Affected code instead       |
| Text-only explanation                            | Every section after the TL;DR gets a diagram or table      |
| Jargon in TL;DR, In plain words, or questions    | Rewrite as what a user sees; define any unavoidable term   |
| Starting implementation before answers arrive    | Stop after step 6                                          |
