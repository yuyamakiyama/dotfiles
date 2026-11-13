---
name: release-note
description: Write a Slack-ready MapsIndoors release note from one or more GitHub PRs passed as args (URLs, owner/repo#N, or numbers in the current repo). Use when the user says "release note", "write the release announcement", "/release-note <PR>", or asks to announce a shipped SDK, Web SDK/Components/Map Template, CMS, or Backend change.
---

# Release Note

Turn PRs into a release announcement in the house style of earlier MapsIndoors posts. Output is printed in chat as Slack-ready text. Nothing is posted anywhere.

## Input

`$ARGUMENTS` = one or more PR references, space- or comma-separated:

- `https://github.com/<owner>/<repo>/pull/<n>`
- `<owner>/<repo>#<n>`
- `<n>` (resolved against the repo in the current directory)

No args → ask for the PRs. Do not guess.

## Steps

1. **Fetch each PR** (run them in parallel):
   ```bash
   gh pr view <ref> --json number,title,body,url,headRepository,baseRefName,mergedAt,state,labels,author,files,commits
   gh pr diff <ref> --patch | head -c 200000
   ```
   Read the linked issues/tickets named in the body (e.g. `MS-4006`) only if the body is too thin to explain user impact.
2. **Pick the product** from the repo name and changed files. See the table below. If PRs span several packages of one family (Web SDK + Components + Map Template), write one combined note. If they span unrelated families, ask whether to write one note or several.
3. **Find the version.** Look in the PR title/body, `CHANGELOG.md`, `package.json`, `build.gradle`/`gradle.properties`, `*.podspec`, or release tags (`gh release list -R <repo> -L 5`). Not found → ask. Never invent a version number.
4. **Classify every user-visible change** into Added / Changed / Fixed. Drop internal-only work (refactors, CI, test-only, dependency bumps with no behavior change) unless it changes what integrators must do.
5. **Write the note** using the matching format and the style rules. Read `examples.md` in this skill's directory first, and match the closest example's shape.
6. **Print it** in one fenced block so it copies cleanly, then list anything you could not verify (see "Gaps").
7. **Iterate** on the user's edits, reprinting the full note each time.

## When the user says "posted"

Add the final note to `examples.md` so future notes learn from it.

1. Pick the text: if the user pasted the posted version, use that exactly; otherwise use the latest note you printed, including every edit the user asked for.
2. Replace real people's `@mentions` with `@<name>`.
3. Insert it in a fenced block directly under the matching `## <Product>` heading in `examples.md`, above the older examples, with the heading line `### <version or date> (posted YYYY-MM-DD)`. Create a new `## <Product>` section if none matches.
4. Do not edit or remove existing examples.
5. Confirm in one line: which section it went into and the version.

## Product formats

| Repo / signal                       | Header                                                                         | Sections                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Android SDK                         | `:android:  MapsIndoors Android SDK <v> released :android:`                    | Added, Changed, Fixed                                                                     |
| iOS SDK                             | `:mapsindoors-ios-pine:MapsIndoors iOS SDK <v> released:mapsindoors-ios-pine:` | Added, Changed, Fixed                                                                     |
| React Native SDK                    | `:rocket: MapsIndoors React Native SDK <v> released :ios: :react: :android:`   | Fixed, Changed (Added if any)                                                             |
| Web SDK / Components / Map Template | `Web SDK / Components / Map Template Release :tada:` + one-line headline       | `We shipped <Package> <v>:` per package                                                   |
| CMS                                 | `CMS Release :tada:` (append feature name for a headline feature)              | Added, Fixed; for big features also Good to know, Status, What to tell customers, Credits |
| Backend                             | `Backend Releases :tada:`                                                      | Added / Fixed / Changed, with measured numbers when the PR has them                       |
| CMS + Backend together              | `CMS/BE Release :tada:` + one-line headline                                    | `We shipped BE:` / `We shipped CMS:` + closing line on impact for existing customers      |

Mobile SDK conventions:

- Name the exact public API: `MPMapConfig.Builder.setInitialVenue(administrativeId)`, `MPDisplayRule.iconZoomFactor`.
- Prefix provider-specific lines with `Mapbox:` / `Google Maps:` / `iOS:` / `Android:`, or tag `[Mapbox only]`.
- For regressions, say since which version: "since 4.20.0, …".
- Breaking or source-incompatible changes go under Changed and say what the integrator has to change, with a before/after snippet in prose (`mapConfig.mapProvider?.cameraOperator`).
- Give defaults, limits and validation ranges ("defaults to `1.0`, must be above `0` and at most `4`").

CMS / Backend conventions:

- Write for CMS users and customer-facing colleagues, not developers. Name UI paths with arrows: `Solution Settings → Map Behavior`.
- Say who can see it (role, module flag, map provider) and whether it is on by default.
- Include before/after numbers when the PR measured them.
- `Status`, `What to tell customers`, `Credits` only when the PR or user supplies the facts. Leave `@mentions` as `@<name>` placeholders for the user to fill, never guess names.

## Style rules

These come from the existing notes. Follow them strictly.

1. **Describe behavior, not code.** "Drawing a route no longer waits for its icons to download", not "Refactored RouteRenderer to async-load icons".
2. **Fixed items describe the symptom the user saw**, then the trigger, then (if it matters) the new behavior. Start with "Fixed …" or with the symptom ("X no longer …").
3. **Be concrete.** Name the condition ("while the device is offline", "on a solution with several venues"), the limit ("at most 48", "within 3 seconds"), the version.
4. **Plain words, short sentences.** No marketing language ("powerful", "seamless", "we're excited"), no em-dash chains, no "This PR".
5. **One change per item, always as a `-` bullet (sub-bullets: indented `-`; never `•` or `◦`)** for every product, even where older examples use bare lines. Related sub-points become sub-bullets.
6. **No PR numbers or ticket IDs** in the text, except a ticket ID in parentheses when the team already uses it (Components: `(MS-4006)`).
7. Run the draft through the `humanizer` skill's rules before printing.

## Gaps

After the note, list in a short table anything inferred rather than read from the PRs: version source, items whose user impact was unclear, sections left as placeholders. If a PR description contradicts its diff, say so and follow the diff.
