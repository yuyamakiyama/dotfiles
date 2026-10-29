---
name: explain-simply
description: Explain a technical topic to non-technical people (business stakeholders, PMs, sales, customers, managers) as a visual artifact in plain words. Use whenever the user asks to explain something "simply", "in plain English", "like I'm 5", "for my manager / PM / customer / sales / the business side", "for non-devs", or wants a non-technical summary of code, a PR, a bug, an architecture, an incident, or a tech concept — even if they don't say "artifact" or "non-technical" outright.
---

# explain-simply — technical knowledge for non-technical readers

Output: one published Artifact page. The reader is a business stakeholder: they know the product and the customers, not the code. They are smart and busy. They read to decide, approve, or pass the story on.

## Steps

1. **Pin the topic.** If the request names code, a PR, a ticket, or a repo, read it first (delegate broad reading to a subagent). Explain what is actually there; never guess at behavior. If the topic is too vague to explain ("explain our backend"), ask one question to narrow it.
2. **Find the core.** Before writing, answer in one sentence each:
   - What is it, in everyday words?
   - Why should this reader care? (money, time, customers, risk)
   - What is the one picture that makes it click?
     If you can't answer the first in under 20 plain words, you don't understand it well enough yet — go back to step 1.
3. **Load `artifact-design`**, then write `<scratchpad>/explain-<slug>/index.html` and publish it with the Artifact tool, icon `lightbulb`. Republish to the same path on follow-ups.
4. **Terminal reply.** The artifact link and the one-sentence core from step 2. Nothing else.

## Plain-words rules

The reader should never have to stop and look something up.

- **Short words, short sentences.** Aim for words a 12-year-old knows and sentences under 20 words. "Use" not "utilize", "start" not "initialize", "send" not "transmit".
- **Talk about what people see and do**, not about how the code is built. "The map shows the wrong floor" beats "the floor index is off by one".
- **Avoid jargon when an everyday word works.** "Saved copy" instead of "cache" is often enough.
- **When jargon is unavoidable, always show its meaning.** Some words the reader will hear again in meetings (API, deploy, cache, bug, server) are worth teaching. For each such term:
  1. Wrap its first use in each section in the glossary-term markup (below) so tapping or hovering shows a one-line meaning. Wrapping every repeat adds noise without helping.
  2. On its first appearance on the page, also give the meaning inline in the sentence: "an **API** (a menu of requests one program can make to another)".
  3. Add it to the glossary at the bottom of the page.
- **No code, class names, file paths, or stack traces** in the plain-words text. When the topic came from code, a PR, or a ticket, end each section with an always-visible `<aside class="tech"><p class="tech-h">Technical details</p>…</aside>` box, set apart in a muted style, holding that section's sources: file paths with line numbers, links, verbatim quotes (e.g. a reviewer's original comment inside its own card). Don't collapse it: keeping the evidence open next to the claim it backs lets anyone check a point at a glance, and the muted style lets the stakeholder skip it. Skip the box in sections with nothing technical behind them.
- **Numbers over adjectives.** "Loads in 2 seconds instead of 9" beats "much faster".
- **Be honest about uncertainty.** "We don't know yet" is fine in plain words too.

## Keep it compact

Busy readers skim. Every fact stays; every repeat goes.

- **Say each thing once.** Give a jargon term's inline meaning only on its first use on the page; later uses get the tooltip alone. Don't restate a fact in a caption, a summary line, and a chart.
- **Cut words, not sentence breaks.** In cards, fold "why it matters" into the point itself, but keep sentences short. Gluing clauses with semicolons into a 50-word sentence saves space and costs the reader more.
- **Merge thin sections.** A "what happens next" with one line goes at the end of the section before it. Header metadata is one muted line, not a grid.
- **Tight layout.** Section gap about 28px, h1 at most 2rem, h2 about 1.3rem, diagrams only as tall as their content.
- **Cut a visual that repeats another.** Pills plus a summary chart of the same pills is one too many. Every section still needs at least one visual.

## Visuals

Every section has a visual. A wall of text means the explanation failed. Pick the visual that carries the idea; don't decorate.

| Visual                 | Use it for                                             | Notes                                                                                                                                                                                                                                |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Analogy card**       | Each core concept                                      | Side-by-side: icon + everyday scene ↔ the tech thing. One analogy per concept, and say where it breaks ("unlike a real waiter, an API never improvises"). Pick analogies from office, restaurant, post, traffic, library, shop life. |
| **Inline SVG diagram** | Flows, "how it works", before/after, who-talks-to-whom | Everyday labels in the boxes ("Your phone", "Our server — the computer that stores the maps"). People and things as simple icons, not code boxes. Load `artifact-diagramming` for the mechanics.                                     |
| **Interactive steps**  | Any process with 3+ steps or a sequence over time      | Step-through with Back/Next buttons and a step counter. Each step highlights its part of the diagram and has one caption sentence. Works with keyboard (arrow keys) and touch.                                                       |
| **Glossary tooltips**  | Every jargon term                                      | See markup below.                                                                                                                                                                                                                    |
| **Comparison table**   | Options, before/after, trade-offs                      | Plain column headers ("What it costs", "How long", "Risk").                                                                                                                                                                          |

Rules for all visuals: label everything in words (no unlabeled arrows or color-only meaning), work in light and dark mode, readable at phone width.

### Glossary-term markup

Use a native, accessible pattern so it works on hover, tap, and keyboard:

```html
<button type="button" class="term" aria-describedby="g-api">
  API
  <span role="tooltip" id="g-api"
    >A menu of requests one program can make to another.</span
  >
</button>
```

Style `.term` as inline text with a dotted underline; show the tooltip on `:hover`, `:focus-visible`, and a tapped/open state toggled by a click handler (tap elsewhere or Escape closes it). Keep tooltips inside the viewport at phone width. Each tooltip meaning is one plain sentence, no further jargon inside it.

## Page structure

| #   | Section                                       | Content                                                                                                  |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Title + one-liner                             | The topic as a plain question ("Why does the map sometimes show old data?") and the one-sentence answer. |
| 2   | The big picture                               | One main diagram or analogy card that carries the whole idea.                                            |
| 3   | How it works                                  | Interactive steps through the process.                                                                   |
| 4   | Why it matters                                | Impact on customers, money, time, or risk; numbers where possible. Table or simple chart.                |
| 5   | What happens next / what we need from you     | Only if there's a decision or action for the reader.                                                     |
| 6   | Glossary                                      | Every jargon term used, alphabetical, each with its plain meaning and, where useful, its analogy.        |

Drop sections that don't apply; keep the order. Scale to the topic: a single concept may need only 1, 2, 3, 6. Technical evidence lives in each section's "Technical details" box (see Plain-words rules), never in a separate section at the end.

## Self-check before publishing

Read the page as the stakeholder would, top to bottom:

- Does any sentence need a technical background to follow? Rewrite it.
- Is there a jargon word without a tooltip and an inline meaning on first use? Fix it.
- Is there a section without a visual? Add one or cut the section.
- Does each analogy match how the thing really works, and state where it breaks? An analogy that misleads is worse than none.
- Could the reader repeat the one-liner to their boss after reading? If not, sharpen section 1.
