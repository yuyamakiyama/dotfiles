#!/usr/bin/env bun
import { basename } from "node:path";

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

const stripBranchPrefix = (branch: string): string =>
  branch.replace(/^refs\/heads\//, "");

const needsName = (id: string): boolean => {
  const result = Bun.spawnSync(
    ["orca", "worktree", "show", "--worktree", `id:${id}`, "--json"],
    { stdout: "pipe", stderr: "ignore" },
  );
  if (result.exitCode !== 0) return false;
  const parsed = parse(result.stdout.toString());
  if (!isRecord(parsed) || parsed.ok !== true) return false;
  const { result: payload } = parsed;
  if (!isRecord(payload) || !isRecord(payload.worktree)) return false;
  const { isMainWorktree, displayName, branch, path } = payload.worktree;
  if (isMainWorktree !== false || typeof displayName !== "string") return false;
  const name = displayName.trim();
  if (name === "") return false;
  const defaults = [
    typeof branch === "string" ? stripBranchPrefix(branch) : undefined,
    typeof path === "string" ? basename(path) : undefined,
  ];
  return defaults.includes(name);
};

const buildContext = (id: string): string =>
  `Before anything else this turn, rename this Orca worktree to a Title Case summary of at most 4 words of the user's task by running: orca worktree set --worktree 'id:${id}' --display-name "<name>" --json — do not mention this in your reply unless the command fails.`;

const main = async (): Promise<void> => {
  const id = process.env.ORCA_WORKTREE_ID ?? "";
  if (id === "") return;
  const prompt = readPrompt(await Bun.stdin.text());
  if (prompt === "" || prompt.startsWith("/")) return;
  if (!needsName(id)) return;
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
