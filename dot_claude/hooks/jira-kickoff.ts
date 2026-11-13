#!/usr/bin/env bun

const DEFAULT_SITE = "https://mapspeople.atlassian.net";
const BROWSE_URL =
  /^https:\/\/[a-z0-9-]+\.atlassian\.net\/browse\/[A-Z][A-Z0-9]*-\d+\/?(?:\?\S*)?$/;
const ISSUE_KEY = /^[A-Z][A-Z0-9]+-\d+$/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const parse = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const readPrompt = (raw: string): string => {
  const parsed = parse(raw);
  return isRecord(parsed) && typeof parsed.prompt === "string"
    ? parsed.prompt.trim()
    : "";
};

const ticketUrl = (prompt: string): string | undefined => {
  if (prompt === "" || prompt.startsWith("/")) return undefined;
  if (BROWSE_URL.test(prompt)) return prompt;
  return ISSUE_KEY.test(prompt)
    ? `${DEFAULT_SITE}/browse/${prompt}`
    : undefined;
};

const main = async (): Promise<void> => {
  const url = ticketUrl(readPrompt(await Bun.stdin.text()));
  if (url === undefined) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: `The prompt is only the Jira ticket ${url}. Invoke the ticket-kickoff skill with the Skill tool, passing ${url} as args, before doing anything else.`,
      },
    }),
  );
};

main().catch(() => undefined);
