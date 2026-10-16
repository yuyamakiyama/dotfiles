#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

const TYPES: readonly string[] = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
];

const HEADER = new RegExp(
  `^(${TYPES.join("|")})(\\([^()\\r\\n]+\\))?!?: \\S.*$`,
);
const HEREDOC =
  /(<<-?\s*(['"]?)(\w+)\2[^\n]*)\n([\s\S]*?)\n[ \t]*\3[ \t]*(?=\n|$)/g;
const HEREDOC_SUBSTITUTION = /\$\(\s*cat\s+<<-?\s*['"]?\w+['"]?/;
const UNRESOLVED = /\$[\w{(]|`/;
const ENV_ASSIGNMENT = /^[A-Za-z_]\w*=/;

const GIT_VALUE_FLAGS: ReadonlySet<string> = new Set([
  "-C",
  "-c",
  "--git-dir",
  "--work-tree",
  "--namespace",
  "--super-prefix",
  "--config-env",
]);
const GH_VALUE_FLAGS: ReadonlySet<string> = new Set(["-R", "--repo"]);
const SEPARATORS: ReadonlySet<string> = new Set([
  "\n",
  ";",
  "&",
  "|",
  "(",
  ")",
]);
const BLANKS: ReadonlySet<string> = new Set([" ", "\t", "\r"]);
const DOUBLE_QUOTE_ESCAPABLE: ReadonlySet<string> = new Set([
  '"',
  "\\",
  "$",
  "`",
]);

type Decision =
  | { readonly kind: "allow" }
  | { readonly kind: "ask" | "deny"; readonly reason: string };

type Context = {
  readonly cwd: string;
  readonly bodies: readonly string[];
};

type Lex = {
  readonly segments: readonly (readonly string[])[];
  readonly words: readonly string[];
  readonly cur: string;
  readonly inWord: boolean;
  readonly quote: "'" | '"' | null;
  readonly escaped: boolean;
  readonly comment: boolean;
};

const ALLOW: Decision = { kind: "allow" };
const ask = (reason: string): Decision => ({ kind: "ask", reason });

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const asString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

const parseInput = (raw: string) => {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed)) return undefined;
  const toolInput = parsed.tool_input;
  return {
    tool: asString(parsed.tool_name),
    command: isRecord(toolInput) ? asString(toolInput.command) : undefined,
    cwd: asString(parsed.cwd) ?? process.cwd(),
  };
};

const heredocBodies = (command: string): readonly string[] =>
  [...command.matchAll(HEREDOC)].map((m) => m[4] ?? "");
const stripHeredocs = (command: string): string =>
  command.replace(HEREDOC, "$1");

const initialLex: Lex = {
  segments: [],
  words: [],
  cur: "",
  inWord: false,
  quote: null,
  escaped: false,
  comment: false,
};

const append = (s: Lex, ch: string): Lex => ({
  ...s,
  cur: s.cur + ch,
  inWord: true,
});
const endWord = (s: Lex): Lex =>
  s.inWord ? { ...s, words: [...s.words, s.cur], cur: "", inWord: false } : s;
const endSegment = (s: Lex): Lex => {
  const ended = endWord(s);
  return ended.words.length > 0
    ? { ...ended, segments: [...ended.segments, ended.words], words: [] }
    : ended;
};
const escapedChar = (s: Lex, ch: string): Lex =>
  ch === "\n"
    ? s
    : s.quote === '"' && !DOUBLE_QUOTE_ESCAPABLE.has(ch)
      ? append(append(s, "\\"), ch)
      : append(s, ch);

const step = (s: Lex, ch: string): Lex => {
  if (s.comment) {
    return ch === "\n" ? endSegment({ ...s, comment: false }) : s;
  }
  if (s.escaped) return { ...escapedChar(s, ch), escaped: false };
  if (s.quote === "'") {
    return ch === "'" ? { ...s, quote: null } : append(s, ch);
  }
  if (s.quote === '"') {
    if (ch === '"') return { ...s, quote: null };
    return ch === "\\" ? { ...s, escaped: true } : append(s, ch);
  }
  if (ch === "'" || ch === '"') return { ...s, quote: ch, inWord: true };
  if (ch === "\\") return { ...s, escaped: true };
  if (ch === "#" && !s.inWord) return { ...s, comment: true };
  if (SEPARATORS.has(ch)) return endSegment(s);
  if (BLANKS.has(ch)) return endWord(s);
  return append(s, ch);
};

const lex = (command: string): readonly (readonly string[])[] =>
  endSegment(Array.from(command).reduce(step, initialLex)).segments;

const valueAt = (
  args: readonly string[],
  i: number,
  short: string,
  long: string,
): string | undefined => {
  const word = args[i] ?? "";
  if (word === `--${long}`) return args[i + 1];
  if (word.startsWith(`--${long}=`)) return word.slice(long.length + 3);
  if (word.startsWith("--")) return undefined;
  if (new RegExp(`^-[A-Za-z]*${short}$`).test(word)) return args[i + 1];
  return word.startsWith(`-${short}`) && word.length > 2
    ? word.slice(2)
    : undefined;
};

const valuesOf = (
  args: readonly string[],
  short: string,
  long: string,
): readonly string[] =>
  args.flatMap((_, i) => {
    const value = valueAt(args, i, short, long);
    return value === undefined ? [] : [value];
  });

const firstLine = (text: string): string =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";

const acceptable = (header: string): boolean =>
  HEADER.test(header) ||
  header.startsWith('Revert "') ||
  header.startsWith("Merge ");

const validate = (text: string, label: string): Decision => {
  const header = firstLine(text);
  if (acceptable(header)) return ALLOW;
  if (UNRESOLVED.test(header)) {
    return ask(
      `${label} "${header}" contains shell expansion that cannot be verified against Conventional Commits`,
    );
  }
  return {
    kind: "deny",
    reason: `${label} "${header}" does not follow Conventional Commits: <type>(<scope>)!: <description>; allowed types: ${TYPES.join(", ")}`,
  };
};

const readText = (path: string): string | undefined => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
};

const expandHome = (path: string): string =>
  path.startsWith("~/") ? join(homedir(), path.slice(2)) : path;

const isGeneratedMessageFlag = (arg: string): boolean =>
  arg === "--no-edit" ||
  arg === "--fixup" ||
  arg.startsWith("--fixup=") ||
  arg === "--squash" ||
  arg.startsWith("--squash=");

const decideCommit = (args: readonly string[], ctx: Context): Decision => {
  if (args.some(isGeneratedMessageFlag)) return ALLOW;
  const [message] = valuesOf(args, "m", "message");
  if (message !== undefined) {
    const text = HEREDOC_SUBSTITUTION.test(message)
      ? (ctx.bodies[0] ?? message)
      : message;
    return validate(text, "commit header");
  }
  const [file] = valuesOf(args, "F", "file");
  if (file !== undefined) {
    const text =
      file === "-"
        ? ctx.bodies[0]
        : readText(resolve(ctx.cwd, expandHome(file)));
    return text === undefined
      ? ask(
          `git commit -F ${file}: the message source cannot be read (no heredoc or file), so it cannot be verified against Conventional Commits`,
        )
      : validate(text, "commit header");
  }
  return ask(
    "git commit without -m/-F opens an editor, so the message cannot be verified against Conventional Commits",
  );
};

const decidePr = (
  sub: "create" | "edit",
  args: readonly string[],
): Decision => {
  const [title] = valuesOf(args, "t", "title");
  if (title !== undefined) return validate(title, "PR title");
  return sub === "create"
    ? ask(
        "gh pr create without --title (--fill or interactive): the title cannot be verified against Conventional Commits",
      )
    : ALLOW;
};

const subcommandIndex = (
  rest: readonly string[],
  valueFlags: ReadonlySet<string>,
): number =>
  rest.findIndex(
    (word, i) => !word.startsWith("-") && !valueFlags.has(rest[i - 1] ?? ""),
  );

const dropEnvAssignments = (words: readonly string[]): readonly string[] => {
  const first = words.findIndex((w) => !ENV_ASSIGNMENT.test(w));
  return first < 0 ? [] : words.slice(first);
};

const decideSegment = (segment: readonly string[], ctx: Context): Decision => {
  const words = dropEnvAssignments(segment);
  const tool = basename(words[0] ?? "");
  const rest = words.slice(1);
  if (tool === "git") {
    const i = subcommandIndex(rest, GIT_VALUE_FLAGS);
    return rest[i] === "commit" ? decideCommit(rest.slice(i + 1), ctx) : ALLOW;
  }
  if (tool === "gh") {
    const i = subcommandIndex(rest, GH_VALUE_FLAGS);
    const sub = rest[i + 1];
    return rest[i] === "pr" && (sub === "create" || sub === "edit")
      ? decidePr(sub, rest.slice(i + 2))
      : ALLOW;
  }
  return ALLOW;
};

const main = async (): Promise<void> => {
  const input = parseInput(await Bun.stdin.text());
  if (input?.tool !== "Bash" || input.command === undefined) return;
  const ctx: Context = {
    cwd: input.cwd,
    bodies: heredocBodies(input.command),
  };
  const decisions = lex(stripHeredocs(input.command)).map((segment) =>
    decideSegment(segment, ctx),
  );
  const verdict =
    decisions.find((d) => d.kind === "deny") ??
    decisions.find((d) => d.kind === "ask") ??
    ALLOW;
  if (verdict.kind === "allow") return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: verdict.kind,
        permissionDecisionReason: verdict.reason,
      },
    }),
  );
};

main().catch((err: unknown) => {
  console.error(
    `conventional-commits hook: ${err instanceof Error ? err.message : String(err)}; skipping check`,
  );
});
