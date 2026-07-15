#!/usr/bin/env bun

type HookInput = {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    old_string?: string;
    new_string?: string;
    content?: string;
  };
};

const C_FAMILY = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "cts",
  "mts",
  "go",
  "rs",
  "java",
  "c",
  "cc",
  "cpp",
  "cxx",
  "h",
  "hpp",
  "cs",
  "swift",
  "kt",
  "kts",
  "scala",
  "php",
  "dart",
  "m",
  "mm",
  "zig",
]);
const HASH = new Set(["py", "rb", "graphql", "gql", "sh", "bash", "zsh"]);
const DASH = new Set(["sql", "sqlx", "pgsql"]);

const DIRECTIVE =
  /eslint-(disable|enable)|@ts-(expect-error|ignore|nocheck)|ts-nocheck|biome-ignore|prettier-ignore|@jsxImportSource|istanbul ignore|c8 ignore|v8 ignore|noinspection|#region|#endregion|coding[:=]|@preserve|@license|webpackChunkName|type-coverage:ignore/i;

const extOf = (p: string): string => p.split(".").pop()?.toLowerCase() ?? "";

const fullLineCFamily = (line: string): string | null => {
  const t = line.trim();
  return t.startsWith("//") ||
    t.startsWith("/*") ||
    t.startsWith("*") ||
    t.startsWith("*/")
    ? t
    : null;
};

const trailingCFamily = (line: string): string | null => {
  if (line.includes("://") || /['"`]/.test(line)) return null;
  const idx = line.indexOf("//");
  if (idx <= 0) return null;
  const before = line.slice(0, idx);
  return before.trim() !== "" && /\s$/.test(before)
    ? ("//" + line.slice(idx + 2)).trim()
    : null;
};

const fullLineHash = (line: string): string | null => {
  const t = line.trim();
  return t.startsWith("#") && !t.startsWith("#!") ? t : null;
};

const fullLineDash = (line: string): string | null => {
  const t = line.trim();
  return t.startsWith("--") || t.startsWith("/*") ? t : null;
};

const trailingDash = (line: string): string | null => {
  if (/['"`]/.test(line)) return null;
  const idx = line.indexOf("--");
  if (idx <= 0) return null;
  const before = line.slice(0, idx);
  return before.trim() !== "" && /\s$/.test(before)
    ? ("--" + line.slice(idx + 2)).trim()
    : null;
};

const commentsIn = (text: string, ext: string): readonly string[] => {
  const lines = text.split("\n");
  const detect = (line: string): string | null =>
    C_FAMILY.has(ext)
      ? (fullLineCFamily(line) ?? trailingCFamily(line))
      : HASH.has(ext)
        ? fullLineHash(line)
        : DASH.has(ext)
          ? (fullLineDash(line) ?? trailingDash(line))
          : null;
  return lines
    .map(detect)
    .filter((c): c is string => c !== null)
    .filter((c) => !DIRECTIVE.test(c));
};

const main = async (): Promise<number> => {
  const raw = await Bun.stdin.text();
  const input: HookInput = JSON.parse(raw);
  const filePath = input.tool_input?.file_path;
  if (!filePath) return 0;

  const ext = extOf(filePath);
  if (!C_FAMILY.has(ext) && !HASH.has(ext) && !DASH.has(ext)) return 0;

  const added = ((): readonly string[] => {
    const { old_string, new_string, content } = input.tool_input ?? {};
    if (typeof new_string === "string") {
      const oldComments = new Set(commentsIn(old_string ?? "", ext));
      return commentsIn(new_string, ext).filter((c) => !oldComments.has(c));
    }
    if (typeof content === "string") return commentsIn(content, ext);
    return [];
  })();

  if (added.length === 0) return 0;

  const list = added.map((c) => `   - ${c}`).join("\n");
  process.stderr.write(
    `Redundant-comment check: you just added ${added.length} comment line(s) to ${filePath}:\n` +
      `${list}\n\n` +
      `Instruction rule: default to zero comments. Keep a comment only if it is a load-bearing why ` +
      `(hidden invariant, subtle race, upstream-bug workaround, or non-obvious constraint). ` +
      `Re-edit ${filePath} now and delete every comment above that merely restates what the code does.\n`,
  );
  return 2;
};

main()
  .then((code) => process.exit(code))
  .catch(() => process.exit(0));
