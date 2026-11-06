#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { notesPath } from "./notes-path.ts";

const FULL_LIMIT = 45;
const FALLBACK_HEAD_LINES = 15;
const TAIL_LINES = 30;
const DECISIONS_HEADING = "## Decisions and assumptions";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const readCwd = (raw: string): string => {
  const parsed = parse(raw);
  return isRecord(parsed) && typeof parsed.cwd === "string"
    ? parsed.cwd
    : process.cwd();
};

const excerpt = (text: string): string => {
  const lines = text.replace(/\n+$/, "").split("\n");
  if (lines.length <= FULL_LIMIT) return lines.join("\n");
  const heading = lines.findIndex((l) => l.startsWith(DECISIONS_HEADING));
  const headCount = heading > 0 ? heading : FALLBACK_HEAD_LINES;
  return [
    ...lines.slice(0, headCount),
    "…",
    ...lines.slice(headCount).slice(-TAIL_LINES),
  ].join("\n");
};

const main = async (): Promise<void> => {
  const path = notesPath(readCwd(await Bun.stdin.text()));
  if (path === undefined || !existsSync(path)) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `Ticket notes: ${path}\n${excerpt(readFileSync(path, "utf8"))}`,
      },
    }),
  );
};

main().catch(() => undefined);
