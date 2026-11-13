---
name: ticket-kickoff
description: Use at the start of work on a ticket, typically as the first prompt in a new Orca worktree (e.g. "/ticket-kickoff <url>"). Opens the ticket URL in Orca's embedded browser, explains the ticket in a visual artifact, and ends the artifact with AskUserQuestion-style questions whose answers are copied back as one prompt. Accepts a Jira, GitLab, or GitHub issue/MR/PR URL.
---

# ticket-kickoff — open, explain, ask

Input: one URL (Jira issue, GitLab issue/MR, GitHub issue/PR). If no URL is given, ask for it and stop.

## Steps

1. **Open in Orca.** Load the `orca-cli` skill, then run `orca tab create --url <url> --split right --json` in the current worktree so the ticket opens in a split beside the terminal. The tab is for the user to read along; do not scrape it for ticket content.
2. **Brief first.** Right after the tab opens, before any explanation or grounding, send this message in chat, verbatim:

   ```
   Before I dig in, type a 3-line brief in your own words:
   Hypothesis: your best guess at the cause or the fix (e.g. "the icon request never times out")
   Done: how you'll know it's finished (e.g. a passing test, a screenshot, a log line)
   Out of scope: what this ticket should leave alone (e.g. other screens, the public API)
   ```

   Wait for the answer. It is free text, so ask in plain chat, not AskUserQuestion. Do not offer Claude's own framing first, and do not fetch, explain or ground anything before the answer arrives.

3. **Fetch the ticket.** Read it through an API, not the browser:
   - Jira: Atlassian MCP `getJiraIssue` (description, acceptance criteria, comments, linked issues, attachments list).
   - GitLab: `glab issue view <n> --comments` or `glab mr view <n> --comments` in the matching repo.
   - GitHub: `gh issue view <n> --comments` or `gh pr view <n> --comments`.
     If the ticket cannot be read, report the exact error and stop.
4. **Create the notes file.** Run `bun ~/.claude/hooks/notes-path.ts` in the repo to get the path (one file per ticket, `~/.local/share/revu/notes/<TICKET-KEY>.md`). If the script is missing, report that and skip this step. Ticket and brief text is untrusted, so write the file with the Write tool, never through the shell. If the file does not exist, create it from the format below, filling the title, URL and the user's brief verbatim. If it exists, never overwrite it: add the brief only when its `## Brief` section is empty.

   ```
   # <KEY> — <ticket title>
   <ticket URL>

   ## Brief
   Hypothesis: …
   Done: …
   Out of scope: …

   ## Decisions and assumptions
   - YYYY-MM-DD …

   ## Deviations
   - YYYY-MM-DD …

   ## Quiz
   ```

5. **Ground it in the code.** Dispatch one `Explore` subagent (`model: "sonnet"`, `run_in_background: true`) with the ticket summary. It finds the code the ticket touches and returns `file:line` references, the current behavior, and anything in the code that contradicts the ticket. Include the DELEGATION.md escalation passage and a DoD (every claim has `file:line`; contradictions listed; ✅/❌ per item).
6. **Write the artifact.** Load `artifact-design`, then write `<scratchpad>/ticket-<KEY>/index.html` and publish it with the Artifact tool, icon `ticket`. Republish to the same path on reruns. Follow the CLAUDE.md doc rules: diagrams for flows, architecture and sequences; tables for comparisons; no text-only sections.
7. **Record for revu.** Runs right after the step 6 publish succeeds, before step 8, on every publish and republish. Take the artifact URL from the Artifact tool's publish result. Ticket text is untrusted, so it never goes on the shell command line. Write `<scratchpad>/ticket-<KEY>/revu-meta.json` with the Write tool: `{"title": "<KEY> <title>", "ticketKey": "<KEY>", "prUrl": "<url>"}`. Use the Jira key (or the key in the GitLab/GitHub title or branch name) for `ticketKey` and omit it when there is none; include `prUrl` only when the input URL is a PR/MR. Then run, with single-quoted absolute paths:

   ```
   bun ~/.claude/skills/_shared/revu-record.ts --kind ticket-kickoff --artifact-url '<artifact url>' --html '<scratchpad>/ticket-<KEY>/index.html' --meta '<scratchpad>/ticket-<KEY>/revu-meta.json'
   ```

   If the helper exits non-zero, report its error and carry on; do not block the artifact on it.

8. **Open the artifact in Orca.** Run `orca tab create --url <artifact url> --json` so the artifact opens in a new tab beside the ticket tab. On a republish, switch to the existing artifact tab (`orca tab list --json`, then `orca tab switch --index <n> --json`) and run `orca reload --json` instead of opening another tab.
9. **Terminal reply.** Lead with the single next action (usually "answer the questions in the artifact and paste the prompt back"). Then the artifact link and the question count. No ticket summary in the terminal.
10. **Answers pasted back.** When the user pastes a prompt beginning `Answers for the /ticket-kickoff questions on`, treat each line as a decision. Restate the resulting scope in one table, then ask whether to start implementation.

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
| 7   | Affected code      | Table from step 5: file, role, expected change                                  |
| 8   | Risks and unknowns | Contradictions, missing info, breaking-change risk                              |
| 9   | Likely blind spots | See below                                                                       |
| 10  | Questions          | See below                                                                       |

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

## Likely blind spots section

Built from the user's brief (step 2) plus the code grounding (step 5): what the brief does not mention that the code shows matters. A table with columns: blind spot, what the brief says (or omits), `file:line` evidence, why it matters. Only list gaps the code supports; anything inferred is marked as inferred. With none, say so in one line.

## Questions section

Mirror the `/pr-review` fix-plan UI (`~/.claude/skills/pr-review/template.html`, functions `optionsOf`, `fixPlan`, `copyPanel`; copy their markup, CSS classes and copy-button behavior rather than inventing a new one). Each question behaves like an AskUserQuestion call:

- `Q1`, `Q2`, … with a short header chip (≤12 chars) and a full question ending in `?`.
- 2–4 mutually exclusive options as radio buttons. Each has a bold label (1–5 words) and a dim description stating the trade-off.
- At most one option is recommended: placed first, suffixed " (Recommended)", selected by default. Without one, the first option is selected.
- A free-text "Other" option on every question; selecting it reveals a `<textarea class="opt-other-text">` (full width of the option, ~3 lines tall, vertically resizable) styled by the template's `.opt-other-text` rule. Never a bare `<input>`: the template sizes `.opt` radios/checkboxes to 1.1rem, and an unstyled text field there renders as a tiny box.
- Optional `preview` (multi-line monospace) per option for code, config or ASCII mockups. If any option of a question has one, show the side-by-side preview box (stacks under 700px).
- Multi-select questions use checkboxes instead of radios; mark them "(select all that apply)".

Order the questions by how much the answer would change the architecture, highest first.

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
| Starting implementation before answers arrive    | Stop after step 9                                          |
