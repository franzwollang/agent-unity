import type { ZodError, ZodIssue } from "zod";

function formatIssuePath(path: Array<string | number>): string {
  if (!path.length) {
    return "root";
  }

  return path
    .map((part) => (typeof part === "number" ? `[${part}]` : String(part)))
    .join(".");
}

function formatIssues(issues: ZodIssue[]): string {
  return issues
    .map((issue) => `${formatIssuePath(issue.path)}: ${issue.message}`)
    .join("; ");
}

export class PolicyBuilderError extends Error {
  readonly filePath?: string;
  readonly field?: string;

  constructor(message: string, options: { filePath?: string; field?: string } = {}) {
    super(message);
    this.name = "PolicyBuilderError";
    this.filePath = options.filePath;
    this.field = options.field;
  }

  toDisplayString(): string {
    const location = [this.filePath, this.field].filter(Boolean).join(" :: ");
    return location ? `${location}: ${this.message}` : this.message;
  }
}

export function parseOrThrow<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: ZodError } },
  value: unknown,
  filePath: string,
): T {
  const parsed = schema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  throw new PolicyBuilderError(`Schema validation failed: ${formatIssues(parsed.error.issues)}`, {
    filePath,
  });
}
