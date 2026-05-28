import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { PolicyBuilderError, parseOrThrow } from "./errors.js";
import { policiesConfigSchema, type PoliciesConfig } from "./schema.js";

const srcDir = dirname(fileURLToPath(import.meta.url));

export const packageDir = resolve(srcDir, "..");

export const BUILTIN_TEMPLATES: Record<string, string> = {
  "cursor-rule": "cursor-rule.eta",
  "claude-doc": "claude-doc.eta",
  "claude-rule": "claude-rule.eta",
  "agents-doc": "agents-doc.eta",
  "gemini-doc": "gemini-doc.eta",
  "github-copilot": "github-copilot.eta",
  "copilot-scoped": "copilot-scoped.eta",
  "plain-markdown": "plain-markdown.eta",
};

export interface ToolPaths {
  repoRoot: string;
  policiesDir: string;
}

export interface LoadedPoliciesConfig extends PoliciesConfig {
  configPath: string;
  repoRoot: string;
  policiesDir: string;
}

export async function resolveToolPaths(options: { repoRoot?: string } = {}): Promise<ToolPaths> {
  const repoRoot = resolve(process.cwd(), options.repoRoot ?? ".");
  const policiesDir = resolve(repoRoot, ".agents/policies");

  return {
    repoRoot,
    policiesDir,
  };
}

export async function loadPoliciesConfig(
  options: { repoRoot?: string } = {},
): Promise<LoadedPoliciesConfig> {
  const paths = await resolveToolPaths(options);
  const configPath = resolve(paths.policiesDir, "policies.config.json");
  const raw = await readFile(configPath, "utf8");
  const parsedJson = JSON.parse(raw) as unknown;
  const config = parseOrThrow(policiesConfigSchema, parsedJson, configPath);

  for (const [slotName, slotConfig] of Object.entries(config.slots)) {
    for (const targetId of slotConfig.supportedBy) {
      if (!config.targets[targetId]) {
        throw new PolicyBuilderError(`Slot "${slotName}" references unknown target "${targetId}"`, {
          filePath: configPath,
        });
      }
    }
  }

  for (const [targetId, targetConfig] of Object.entries(config.targets)) {
    if (!BUILTIN_TEMPLATES[targetConfig.kind]) {
      throw new PolicyBuilderError(
        `Target "${targetId}" uses unsupported kind "${targetConfig.kind}". Built-in kinds: ${Object.keys(BUILTIN_TEMPLATES).join(", ")}`,
        { filePath: configPath },
      );
    }
  }

  return {
    ...config,
    configPath,
    ...paths,
  };
}

export function resolveBuiltinTemplate(kind: string): string {
  const templateFile = BUILTIN_TEMPLATES[kind];
  if (!templateFile) {
    throw new PolicyBuilderError(`No built-in template for target kind "${kind}"`);
  }

  return resolve(packageDir, "templates", templateFile);
}
