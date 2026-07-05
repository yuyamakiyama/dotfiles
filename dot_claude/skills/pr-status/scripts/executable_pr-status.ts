#!/usr/bin/env bun
import { $ } from "bun";

type Ctx =
  | {
      __typename: "CheckRun";
      name: string;
      status: string;
      conclusion: string | null;
    }
  | { __typename: "StatusContext"; context: string; state: string };

type Reviewer = { __typename: string; login?: string; name?: string } | null;

type Pr = {
  number: number;
  title: string;
  url: string;
  baseRefName: string;
  isDraft: boolean;
  mergeable: string;
  mergeStateStatus: string;
  reviewDecision: string | null;
  createdAt: string;
  updatedAt: string;
  repository: { nameWithOwner: string };
  author: { login: string } | null;
  reviewRequests: { nodes: { requestedReviewer: Reviewer }[] };
  latestReviews: {
    nodes: { state: string; author: { login: string } | null }[];
  };
  commits: {
    nodes: {
      commit: {
        statusCheckRollup: { state: string; contexts: { nodes: Ctx[] } } | null;
      };
    }[];
  };
};

const PR_FIELDS = `
  number title url baseRefName isDraft mergeable mergeStateStatus reviewDecision createdAt updatedAt
  repository { nameWithOwner }
  author { login }
  reviewRequests(first: 20) {
    nodes { requestedReviewer {
      __typename
      ... on User { login }
      ... on Bot { login }
      ... on Mannequin { login }
      ... on Team { name }
    } }
  }
  latestReviews: reviews(last: 30, states: [APPROVED, CHANGES_REQUESTED]) {
    nodes { state author { login } }
  }
  commits(last: 1) {
    nodes { commit { statusCheckRollup {
      state
      contexts(first: 100) { nodes {
        __typename
        ... on CheckRun { name status conclusion }
        ... on StatusContext { context state }
      } }
    } } }
  }`;

const QUERY = `
query($authored: String!, $assigned: String!, $review: String!) {
  authored: search(query: $authored, type: ISSUE, first: 50) { nodes { ... on PullRequest { ${PR_FIELDS} } } }
  assigned: search(query: $assigned, type: ISSUE, first: 50) { nodes { ... on PullRequest { ${PR_FIELDS} } } }
  review:   search(query: $review,   type: ISSUE, first: 50) { nodes { ... on PullRequest { ${PR_FIELDS} } } }
}`;

const PRIVATE_EXCLUDES = (process.env.PR_STATUS_EXCLUDE ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const REVIEW_GATE = (process.env.PR_STATUS_REVIEW_GATE ?? "").trim();

const args = Bun.argv.slice(2);
const mineOnly = args.includes("--mine");
const wantAll = args.includes("--all");
const repoIdx = args.indexOf("--repo");
const repoFlag = repoIdx >= 0 ? args[repoIdx + 1] : undefined;

const currentRepo = (
  await $`gh repo view --json nameWithOwner --jq .nameWithOwner`
    .text()
    .catch(() => "")
).trim();
const scopeRepo = repoFlag ?? (wantAll ? undefined : currentRepo || undefined);

const login = (await $`gh api user --jq .login`.text().catch(() => "")).trim();
if (!login) {
  console.error("Not authenticated with GitHub. Run `gh auth login` first.");
  process.exit(1);
}

const scope = "is:pr is:open archived:false";
const raw = await $`gh api graphql -f query=${QUERY} \
  -f authored=${`${scope} author:${login}`} \
  -f assigned=${`${scope} assignee:${login}`} \
  -f review=${`${scope} review-requested:${login}`}`.text();

const parsed: {
  data?: {
    authored: { nodes: Pr[] };
    assigned: { nodes: Pr[] };
    review: { nodes: Pr[] };
  };
  errors?: unknown;
} = JSON.parse(raw);
if (parsed.errors) {
  console.error(
    "GitHub GraphQL error:\n" + JSON.stringify(parsed.errors, null, 2),
  );
  process.exit(1);
}
const data = parsed.data ?? {
  authored: { nodes: [] },
  assigned: { nodes: [] },
  review: { nodes: [] },
};

const uniqByUrl = (prs: Pr[]) =>
  Object.values(
    prs.reduce<Record<string, Pr>>((acc, pr) => ({ ...acc, [pr.url]: pr }), {}),
  );

const repoMatch = (pr: Pr) => {
  const nwo = pr.repository.nameWithOwner;
  const included =
    !scopeRepo || nwo === scopeRepo || nwo.endsWith(`/${scopeRepo}`);
  const excluded = PRIVATE_EXCLUDES.some(
    (e) => nwo === e || nwo.endsWith(`/${e}`),
  );
  return included && !excluded;
};

const mine = uniqByUrl([...data.authored.nodes, ...data.assigned.nodes]).filter(
  repoMatch,
);
const mineUrls = new Set(mine.map((pr) => pr.url));
const toReview = uniqByUrl(data.review.nodes)
  .filter((pr) => !mineUrls.has(pr.url) && pr.author?.login !== login)
  .filter(repoMatch);

const FAIL = new Set([
  "FAILURE",
  "TIMED_OUT",
  "STARTUP_FAILURE",
  "ACTION_REQUIRED",
]);
const PENDING = new Set([
  "QUEUED",
  "IN_PROGRESS",
  "PENDING",
  "WAITING",
  "REQUESTED",
]);
const ctxName = (c: Ctx) => (c.__typename === "CheckRun" ? c.name : c.context);
const ctxFails = (c: Ctx) =>
  c.__typename === "CheckRun"
    ? FAIL.has(c.conclusion ?? "")
    : c.state === "FAILURE" || c.state === "ERROR";
const ctxPends = (c: Ctx) =>
  c.__typename === "CheckRun"
    ? c.conclusion === null && PENDING.has(c.status)
    : c.state === "PENDING";

const ci = (pr: Pr) => {
  const rollup = pr.commits.nodes[0]?.commit?.statusCheckRollup;
  const ctxs = rollup?.contexts.nodes ?? [];
  const failing = [...new Set(ctxs.filter(ctxFails).map(ctxName))];
  const pending = [...new Set(ctxs.filter(ctxPends).map(ctxName))];
  const state = !rollup
    ? "NONE"
    : failing.length
      ? "FAIL"
      : pending.length
        ? "PENDING"
        : rollup.state === "SUCCESS"
          ? "PASS"
          : rollup.state;
  const icon =
    state === "PASS"
      ? "✅"
      : state === "FAIL"
        ? "❌"
        : state === "PENDING"
          ? "⏳"
          : "–";
  return { state, icon, failing, pending };
};

const gatePending = (pr: Pr) =>
  REVIEW_GATE.length > 0 &&
  pr.reviewRequests.nodes.some(
    (n) =>
      n.requestedReviewer?.login === REVIEW_GATE ||
      n.requestedReviewer?.name === REVIEW_GATE,
  );

const approvals = (pr: Pr) =>
  new Set(
    pr.latestReviews.nodes
      .filter((r) => r.state === "APPROVED")
      .map((r) => r.author?.login),
  ).size;

const review = (pr: Pr) => {
  const n = approvals(pr);
  const decision = pr.reviewDecision;
  const icon =
    decision === "APPROVED"
      ? `✅ ${n}`
      : decision === "CHANGES_REQUESTED"
        ? "🔴 changes"
        : decision === "REVIEW_REQUIRED"
          ? n
            ? `⏳ ${n}`
            : "⏳ review"
          : n
            ? `✅ ${n}`
            : "–";
  return { icon, decision, approvals: n, gate: gatePending(pr) };
};

const merge = (pr: Pr) => {
  const s = pr.mergeStateStatus;
  const conflict = pr.mergeable === "CONFLICTING" || s === "DIRTY";
  const label = conflict
    ? "🔴 conflict"
    : s === "BEHIND"
      ? "🟠 behind"
      : s === "BLOCKED"
        ? "🚧 blocked"
        : s === "UNSTABLE"
          ? "⚠️ unstable"
          : s === "CLEAN" || s === "HAS_HOOKS"
            ? "✅ clean"
            : s === "DRAFT"
              ? "📝 draft"
              : pr.mergeable === "MERGEABLE"
                ? "✅ clean"
                : "· ?";
  return {
    label,
    conflict,
    behind: s === "BEHIND",
    clean: s === "CLEAN" || s === "HAS_HOOKS",
  };
};

const action = (pr: Pr) => {
  const c = ci(pr);
  const r = review(pr);
  const m = merge(pr);
  const ready =
    r.decision === "APPROVED" && m.clean && c.state === "PASS" && !pr.isDraft;
  if (ready) return { rank: 0, text: "✅ ready to merge" };
  if (r.decision === "CHANGES_REQUESTED")
    return { rank: 1, text: "address review feedback" };
  if (c.state === "FAIL")
    return { rank: 1, text: `fix CI: ${c.failing.slice(0, 3).join(", ")}` };
  if (m.conflict) return { rank: 1, text: "resolve merge conflicts" };
  if (m.behind) return { rank: 2, text: "rebase / update on base" };
  if (pr.isDraft && c.state !== "FAIL")
    return { rank: 5, text: "finish & mark ready" };
  if (r.gate) return { rank: 3, text: "review gate pending" };
  if (c.state === "PENDING") return { rank: 4, text: "CI running" };
  if (r.decision === "REVIEW_REQUIRED" || r.approvals === 0)
    return { rank: 3, text: "awaiting review" };
  return { rank: 6, text: "—" };
};

const ageMs = (iso: string) => Date.now() - new Date(iso).getTime();
const age = (iso: string) => {
  const d = Math.floor(ageMs(iso) / 86400000);
  const label =
    d < 1
      ? `${Math.max(1, Math.floor(ageMs(iso) / 3600000))}h`
      : d < 14
        ? `${d}d`
        : `${Math.floor(d / 7)}w`;
  return ageMs(iso) > 7 * 86400000 ? `⏰ ${label}` : label;
};

const esc = (s: string) => s.replace(/\|/g, "\\|");
const trunc = (s: string, n: number) =>
  s.length > n ? s.slice(0, n - 1) + "…" : s;
const shortRepo = (nwo: string) => nwo.split("/")[1] ?? nwo;

const enrich = (pr: Pr) => ({
  pr,
  ci: ci(pr),
  review: review(pr),
  merge: merge(pr),
  action: action(pr),
});

const renderMine = (prs: Pr[]) => {
  const rows = prs
    .map(enrich)
    .sort((a, b) => a.action.rank - b.action.rank || b.pr.number - a.pr.number);
  const repos = new Set(prs.map((p) => p.repository.nameWithOwner));
  const showRepo = repos.size > 1;
  const header = showRepo
    ? "| PR | Repo | Title | Base | CI | Review | Merge | Age |\n|----|------|-------|------|----|--------|-------|-----|"
    : "| PR | Title | Base | CI | Review | Merge | Age |\n|----|-------|------|----|--------|-------|-----|";
  const body = rows
    .map(({ pr, ci, review, merge }) => {
      const title = esc(trunc(pr.title, 42)) + (pr.isDraft ? " _(draft)_" : "");
      const rv = review.icon + (review.gate ? " · gate" : "");
      const base = `\`${pr.baseRefName}\``;
      const cells = showRepo
        ? [
            `[#${pr.number}](${pr.url})`,
            shortRepo(pr.repository.nameWithOwner),
            title,
            base,
            ci.icon,
            rv,
            merge.label,
            age(pr.updatedAt),
          ]
        : [
            `[#${pr.number}](${pr.url})`,
            title,
            base,
            ci.icon,
            rv,
            merge.label,
            age(pr.updatedAt),
          ];
      return `| ${cells.join(" | ")} |`;
    })
    .join("\n");
  return { md: `${header}\n${body}`, rows };
};

const renderReview = (prs: Pr[]) => {
  const rows = prs
    .map(enrich)
    .sort((a, b) => ageMs(b.pr.updatedAt) - ageMs(a.pr.updatedAt));
  const header =
    "| PR | Repo | Author | Title | Base | CI | Age |\n|----|------|--------|-------|------|----|----|";
  const body = rows
    .map(
      ({ pr, ci }) =>
        `| [#${pr.number}](${pr.url}) | ${shortRepo(pr.repository.nameWithOwner)} | ${pr.author?.login ?? "?"} | ${esc(trunc(pr.title, 42))} | \`${pr.baseRefName}\` | ${ci.icon} | ${age(pr.updatedAt)} |`,
    )
    .join("\n");
  return `${header}\n${body}`;
};

const mineTable = renderMine(mine);
const counts = mineTable.rows.reduce<Record<number, number>>(
  (acc, r) => ({ ...acc, [r.action.rank]: (acc[r.action.rank] ?? 0) + 1 }),
  {},
);
const summary = [
  counts[0] ? `${counts[0]} ready to merge` : "",
  counts[1] ? `${counts[1]} need a fix` : "",
  counts[2] ? `${counts[2]} need rebase` : "",
  (counts[3] ?? 0) + (counts[4] ?? 0)
    ? `${(counts[3] ?? 0) + (counts[4] ?? 0)} waiting`
    : "",
  counts[5] ? `${counts[5]} draft` : "",
]
  .filter(Boolean)
  .join(" · ");

const scopeLabel = scopeRepo ? ` in ${scopeRepo}` : " across all repos";
const out = [
  `## My open PRs${scopeLabel} — ${mine.length} (as ${login})`,
  summary ? `_${summary}_` : "",
  mine.length ? mineTable.md : "_No open PRs authored by or assigned to you._",
];

const reviewOut =
  mineOnly || !toReview.length
    ? []
    : [
        "",
        `## Awaiting your review — ${toReview.length}`,
        renderReview(toReview),
      ];

console.log(
  [
    ...out,
    ...reviewOut,
    "",
    "_CI: ✅ pass ❌ fail ⏳ running · Merge: 🟠 behind 🔴 conflict 🚧 blocked · ⏰ = stale >7d_",
  ]
    .filter((l) => l !== undefined)
    .join("\n"),
);
