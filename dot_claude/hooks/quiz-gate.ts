#!/usr/bin/env bun
import { existsSync, readFileSync } from "node:fs";
import { notesPath } from "./notes-path.ts";

const HARD_BLOCK_FROM = "2026-11-23";
const PASSED = /^Quiz: passed/m;
const SEPARATORS = /[\n;&|()]/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const readInput = (raw: string) => {
  const parsed = parse(raw);
  if (!isRecord(parsed)) return undefined;
  const toolInput = parsed.tool_input;
  const command =
    isRecord(toolInput) && typeof toolInput.command === "string"
      ? toolInput.command
      : undefined;
  return {
    tool: parsed.tool_name,
    command,
    cwd: typeof parsed.cwd === "string" ? parsed.cwd : process.cwd(),
  };
};

const marksReady = (segment: string): boolean => {
  const words = segment.trim().split(/\s+/);
  const pr = /^gh\s+pr\s+ready(\s|$)/.test(segment.trim());
  const mr = /^glab\s+mr\s+update(\s|$)/.test(segment.trim());
  return (
    (pr && !words.includes("--undo")) ||
    (mr && words.some((w) => w === "--ready" || w.startsWith("--ready=")))
  );
};

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

const localDate = (): string => {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const today = (): string => {
  const override = process.env.QUIZ_GATE_TODAY;
  return override !== undefined && DATE_FORMAT.test(override)
    ? override
    : localDate();
};

const main = async (): Promise<void> => {
  const input = readInput(await Bun.stdin.text());
  if (input?.tool !== "Bash" || input.command === undefined) return;
  if (!input.command.split(SEPARATORS).some(marksReady)) return;
  const path = notesPath(input.cwd);
  if (path === undefined) return;
  if (existsSync(path) && PASSED.test(readFileSync(path, "utf8"))) return;
  const message = `Quiz not passed for this ticket. Run /quiz first. Notes file: ${path} (needs a line starting with "Quiz: passed").`;
  const blocking = today() >= HARD_BLOCK_FROM;
  process.stdout.write(
    JSON.stringify(
      blocking
        ? {
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              permissionDecision: "deny",
              permissionDecisionReason: message,
            },
          }
        : {
            systemMessage: `Warning: ${message}`,
            hookSpecificOutput: {
              hookEventName: "PreToolUse",
              additionalContext: message,
            },
          },
    ),
  );
};

main().catch(() => undefined);
