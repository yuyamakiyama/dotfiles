#!/usr/bin/env bun
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const TICKET_KEY = /([a-z][a-z0-9]+-\d+)/i;

const git = (cwd: string, args: readonly string[]): string | undefined => {
  const result = Bun.spawnSync(["git", "-C", cwd, ...args], {
    stdout: "pipe",
    stderr: "ignore",
  });
  const out = result.stdout.toString().trim();
  return result.exitCode === 0 && out !== "" ? out : undefined;
};

const mainRepoName = (cwd: string): string | undefined => {
  const common = git(cwd, [
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ]);
  if (common === undefined) return undefined;
  return basename(common) === ".git"
    ? basename(dirname(common))
    : basename(common).replace(/\.git$/, "");
};

export const notesPath = (cwd: string): string | undefined => {
  const repo = mainRepoName(cwd);
  const branch = git(cwd, ["symbolic-ref", "--short", "-q", "HEAD"]);
  if (repo === undefined || branch === undefined) return undefined;
  const key = TICKET_KEY.exec(branch)?.[1]?.toUpperCase();
  const name = key ?? `${repo}__${branch.replaceAll("/", "-")}`;
  return join(homedir(), ".local", "share", "revu", "notes", `${name}.md`);
};

if (import.meta.main) {
  const path = notesPath(process.cwd());
  if (path !== undefined) process.stdout.write(`${path}\n`);
}
