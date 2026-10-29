import { join } from "node:path";

type Json = Record<string, unknown>;

const SEVERITIES = ["critical", "high", "medium", "low"];
const FINDINGS_PLACEHOLDER = "{{FINDINGS_JSON}}";
const TITLE_PLACEHOLDER = "{{TITLE}}";

const isRecord = (v: unknown): v is Json =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim() !== "";
const isCount = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;

const requireStrings = (obj: Json, keys: string[], path: string): string[] =>
  keys
    .filter((k) => !isNonEmptyString(obj[k]))
    .map((k) => `${path}.${k} must be a non-empty string`);

const requireCounts = (obj: Json, keys: string[], path: string): string[] =>
  keys
    .filter((k) => !isCount(obj[k]))
    .map((k) => `${path}.${k} must be a non-negative number`);

const section = (data: Json, key: string, check: (obj: Json) => string[]): string[] => {
  const value = data[key];
  return isRecord(value) ? check(value) : [`${key} must be an object`];
};

const listOf = (
  data: Json,
  key: string,
  check: (item: Json, path: string) => string[],
): string[] => {
  const value = data[key];
  return Array.isArray(value)
    ? value.flatMap((item: unknown, i) =>
        isRecord(item) ? check(item, `${key}[${i}]`) : [`${key}[${i}] must be an object`],
      )
    : [`${key} must be an array`];
};

const checkFixOption = (o: unknown, path: string): string[] =>
  isRecord(o)
    ? [
        ...requireStrings(o, ["id", "label", "description"], path),
        ...(o.recommended === undefined || typeof o.recommended === "boolean"
          ? []
          : [`${path}.recommended must be a boolean`]),
        ...(o.preview === undefined || typeof o.preview === "string"
          ? []
          : [`${path}.preview must be a string`]),
      ]
    : [`${path} must be an object`];

const checkFixOptions = (options: unknown, path: string): string[] => {
  if (options === undefined) return [];
  if (!Array.isArray(options) || options.length === 0) {
    return [`${path} must be an array with at least one option`];
  }
  const ids = options.flatMap((o: unknown) => (isRecord(o) && isNonEmptyString(o.id) ? [o.id] : []));
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  const recommended = options.filter((o: unknown) => isRecord(o) && o.recommended === true);
  return [
    ...options.flatMap((o: unknown, i) => checkFixOption(o, `${path}[${i}]`)),
    ...(duplicates.length > 0
      ? [`${path} ids must be unique (duplicate: ${[...new Set(duplicates)].join(", ")})`]
      : []),
    ...(recommended.length > 1 ? [`${path} may have at most one recommended:true option`] : []),
  ];
};

const checkGlossaryEntry = (g: unknown, path: string): string[] =>
  isRecord(g) ? requireStrings(g, ["term", "meaning"], path) : [`${path} must be an object`];

const checkGlossary = (glossary: unknown): string[] => {
  if (glossary === undefined) return [];
  if (!Array.isArray(glossary)) return ["glossary must be an array"];
  const terms = glossary.flatMap((g: unknown) =>
    isRecord(g) && isNonEmptyString(g.term) ? [g.term.trim().toLowerCase()] : [],
  );
  const duplicates = terms.filter((t, i) => terms.indexOf(t) !== i);
  return [
    ...glossary.flatMap((g: unknown, i) => checkGlossaryEntry(g, `glossary[${i}]`)),
    ...(duplicates.length > 0
      ? [`glossary terms must be unique, case-insensitive (duplicate: ${[...new Set(duplicates)].join(", ")})`]
      : []),
  ];
};

const checkFinding = (f: Json, path: string): string[] => [
  ...requireStrings(f, ["id", "title", "category", "verdict", "file", "defect", "failureScenario", "fix", "plain"], path),
  ...(typeof f.severity === "string" && SEVERITIES.includes(f.severity)
    ? []
    : [`${path}.severity must be one of ${SEVERITIES.join("|")}`]),
  ...(typeof f.line === "number" || isNonEmptyString(f.line)
    ? []
    : [`${path}.line must be a number or string`]),
  ...(f.flow === undefined || Array.isArray(f.flow) ? [] : [`${path}.flow must be an array`]),
  ...(f.svg === undefined || typeof f.svg === "string" ? [] : [`${path}.svg must be a string`]),
  ...checkFixOptions(f.fixOptions, `${path}.fixOptions`),
];

const checkExcluded = (item: Json, path: string): string[] => [
  ...requireStrings(item, ["file", "claim", "reason"], path),
  ...(typeof item.line === "number" || isNonEmptyString(item.line)
    ? []
    : [`${path}.line must be a number or string`]),
];

const validate = (data: unknown): string[] =>
  isRecord(data)
    ? [
        ...requireStrings(data, ["title", "nextAction", "plainSummary"], "data"),
        ...checkGlossary(data.glossary),
        ...section(data, "mr", (mr) => requireStrings(mr, ["title", "url", "branch", "target", "sha"], "mr")),
        ...section(data, "pipeline", (p) =>
          requireCounts(p, ["candidates", "afterDedupe", "kept", "rejected", "filteredOut"], "pipeline"),
        ),
        ...listOf(data, "findings", checkFinding),
        ...listOf(data, "rejected", checkExcluded),
        ...listOf(data, "filteredOut", checkExcluded),
      ]
    : ["root must be an object"];

const escapeForScript = (json: string): string =>
  json
    .replaceAll("</", "<\\/")
    .replaceAll("<!--", "\\u003c!--")
    .replaceAll(" ", "\\u2028")
    .replaceAll(" ", "\\u2029");

const escapeHtmlText = (s: string): string =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const injectOnce = (template: string, placeholder: string, value: string): string | null => {
  const parts = template.split(placeholder);
  return parts.length === 2 ? parts.join(value) : null;
};

const fail = (problems: string[]): never => {
  console.error(
    [`render failed with ${problems.length} problem(s):`, ...problems.map((p) => `  - ${p}`)].join("\n"),
  );
  return process.exit(1);
};

const parseJson = (text: string): { ok: true; value: unknown } | { ok: false; error: string } => {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
};

const main = async (args: string[]): Promise<void> => {
  const [input, output] = args;
  if (!input || !output) {
    return fail(["usage: bun render.ts <findings.json> <out.html>"]);
  }
  const inputFile = Bun.file(input);
  if (!(await inputFile.exists())) {
    return fail([`input not found: ${input}`]);
  }
  const parsed = parseJson(await inputFile.text());
  if (!parsed.ok) {
    return fail([`invalid JSON in ${input}: ${parsed.error}`]);
  }
  const problems = validate(parsed.value);
  if (problems.length > 0) {
    return fail(problems);
  }
  const data = parsed.value;
  const title = isRecord(data) && isNonEmptyString(data.title) ? data.title : "Code Review";
  const template = await Bun.file(join(import.meta.dir, "..", "template.html")).text();
  const withData = injectOnce(template, FINDINGS_PLACEHOLDER, escapeForScript(JSON.stringify(data)));
  if (withData === null) {
    return fail([`template must contain ${FINDINGS_PLACEHOLDER} exactly once`]);
  }
  const html = injectOnce(withData, TITLE_PLACEHOLDER, escapeHtmlText(title));
  if (html === null) {
    return fail([`template must contain ${TITLE_PLACEHOLDER} exactly once`]);
  }
  await Bun.write(output, html);
  console.log(`wrote ${output} (${html.length} bytes)`);
};

await main(process.argv.slice(2));
