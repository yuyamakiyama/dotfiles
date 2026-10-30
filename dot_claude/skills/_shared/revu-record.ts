import { execFileSync } from "node:child_process";
import { appendFile, copyFile, mkdir, readFile, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

type Kind = "ticket-kickoff" | "pr-review";
type Host = "github.com" | "gitlab.com";

type ArtifactRecord = {
  readonly id: string;
  readonly kind: Kind;
  readonly title: string;
  readonly artifactUrl: string;
  readonly ticketKey?: string;
  readonly prUrl?: string;
  readonly repo?: string;
  readonly number?: number;
  readonly host?: Host;
  readonly publishedAt: string;
};

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const HOST_SHORT: Readonly<Record<Host, string>> = { "github.com": "gh", "gitlab.com": "gl" };

const usage =
  "usage: bun revu-record.ts --kind <ticket-kickoff|pr-review> --title <t> --artifact-url <url> --html <path> [--ticket-key K] [--pr-url U] [--repo R] [--number N] [--host github.com|gitlab.com] [--branch B]";

const fail = (message: string): never => {
  process.stderr.write(`revu-record: ${message}\n${usage}\n`);
  return process.exit(1);
};

const parseFlags = (argv: readonly string[]): Readonly<Record<string, string>> =>
  argv.reduce<{ readonly flags: Readonly<Record<string, string>>; readonly pending: string | null }>(
    (acc, arg) =>
      arg.startsWith("--")
        ? { flags: acc.flags, pending: arg.slice(2) }
        : acc.pending === null
          ? fail(`unexpected argument: ${arg}`)
          : { flags: { ...acc.flags, [acc.pending]: arg }, pending: null },
    { flags: {}, pending: null },
  ).flags;

const slug = (value: string): string =>
  value
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isHost = (value: string): value is Host => value === "github.com" || value === "gitlab.com";
const isKind = (value: string): value is Kind => value === "ticket-kickoff" || value === "pr-review";

const currentBranch = (): string => {
  try {
    return execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

const prId = (kind: Kind, host: Host, repo: string, number: number): string => {
  const head = `${kind}-${HOST_SHORT[host]}-`;
  const tail = `-${number}`;
  const room = Math.max(1, 64 - head.length - tail.length);
  return `${head}${slug(repo).slice(0, room).replace(/-+$/, "")}${tail}`;
};

const buildId = (
  kind: Kind,
  ticketKey: string | undefined,
  pr: { readonly host?: Host; readonly repo?: string; readonly number?: number },
  branch: string,
): string =>
  kind === "ticket-kickoff" && ticketKey !== undefined
    ? `${kind}-${slug(ticketKey)}`.slice(0, 64)
    : kind === "pr-review" && pr.host !== undefined && pr.repo !== undefined && pr.number !== undefined
      ? prId(kind, pr.host, pr.repo, pr.number)
      : `${kind}-${slug(branch)}`.slice(0, 64).replace(/-+$/, "");

const problems = (record: ArtifactRecord): readonly string[] =>
  [
    ID_PATTERN.test(record.id) ? null : `id "${record.id}" does not match ${ID_PATTERN}`,
    record.title.trim() === "" ? "title is empty" : null,
    parseUrl(record.artifactUrl)?.protocol === "https:" && parseUrl(record.artifactUrl)?.hostname === "claude.ai"
      ? null
      : "artifactUrl must be an https URL on claude.ai",
    record.prUrl === undefined || parseUrl(record.prUrl)?.protocol === "https:" ? null : "prUrl must be an https URL",
    record.number === undefined || Number.isInteger(record.number) ? null : "number must be an integer",
    record.ticketKey === undefined || record.ticketKey.trim() !== "" ? null : "ticketKey is empty",
    record.repo === undefined || record.repo.trim() !== "" ? null : "repo is empty",
    Number.isNaN(Date.parse(record.publishedAt)) ? "publishedAt is not ISO 8601" : null,
  ].filter((entry): entry is string => entry !== null);

const main = async (argv: readonly string[]): Promise<void> => {
  const flags = parseFlags(argv);
  const kind = ["ticket-kickoff", "pr-review"].find((k): k is Kind => k === flags["kind"] && isKind(k)) ?? fail("--kind must be ticket-kickoff or pr-review");
  const title = flags["title"] ?? fail("--title is required");
  const artifactUrl = flags["artifact-url"] ?? fail("--artifact-url is required");
  const htmlPath = flags["html"] ?? fail("--html is required");
  const numberRaw = flags["number"];
  const number = numberRaw === undefined ? undefined : Number(numberRaw);
  const host =
    flags["host"] !== undefined
      ? isHost(flags["host"])
        ? flags["host"]
        : fail("--host must be github.com or gitlab.com")
      : flags["pr-url"] !== undefined
        ? [parseUrl(flags["pr-url"])?.hostname ?? ""].find(isHost)
        : undefined;

  const record: ArtifactRecord = {
    id: buildId(kind, flags["ticket-key"], { host, repo: flags["repo"], number }, flags["branch"] ?? currentBranch()),
    kind,
    title,
    artifactUrl,
    ...(flags["ticket-key"] !== undefined ? { ticketKey: flags["ticket-key"] } : {}),
    ...(flags["pr-url"] !== undefined ? { prUrl: flags["pr-url"] } : {}),
    ...(flags["repo"] !== undefined ? { repo: flags["repo"] } : {}),
    ...(number !== undefined ? { number } : {}),
    ...(host !== undefined ? { host } : {}),
    publishedAt: new Date().toISOString(),
  };

  const found = problems(record);
  if (found.length > 0) fail(found.join("; "));
  await readFile(resolve(htmlPath)).catch(() => fail(`cannot read --html ${htmlPath}`));

  const dataDir = join(homedir(), ".local", "share", "revu");
  const artifactsDir = join(dataDir, "artifacts");
  const target = join(artifactsDir, `${record.id}.html`);
  const temp = `${target}.${process.pid}.tmp`;

  await mkdir(artifactsDir, { recursive: true });
  await copyFile(resolve(htmlPath), temp);
  await rename(temp, target);
  await appendFile(join(dataDir, "artifacts.jsonl"), `${JSON.stringify(record)}\n`);

  process.stdout.write(`${JSON.stringify({ id: record.id, html: target })}\n`);
};

await main(process.argv.slice(2));
