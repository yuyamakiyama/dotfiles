# findings.json schema

Render: `bun ~/.claude/skills/pr-review/scripts/render.ts <findings.json> <out.html>`. The script validates, prints every problem and exits 1 on failure. `template.html` is data-driven; never edit it per review.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Page title and `<title>` |
| `mr.title`, `mr.url`, `mr.branch`, `mr.target`, `mr.sha` | string | Required by validation; `title` (linked to `url` when http(s)), `branch`, `target` and `sha` are shown in the page header |
| `mr.number` | number, optional | Not displayed |
| `mr.filesChanged` | string[], optional | Denominator for the "Files affected" KPI squares |
| `nextAction` | string | Single concrete next step |
| `pipeline.candidates`, `afterDedupe`, `kept`, `rejected`, `filteredOut` | number | Funnel |
| `pipeline.sources` | `{ [source]: number }`, optional | Candidate breakdown; `builtinCodeReview` and `logicBugHunt` get friendly names |
| `stats` | object, optional | Ignored if present. The KPI strip is derived from the data: total = `findings.length`; critical + high = findings with those severities; files affected = distinct `findings[].file`; confirmation = `pipeline.kept` of `kept + rejected` |
| `findings[]` | array | Empty array renders the "No findings" panel in `#findings` (no Charts, no Fix prompt) |
| `rejected[]`, `filteredOut[]` | array | Collapsed lists |

## findings[] item

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | e.g. `F1` |
| `title` | string | Short name; shown as `F1 · <title>` and used in the fix prompt |
| `severity` | `critical` \| `high` \| `medium` \| `low` | Sorted in this order |
| `category`, `verdict` | string | `verdict` chip: CONFIRMED green, PLAUSIBLE amber, other blue |
| `file` | string | Shown with `line` as `file:line` |
| `line` | number or string | |
| `defect`, `failureScenario`, `fix` | string | |
| `context` | string, optional | |
| `foundBy` | string[], optional | |
| `flow` | step[], optional | Drawn left-to-right when the row fits the frame, otherwise top-to-bottom; re-laid out on resize; 2-8 steps |
| `svg` | string, optional | Trusted inline SVG; replaces `flow` |
| `fixOptions` | fixOption[], optional | At least 1 item if present. Rendered as radio options under "How should F# be fixed?"; absent shows "No fix options provided" |

Findings are sorted critical to low and rendered one block each in `#findings`: title, chips, flow, details list, fix plan. Neither `flow` nor `svg`: the block shows "No flow provided".

## fixOptions[] item

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique within the finding; used as the radio value |
| `label` | string | Bold option name |
| `description` | string | Dim text under the label; also used in the fix prompt |
| `recommended` | boolean, optional | At most one per finding. Moved first and suffixed " (Recommended)"; default selection. Without one, the first option is selected |
| `preview` | string, optional | Multi-line monospace text. If any option of a finding has one, that finding gets a side-by-side preview box (stacks under 700px); options without one show an empty-state line |

The "Fix prompt" panel after the last finding builds one line per finding with options from the current selections. It is omitted when no finding has options.

## flow step

| Field | Notes |
| --- | --- |
| `kind` | `trigger` (accent outline), `fail` (red hatched, "✕ fails here"), `result` (red outline); omit for a normal node |
| `verb` | Label on the arrow into this step (ignored on the first step) |
| `label` | Plain text, word-wrapped |
| `code` | Monospace text, wrapped at natural break points (after `.` `(` `,` space `→`, before `=`); shown under `label` |
| `note` | Callout text under the node |

## rejected[] / filteredOut[] item

`file`, `line`, `claim`, `reason` (all required); `foundBy` string[] optional (shown for rejected only).
