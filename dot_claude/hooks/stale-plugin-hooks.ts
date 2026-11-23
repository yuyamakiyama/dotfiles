#!/usr/bin/env bun
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SESSION_ID = /^[A-Za-z0-9-]+$/;
const TRANSCRIPT_HEAD_BYTES = 262144;

type Plugin = { name: string; hooksTime: number };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const readJson = (path: string): unknown => {
  try {
    return parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
};

const mtimeOf = (path: string): number | undefined => {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return undefined;
  }
};

const toMillis = (v: unknown): number | undefined => {
  const ms = typeof v === "string" ? Date.parse(v) : Number.NaN;
  return Number.isNaN(ms) ? undefined : ms;
};

const readHead = (path: string): string => {
  const fd = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(TRANSCRIPT_HEAD_BYTES);
    const read = readSync(fd, buffer, 0, TRANSCRIPT_HEAD_BYTES, 0);
    return buffer.toString("utf8", 0, read);
  } finally {
    closeSync(fd);
  }
};

const firstTimestamp = (head: string): number | undefined =>
  head
    .split("\n")
    .map(parse)
    .map((line) => (isRecord(line) ? toMillis(line.timestamp) : undefined))
    .find((ms) => ms !== undefined);

export const sessionStart = (transcriptPath: string): number | undefined => {
  try {
    const fromLines = firstTimestamp(readHead(transcriptPath));
    if (fromLines !== undefined) return fromLines;
    const birth = statSync(transcriptPath).birthtimeMs;
    return birth > 0 ? birth : undefined;
  } catch {
    return undefined;
  }
};

const enabledPluginKeys = (settings: unknown): string[] => {
  const enabled = isRecord(settings) ? settings.enabledPlugins : undefined;
  return isRecord(enabled)
    ? Object.entries(enabled)
        .filter(([, value]) => value === true)
        .map(([key]) => key)
    : [];
};

const installEntries = (installed: unknown, key: string, cwd: string) => {
  const plugins = isRecord(installed) ? installed.plugins : undefined;
  const entries = isRecord(plugins) ? plugins[key] : undefined;
  return Array.isArray(entries)
    ? entries
        .filter(isRecord)
        .filter((entry) => entry.scope === "user" || entry.projectPath === cwd)
    : [];
};

const resolvePlugin = (
  installed: unknown,
  key: string,
  cwd: string,
): Plugin | undefined => {
  const entries = installEntries(installed, key, cwd);
  const installPath = entries
    .map((entry) => entry.installPath)
    .find((p): p is string => typeof p === "string");
  const hooksMtime =
    installPath === undefined
      ? undefined
      : mtimeOf(join(installPath, "hooks", "hooks.json"));
  if (hooksMtime === undefined) return undefined;
  const recorded = entries
    .flatMap((entry) => [
      toMillis(entry.installedAt),
      toMillis(entry.lastUpdated),
    ])
    .filter((ms): ms is number => ms !== undefined);
  return { name: key, hooksTime: Math.max(hooksMtime, ...recorded) };
};

export const stalePlugins = (
  settings: unknown,
  installed: unknown,
  cwd: string,
  startedAt: number,
): string[] =>
  enabledPluginKeys(settings)
    .map((key) => resolvePlugin(installed, key, cwd))
    .filter((p): p is Plugin => p !== undefined)
    .filter((p) => p.hooksTime > startedAt)
    .map((p) => p.name);

export const warningText = (names: string[]): string =>
  `This session started before the hooks of ${names.join(", ")} were added or changed, so they are not active here. Run /reload-plugins.`;

const stateDir = (): string =>
  process.env.STALE_PLUGIN_HOOKS_STATE_DIR ??
  join(homedir(), ".local", "state", "claude-hooks", "stale-plugin-hooks");

const run = (raw: string): string | undefined => {
  const input = parse(raw);
  if (!isRecord(input)) return undefined;
  const { session_id: sessionId, transcript_path: transcriptPath } = input;
  if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId))
    return undefined;
  if (typeof transcriptPath !== "string") return undefined;
  const statePath = join(stateDir(), sessionId);
  if (existsSync(statePath)) return undefined;
  const startedAt = sessionStart(transcriptPath);
  if (startedAt === undefined) return undefined;
  const claudeDir = join(homedir(), ".claude");
  const cwd = typeof input.cwd === "string" ? input.cwd : process.cwd();
  const names = stalePlugins(
    readJson(join(claudeDir, "settings.json")),
    readJson(join(claudeDir, "plugins", "installed_plugins.json")),
    cwd,
    startedAt,
  );
  if (names.length === 0) return undefined;
  mkdirSync(stateDir(), { recursive: true });
  writeFileSync(statePath, new Date().toISOString());
  const message = warningText(names);
  return JSON.stringify({
    systemMessage: message,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: message,
    },
  });
};

const main = async () => {
  try {
    const output = run(await Bun.stdin.text());
    if (output !== undefined) process.stdout.write(`${output}\n`);
  } catch {
    return;
  }
};

if (import.meta.main) await main();
