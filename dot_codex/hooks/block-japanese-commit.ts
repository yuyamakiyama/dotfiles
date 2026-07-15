#!/usr/bin/env bun
import { readFileSync } from "node:fs";

const JAPANESE = /[　-〿぀-ヿㇰ-ㇿ㐀-䶿一-鿿豈-﫿＀-￯]/;

const raw = await Bun.stdin.text();

const command = (() => {
  try {
    const parsed: unknown = JSON.parse(raw);
    const cmd = (parsed as { tool_input?: { command?: unknown } })?.tool_input
      ?.command;
    return typeof cmd === "string" ? cmd : "";
  } catch {
    return "";
  }
})();

const isGitCommit = /\bgit\b(?:\s+-\S+(?:\s+\S+)?)*\s+commit\b/.test(command);

const fileText = (() => {
  const m = command.match(/(?:-F|--file)(?:=|\s+)(['"]?)([^'"\s]+)\1/);
  if (!m || m[2] === "-") return "";
  try {
    return readFileSync(m[2], "utf8");
  } catch {
    return "";
  }
})();

if (isGitCommit && (JAPANESE.test(command) || JAPANESE.test(fileText))) {
  console.error(
    [
      "❌ Blocked: this git commit message contains Japanese characters.",
      "Commit messages must be written in English (memory: feedback-english-comms).",
      "Romanize or translate domain terms (指標 → metrics, 施策 → initiatives) and retry.",
    ].join("\n"),
  );
  process.exit(2);
}

process.exit(0);
