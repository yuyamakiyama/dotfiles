import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  sessionStart,
  stalePlugins,
  warningText,
} from "./stale-plugin-hooks.ts";

const script = join(import.meta.dir, "stale-plugin-hooks.ts");
const root = mkdtempSync(join(tmpdir(), "stale-plugin-hooks-"));
const home = join(root, "home");
const stateDir = join(root, "state");
const pluginDir = join(root, "plugin");
const hooksFile = join(pluginDir, "hooks", "hooks.json");

const writeTranscript = (name: string, timestamp: string) => {
  const path = join(root, name);
  writeFileSync(
    path,
    `{"type":"mode"}\n${JSON.stringify({ type: "user", timestamp })}\n`,
  );
  return path;
};

const runHook = async (stdin: string) => {
  const proc = Bun.spawn(["bun", script], {
    stdin: new Blob([stdin]),
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      HOME: home,
      STALE_PLUGIN_HOOKS_STATE_DIR: stateDir,
    },
  });
  const stdout = await new Response(proc.stdout).text();
  const exitCode = await proc.exited;
  return { stdout, exitCode };
};

beforeAll(() => {
  mkdirSync(join(home, ".claude", "plugins"), { recursive: true });
  mkdirSync(join(pluginDir, "hooks"), { recursive: true });
  writeFileSync(hooksFile, "{}");
  utimesSync(hooksFile, new Date("2026-02-01"), new Date("2026-02-01"));
  writeFileSync(
    join(home, ".claude", "settings.json"),
    JSON.stringify({
      enabledPlugins: { "alpha@market": true, "beta@market": false },
    }),
  );
  writeFileSync(
    join(home, ".claude", "plugins", "installed_plugins.json"),
    JSON.stringify({
      version: 2,
      plugins: {
        "alpha@market": [{ scope: "user", installPath: pluginDir }],
        "beta@market": [{ scope: "user", installPath: pluginDir }],
      },
    }),
  );
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("sessionStart", () => {
  test("uses the first timestamp in the transcript", () => {
    const path = writeTranscript("t1.jsonl", "2026-01-05T10:00:00.000Z");
    expect(sessionStart(path)).toBe(Date.parse("2026-01-05T10:00:00.000Z"));
  });

  test("is undefined for a missing file", () => {
    expect(sessionStart(join(root, "missing.jsonl"))).toBeUndefined();
  });
});

describe("stalePlugins", () => {
  const settings = { enabledPlugins: { "a@m": true, "b@m": false } };
  const installed = {
    plugins: {
      "a@m": [{ scope: "user", installPath: pluginDir }],
      "b@m": [{ scope: "user", installPath: pluginDir }],
    },
  };

  test("lists enabled plugins whose hooks are newer", () => {
    expect(stalePlugins(settings, installed, "/x", 0)).toEqual(["a@m"]);
  });

  test("ignores plugins older than the session", () => {
    expect(stalePlugins(settings, installed, "/x", Date.now() + 1e9)).toEqual(
      [],
    );
  });

  test("skips unresolved plugins", () => {
    expect(stalePlugins(settings, { plugins: {} }, "/x", 0)).toEqual([]);
  });

  test("warningText names the plugins", () => {
    expect(warningText(["a@m", "c@m"])).toContain("a@m, c@m");
  });
});

describe("hook process", () => {
  test("warns once for a stale session", async () => {
    const transcript = writeTranscript("old.jsonl", "2026-01-05T10:00:00.000Z");
    const stdin = JSON.stringify({
      session_id: "sess-1",
      transcript_path: transcript,
      cwd: root,
    });
    const first = await runHook(stdin);
    const parsed = JSON.parse(first.stdout);
    expect(first.exitCode).toBe(0);
    expect(parsed.hookSpecificOutput.hookEventName).toBe("UserPromptSubmit");
    expect(parsed.systemMessage).toContain("alpha@market");
    expect(parsed.systemMessage).not.toContain("beta@market");
    const second = await runHook(stdin);
    expect(second).toEqual({ stdout: "", exitCode: 0 });
  });

  test("is silent when the session is newer than the hooks", async () => {
    const transcript = writeTranscript("new.jsonl", "2026-03-01T10:00:00.000Z");
    const result = await runHook(
      JSON.stringify({
        session_id: "sess-2",
        transcript_path: transcript,
        cwd: root,
      }),
    );
    expect(result).toEqual({ stdout: "", exitCode: 0 });
  });

  test("is silent for malformed input and bad session ids", async () => {
    const transcript = writeTranscript(
      "old2.jsonl",
      "2026-01-05T10:00:00.000Z",
    );
    const bad = await runHook("not json");
    const badId = await runHook(
      JSON.stringify({ session_id: "../x", transcript_path: transcript }),
    );
    expect(bad).toEqual({ stdout: "", exitCode: 0 });
    expect(badId).toEqual({ stdout: "", exitCode: 0 });
  });
});
