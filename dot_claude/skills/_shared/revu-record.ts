import { execFileSync } from "node:child_process";
import { appendFile, copyFile, mkdir, readFile, rename, rm } from "node:fs/promises";
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

type Meta = {
  readonly title?: string;
  readonly ticketKey?: string;
  readonly prUrl?: string;
  readonly repo?: string;
  readonly number?: number;
  readonly host?: Host;
  readonly branch?: string;
};

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const FLAGS = ["kind", "artifact-url", "html", "meta"];
const HOST_SHORT: Readonly<Record<Host, string>> = { "github.com": "gh", "gitlab.com": "gl" };

const usage =
  "usage: bun revu-record.ts --kind <ticket-kickoff|pr-review> --artifact-url <url> --html <path> --meta <path.json>\nmeta fields: title, ticketKey?, prUrl?, repo?, number?, host?, branch?";

const fail = (message: string): never => {
  process.stderr.write(`revu-record: ${message}\n${usage}\n`);
  return process.exit(1);
};

const parseFlags = (argv: readonly string[]): Readonly<Record<string, string>> => {
  const pairs = argv.reduce<readonly string[][]>(
    (acc, arg, index) =>
      index % 2 === 0
        ? arg.startsWith("--") && FLAGS.includes(arg.slice(2))
          ? [...acc, [arg.slice(2)]]
          : fail(`expected a known flag, got: ${arg}`)
        : arg.startsWith("--")
          ? fail(`flag ${acc[acc.length - 1]?.[0]} is missing its value`)
          : [...acc.slice(0, -1), [...(acc[acc.length - 1] ?? []), arg]],
    [],
  );
  return pairs.reduce<Readonly<Record<string, string>>>(
    (acc, pair) => (pair[1] === undefined ? fail(`flag ${pair[0]} is missing its value`) : { ...acc, [pair[0] ?? ""]: pair[1] }),
    {},
  );
};

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

const isPlainHttps = (value: string): boolean => {
  const url = parseUrl(value);
  return url !== null && url.protocol === "https:" && url.username === "" && url.password === "";
};

const isHost = (value: unknown): value is Host => value === "github.com" || value === "gitlab.com";
const isKind = (value: string): value is Kind => value === "ticket-kickoff" || value === "pr-review";
const isString = (value: unknown): value is string => typeof value === "string";
const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const currentBranch = (): string => {
  try {
    return execFileSync("git", ["branch", "--show-current"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
};

const stamp = (now: Date): string => now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);

const parseMeta = (raw: unknown): Meta => {
  const object = isObject(raw) ? raw : fail("meta file must contain a JSON object");
  const optionalString = (key: string): string | undefined => {
    const value = object[key];
    return value === undefined || value === null ? undefined : isString(value) ? value : fail(`meta.${key} must be a string`);
  };
  const number = object["number"];
  const parsedNumber =
    number === undefined || number === null
      ? undefined
      : typeof number === "number" && Number.isSafeInteger(number) && number > 0
        ? number
        : fail("meta.number must be a positive safe integer");
  const host = object["host"];
  return {
    title: optionalString("title"),
    ticketKey: optionalString("ticketKey"),
    prUrl: optionalString("prUrl"),
    repo: optionalString("repo"),
    number: parsedNumber,
    host: host === undefined || host === null ? undefined : isHost(host) ? host : fail("meta.host must be github.com or gitlab.com"),
    branch: optionalString("branch"),
  };
};

const prId = (kind: Kind, host: Host, repo: string, number: number): string => {
  const head = `${kind}-${HOST_SHORT[host]}-`;
  const tail = `-${number}`;
  const room = Math.max(1, 64 - head.length - tail.length);
  return `${head}${slug(repo).slice(0, room).replace(/-+$/, "")}${tail}`;
};

const withFallback = (kind: Kind, base: string, now: Date): string =>
  slug(base) === "" ? `${kind}-${stamp(now)}` : `${kind}-${slug(base)}`.slice(0, 64).replace(/-+$/, "");

const buildId = (kind: Kind, meta: Meta, host: Host | undefined, branch: string, now: Date): string =>
  kind === "ticket-kickoff" && meta.ticketKey !== undefined && slug(meta.ticketKey) !== ""
    ? withFallback(kind, meta.ticketKey, now)
    : kind === "pr-review" && host !== undefined && meta.repo !== undefined && meta.number !== undefined && slug(meta.repo) !== ""
      ? prId(kind, host, meta.repo, meta.number)
      : withFallback(kind, branch, now);

const problems = (record: ArtifactRecord): readonly string[] =>
  [
    ID_PATTERN.test(record.id) ? null : `id "${record.id}" does not match ${ID_PATTERN}`,
    record.title.trim() === "" ? "title is empty" : null,
    isPlainHttps(record.artifactUrl) && parseUrl(record.artifactUrl)?.hostname === "claude.ai"
      ? null
      : "artifactUrl must be an https URL on claude.ai without credentials",
    record.prUrl === undefined || isPlainHttps(record.prUrl) ? null : "prUrl must be an https URL without credentials",
    record.number === undefined || (Number.isSafeInteger(record.number) && record.number > 0) ? null : "number must be a positive integer",
    record.ticketKey === undefined || record.ticketKey.trim() !== "" ? null : "ticketKey is empty",
    record.repo === undefined || record.repo.trim() !== "" ? null : "repo is empty",
    Number.isNaN(Date.parse(record.publishedAt)) ? "publishedAt is not ISO 8601" : null,
  ].filter((entry): entry is string => entry !== null);

const main = async (argv: readonly string[]): Promise<void> => {
  const flags = parseFlags(argv);
  const kindFlag = flags["kind"] ?? "";
  const kind = isKind(kindFlag) ? kindFlag : fail("--kind must be ticket-kickoff or pr-review");
  const artifactUrl = flags["artifact-url"] ?? fail("--artifact-url is required");
  const htmlPath = flags["html"] ?? fail("--html is required");
  const metaPath = flags["meta"] ?? fail("--meta is required");

  const rawMeta: unknown = await readFile(resolve(metaPath), "utf8")
    .then((text): unknown => JSON.parse(text))
    .catch(() => fail(`cannot read or parse --meta ${metaPath}`));
  const meta = parseMeta(rawMeta);
  const title = meta.title ?? fail("meta.title is required");
  const host = meta.host ?? (meta.prUrl === undefined ? undefined : [parseUrl(meta.prUrl)?.hostname].find(isHost));
  const now = new Date();

  const record: ArtifactRecord = {
    id: buildId(kind, meta, host, meta.branch ?? currentBranch(), now),
    kind,
    title,
    artifactUrl,
    ...(meta.ticketKey !== undefined ? { ticketKey: meta.ticketKey } : {}),
    ...(meta.prUrl !== undefined ? { prUrl: meta.prUrl } : {}),
    ...(meta.repo !== undefined ? { repo: meta.repo } : {}),
    ...(meta.number !== undefined ? { number: meta.number } : {}),
    ...(host !== undefined ? { host } : {}),
    publishedAt: now.toISOString(),
  };

  const found = problems(record);
  if (found.length > 0) fail(found.join("; "));
  await readFile(resolve(htmlPath)).catch(() => fail(`cannot read --html ${htmlPath}`));

  const dataDir = join(homedir(), ".local", "share", "revu");
  const artifactsDir = join(dataDir, "artifacts");
  const target = join(artifactsDir, `${record.id}.html`);
  const temp = `${target}.${process.pid}.tmp`;

  await mkdir(artifactsDir, { recursive: true });
  await copyFile(resolve(htmlPath), temp)
    .then(() => rename(temp, target))
    .catch(async (error: unknown) => {
      await rm(temp, { force: true });
      return fail(`could not write HTML copy: ${error instanceof Error ? error.message : String(error)}`);
    });
  await appendFile(join(dataDir, "artifacts.jsonl"), `${JSON.stringify(record)}\n`);

  process.stdout.write(`${JSON.stringify({ id: record.id, html: target })}\n`);
};

await main(process.argv.slice(2));
