#!/usr/bin/env bun

const conventionalBranch =
  /^(feat|fix|hotfix|release|chore)\/[a-z0-9]+(-[a-z0-9]+)*$/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const readInput = (raw: string): { prompt: string; cwd: string } => {
  const parsed = parse(raw);
  return {
    prompt:
      isRecord(parsed) && typeof parsed.prompt === "string"
        ? parsed.prompt.trim()
        : "",
    cwd: isRecord(parsed) && typeof parsed.cwd === "string" ? parsed.cwd : "",
  };
};

const git = (cwd: string, args: readonly string[]) =>
  Bun.spawnSync(["git", "-C", cwd, ...args], {
    stdout: "pipe",
    stderr: "ignore",
  });

const worktreePath = (id: string): string | undefined => {
  const result = Bun.spawnSync(
    ["orca", "worktree", "show", "--worktree", `id:${id}`, "--json"],
    { stdout: "pipe", stderr: "ignore" },
  );
  if (result.exitCode !== 0) return undefined;
  const parsed = parse(result.stdout.toString());
  if (!isRecord(parsed) || parsed.ok !== true) return undefined;
  const { result: payload } = parsed;
  if (!isRecord(payload) || !isRecord(payload.worktree)) return undefined;
  const { isMainWorktree, path } = payload.worktree;
  if (isMainWorktree !== false) return undefined;
  return typeof path === "string" && path !== "" ? path : "";
};

const currentBranch = (cwd: string): string | undefined => {
  const result = git(cwd, ["symbolic-ref", "--short", "-q", "HEAD"]);
  const branch = result.stdout.toString().trim();
  return result.exitCode === 0 && branch !== "" ? branch : undefined;
};

const isPushed = (cwd: string, branch: string): boolean =>
  git(cwd, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
    .exitCode === 0 ||
  git(cwd, ["show-ref", "--verify", "--quiet", `refs/remotes/origin/${branch}`])
    .exitCode === 0;

const shellQuote = (s: string): string => `'${s.replaceAll("'", "'\\''")}'`;

const buildContext = (cwd: string, branch: string): string =>
  `Before anything else this turn, rename the current local git branch to follow Conventional Branch by running: git -C ${shellQuote(cwd)} branch -m ${shellQuote(branch)} '<new-name>' — where <new-name> is <type>/<description>, lowercase, hyphen-separated, with type one of feat, fix, hotfix, release, chore chosen from the user's task. Put the ticket ID first when there is one (keep any ticket key already in the old branch name, e.g. spex-3123-foo becomes feat/spex-3123-..., or take it from the user's prompt). The description is a short summary of the task. Do not mention this in your reply unless the command fails.`;

const main = async (): Promise<void> => {
  const id = process.env.ORCA_WORKTREE_ID ?? "";
  if (id === "") return;
  const { prompt, cwd: inputCwd } = readInput(await Bun.stdin.text());
  if (prompt === "" || prompt.startsWith("/")) return;
  const path = worktreePath(id);
  if (path === undefined) return;
  const cwd = path === "" ? inputCwd : path;
  if (cwd === "") return;
  const branch = currentBranch(cwd);
  if (branch === undefined || conventionalBranch.test(branch)) return;
  if (isPushed(cwd, branch)) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: buildContext(cwd, branch),
      },
    }),
  );
};

main().catch(() => undefined);
