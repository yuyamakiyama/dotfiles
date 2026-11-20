import { Glob } from "bun";

type Breakdown = { modelName: string; cost: number };
type Day = {
  period: string;
  totalCost: number;
  totalTokens: number;
  modelBreakdowns: Breakdown[];
};
type Usage = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
};
type Entry = {
  key: string;
  day: string;
  sessionId: string;
  interactive: boolean;
};

const DAY_MS = 86_400_000;
const localDate = (d: Date) => d.toLocaleDateString("sv-SE");
const endArg = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const end = endArg ? new Date(`${endArg}T12:00:00`) : new Date();
const shift = (days: number) =>
  localDate(new Date(end.getTime() - days * DAY_MS));
const cur = { from: shift(6), to: localDate(end) };
const prev = { from: shift(13), to: shift(7) };
const inRange = (r: { from: string; to: string }) => (day: string) =>
  day >= r.from && day <= r.to;

const ccusage = Bun.spawnSync([
  "bunx",
  "ccusage@latest",
  "daily",
  "--json",
  "--breakdown",
  "--since",
  prev.from.replaceAll("-", ""),
  "--until",
  cur.to.replaceAll("-", ""),
]);
if (ccusage.exitCode !== 0) {
  console.error(ccusage.stderr.toString());
  process.exit(1);
}
const days: Day[] = JSON.parse(ccusage.stdout.toString()).daily ?? [];

const isUsageLine = (line: string) =>
  line.includes('"usage"') && line.includes('"sessionId"');
const parse = (line: string): Entry | undefined => {
  try {
    const j = JSON.parse(line);
    const u: Usage | undefined = j.message?.usage;
    return u && j.timestamp && j.sessionId
      ? {
          key: `${j.message.id}:${j.requestId}`,
          day: localDate(new Date(j.timestamp)),
          sessionId: j.sessionId,
          interactive: j.entrypoint === "cli",
        }
      : undefined;
  } catch {
    return undefined;
  }
};

const root = `${process.env.HOME}/.claude/projects`;
const cutoff = new Date(`${prev.from}T00:00:00`).getTime();
const files = [
  ...new Glob("**/*.jsonl").scanSync({ cwd: root, absolute: true }),
].filter((f) => Bun.file(f).lastModified >= cutoff);
const texts = await Promise.all(files.map((f) => Bun.file(f).text()));
const entries = [
  ...new Map(
    texts
      .flatMap((t) => t.split("\n").filter(isUsageLine).map(parse))
      .filter((e): e is Entry => e !== undefined)
      .map((e) => [e.key, e] as const),
  ).values(),
];

const sessions = (r: typeof cur) => {
  const within = entries.filter((e) => inRange(r)(e.day));
  const unique = (pred: (e: Entry) => boolean) =>
    new Set(within.filter(pred).map((e) => e.sessionId)).size;
  return {
    total: unique(() => true),
    interactive: unique((e) => e.interactive),
    sdk: unique((e) => !e.interactive),
  };
};

const family = (model: string) => {
  const name = model.replace(/^claude-/, "").split("-")[0] ?? model;
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const stats = (r: typeof cur) => {
  const ds = days.filter((d) => inRange(r)(d.period));
  const peak = ds.reduce<Day | undefined>(
    (best, d) => (!best || d.totalCost > best.totalCost ? d : best),
    undefined,
  );
  const models = ds
    .flatMap((d) => d.modelBreakdowns)
    .reduce<Record<string, number>>(
      (acc, b) => ({
        ...acc,
        [family(b.modelName)]: (acc[family(b.modelName)] ?? 0) + b.cost,
      }),
      {},
    );
  return {
    cost: ds.reduce((s, d) => s + d.totalCost, 0),
    tokens: ds.reduce((s, d) => s + d.totalTokens, 0),
    peak,
    models,
    sessions: sessions(r),
  };
};

const a = stats(cur);
const b = stats(prev);

const money = (n: number) =>
  n < 1 ? "<$1" : `$${Math.round(n).toLocaleString("en-US")}`;
const tokens = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : `${Math.round(n / 1e6)}M`;
const change = (x: number, y: number, tiny = false) =>
  tiny || y === 0
    ? "—"
    : `${x >= y ? "▲" : "▼"}${Math.abs(Math.round((100 * (x - y)) / y)).toLocaleString("en-US")}%`;
const short = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
const peakLabel = (d?: Day) =>
  d
    ? `${new Date(`${d.period}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} (${money(d.totalCost)})`
    : "—";

const familyOrder = ["Opus", "Fable", "Sonnet", "Haiku"];
const families = [
  ...new Set([...Object.keys(a.models), ...Object.keys(b.models)]),
].sort(
  (x, y) =>
    ((familyOrder.indexOf(x) + 99) % 99) -
      ((familyOrder.indexOf(y) + 99) % 99) || x.localeCompare(y),
);

const rows: string[][] = [
  ["Est. cost", money(a.cost), money(b.cost), change(a.cost, b.cost)],
  ["Tokens", tokens(a.tokens), tokens(b.tokens), change(a.tokens, b.tokens)],
  [
    "**Total sessions**",
    `**${a.sessions.total}**`,
    `**${b.sessions.total}**`,
    `**${change(a.sessions.total, b.sessions.total)}**`,
  ],
  [
    "Interactive sessions",
    `${a.sessions.interactive}`,
    `${b.sessions.interactive}`,
    change(a.sessions.interactive, b.sessions.interactive),
  ],
  [
    "SDK/headless sessions",
    `${a.sessions.sdk}`,
    `${b.sessions.sdk}`,
    change(a.sessions.sdk, b.sessions.sdk),
  ],
  ...families.map((f) => {
    const x = a.models[f] ?? 0;
    const y = b.models[f] ?? 0;
    return [f, money(x), money(y), change(x, y, x < 1 && y < 1)];
  }),
  [
    "Peak day",
    peakLabel(a.peak),
    peakLabel(b.peak),
    change(a.peak?.totalCost ?? 0, b.peak?.totalCost ?? 0),
  ],
];

const header = `| Metric | ${short(cur.from)}–${short(cur.to)} | Prev week (${short(prev.from)}–${short(prev.to)}) | Change |`;
console.log(
  [
    header,
    "|---|---|---|---|",
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ].join("\n"),
);
