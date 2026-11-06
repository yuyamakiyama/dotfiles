#!/usr/bin/env bun
import { homedir } from "node:os";
import { basename, join } from "node:path";

const TICKET_KEY = /([a-z][a-z0-9]+-\d+)/i;

const git = (cwd: string, args: readonly string[]): string | undefined => {
  const result = Bun.spawnSync(["git", "-C", cwd, ...args], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const out = result.stdout.toString().trim();
  return result.exitCode === 0 && out !== "" ? out : undefined;
};

export const notesPath = (cwd: string): string | undefined => {
  const root = git(cwd, ["rev-parse", "--show-toplevel"]);
  const branch = git(cwd, ["symbolic-ref", "--short", "-q", "HEAD"]);
  if (root === undefined || branch === undefined) return undefined;
  const key = TICKET_KEY.exec(branch)?.[1]?.toUpperCase();
  const name = key ?? `${basename(root)}__${branch.replaceAll("/", "-")}`;
  return join(homedir(), ".local", "share", "revu", "notes", `${name}.md`);
};

if (import.meta.main) {
  const path = notesPath(process.cwd());
  if (path !== undefined) process.stdout.write(`${path}\n`);
}
