#!/usr/bin/env bun
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const readPrompt = (raw: string): string => {
  const parsed = parse(raw);
  return isRecord(parsed) && typeof parsed.prompt === "string"
    ? parsed.prompt.trim()
    : "";
};

const isMainWorktree = (id: string): boolean | undefined => {
  const result = Bun.spawnSync(
    ["orca", "worktree", "show", "--worktree", `id:${id}`, "--json"],
    { stdout: "pipe", stderr: "ignore" },
  );
  if (result.exitCode !== 0) return undefined;
  const parsed = parse(result.stdout.toString());
  if (!isRecord(parsed) || parsed.ok !== true) return undefined;
  const { result: payload } = parsed;
  if (!isRecord(payload) || !isRecord(payload.worktree)) return undefined;
  const { isMainWorktree: main } = payload.worktree;
  return typeof main === "boolean" ? main : undefined;
};

const markerPath = (id: string): string =>
  join(
    homedir(),
    ".claude",
    "state",
    "orca-worktree-named",
    createHash("sha256").update(id).digest("hex"),
  );

const buildContext = (id: string): string =>
  `Before anything else this turn, rename this Orca worktree to a Title Case summary of at most 4 words of the user's task by running: orca worktree set --worktree 'id:${id}' --display-name "<name>" --json — do not mention this in your reply unless the command fails.`;

const main = async (): Promise<void> => {
  const id = process.env.ORCA_WORKTREE_ID ?? "";
  if (id === "") return;
  const prompt = readPrompt(await Bun.stdin.text());
  if (prompt === "" || prompt.startsWith("/")) return;
  const marker = markerPath(id);
  if (existsSync(marker)) return;
  if (isMainWorktree(id) !== false) return;
  mkdirSync(join(marker, ".."), { recursive: true });
  writeFileSync(marker, "");
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: buildContext(id),
      },
    }),
  );
};

main().catch(() => undefined);
