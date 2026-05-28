import { readFile, stat } from "node:fs/promises";
import { relative, resolve } from "node:path";

import fg from "fast-glob";

import type { LoadedPoliciesConfig } from "./config.js";
import { PolicyBuilderError, parseOrThrow } from "./errors.js";
import { policyModuleSchema, type PolicyModuleConfig } from "./schema.js";

export interface LoadedPolicyModule extends PolicyModuleConfig {
  moduleDir: string;
  modulePath: string;
  relativeDir: string;
}

export async function loadPolicyModules(config: LoadedPoliciesConfig): Promise<Map<string, LoadedPolicyModule>> {
  const policyFiles = await fg("**/policy.json", {
    cwd: config.policiesDir,
    onlyFiles: true,
    dot: true,
  });

  const modules = new Map<string, LoadedPolicyModule>();

  for (const relativePolicyPath of policyFiles) {
    const modulePath = resolve(config.policiesDir, relativePolicyPath);
    const moduleDir = resolve(modulePath, "..");
    const raw = await readFile(modulePath, "utf8");
    const parsedJson = JSON.parse(raw) as unknown;
    const moduleConfig = parseOrThrow(policyModuleSchema, parsedJson, modulePath);

    if (moduleConfig.fragmentDiscovery !== "implicit-siblings") {
      throw new PolicyBuilderError(`Unsupported fragment discovery mode "${moduleConfig.fragmentDiscovery}"`, {
        filePath: modulePath,
      });
    }

    if (modules.has(moduleConfig.id)) {
      throw new PolicyBuilderError(`Duplicate module id "${moduleConfig.id}"`, {
        filePath: modulePath,
      });
    }

    for (const targetId of moduleConfig.defaults.targets ?? []) {
      if (!config.targets[targetId]) {
        throw new PolicyBuilderError(`Module default references unknown target "${targetId}"`, {
          filePath: modulePath,
        });
      }
    }

    for (const output of moduleConfig.outputs) {
      if (!config.targets[output.target]) {
        throw new PolicyBuilderError(`Output references unknown target "${output.target}"`, {
          filePath: modulePath,
        });
      }
    }

    modules.set(moduleConfig.id, {
      ...moduleConfig,
      moduleDir,
      modulePath,
      relativeDir: relative(config.policiesDir, moduleDir),
    });
  }

  const globalPath = resolve(config.policiesDir, "global.md");
  try {
    const globalStats = await stat(globalPath);
    if (globalStats.isFile()) {
      if (modules.has("global")) {
        throw new PolicyBuilderError('The synthetic "global" module conflicts with an existing module id.', {
          filePath: globalPath,
        });
      }

      modules.set("global", {
        id: "global",
        title: "Global Policy",
        fragmentDiscovery: "implicit-siblings",
        ignore: ["GLOBAL_POLICY_REFERENCE.md"],
        outputs: [
          {
            target: "plain-markdown",
            out: ".agents/policies/GLOBAL_POLICY_REFERENCE.md",
          },
        ],
        defaults: {
          targets: Object.keys(config.targets),
          slot: "prelude",
        },
        moduleDir: config.policiesDir,
        modulePath: globalPath,
        relativeDir: ".",
      });
    }
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  return modules;
}
