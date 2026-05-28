import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import fg from "fast-glob";
import matter from "gray-matter";

import type { LoadedPoliciesConfig } from "./config.js";
import { PolicyBuilderError, parseOrThrow } from "./errors.js";
import type { LoadedPolicyModule } from "./module.js";
import { fragmentFrontmatterSchema, type FragmentFrontmatter } from "./schema.js";

export interface LoadedFragment {
  moduleId: string;
  filePath: string;
  relativePath: string;
  body: string;
  frontmatter: FragmentFrontmatter;
  effectiveTargets: string[];
}

export interface ModuleWithFragments extends LoadedPolicyModule {
  fragments: LoadedFragment[];
  fragmentsById: Map<string, LoadedFragment>;
  fragmentsBySlot: Map<string, LoadedFragment[]>;
}

function normalizeBody(body: string): string {
  return body.trimEnd() + "\n";
}

export async function loadModuleFragments(
  config: LoadedPoliciesConfig,
  module: LoadedPolicyModule,
): Promise<ModuleWithFragments> {
  const fragmentFiles = await fg("*.md", {
    cwd: module.moduleDir,
    onlyFiles: true,
    dot: true,
    ignore: module.ignore,
  });

  const fragments: LoadedFragment[] = [];
  const fragmentsById = new Map<string, LoadedFragment>();
  const fragmentsBySlot = new Map<string, LoadedFragment[]>();

  for (const relativePath of fragmentFiles.sort()) {
    const filePath = resolve(module.moduleDir, relativePath);
    const raw = await readFile(filePath, "utf8");
    const parsed = matter(raw);

    if (config.validation.requireFrontmatter && Object.keys(parsed.data).length === 0) {
      throw new PolicyBuilderError("Fragment is missing required frontmatter", {
        filePath,
      });
    }

    const frontmatter = parseOrThrow(fragmentFrontmatterSchema, parsed.data, filePath);
    const effectiveTargets = frontmatter.targets ?? module.defaults.targets ?? [];

    if (config.validation.failOnEmptyTargetSet && effectiveTargets.length === 0) {
      throw new PolicyBuilderError("Fragment has no effective targets", {
        filePath,
      });
    }

    for (const targetId of effectiveTargets) {
      if (targetId !== "*" && !config.targets[targetId]) {
        throw new PolicyBuilderError(`Fragment references unknown target "${targetId}"`, {
          filePath,
        });
      }
    }

    if (!config.slots[frontmatter.slot]) {
      throw new PolicyBuilderError(`Fragment references unknown slot "${frontmatter.slot}"`, {
        filePath,
      });
    }

    if (fragmentsById.has(frontmatter.id)) {
      throw new PolicyBuilderError(`Duplicate fragment id "${frontmatter.id}" within module "${module.id}"`, {
        filePath,
      });
    }

    const fragment: LoadedFragment = {
      moduleId: module.id,
      filePath,
      relativePath,
      body: normalizeBody(parsed.content),
      frontmatter,
      effectiveTargets,
    };

    fragments.push(fragment);
    fragmentsById.set(frontmatter.id, fragment);

    const slotFragments = fragmentsBySlot.get(frontmatter.slot) ?? [];
    slotFragments.push(fragment);
    fragmentsBySlot.set(frontmatter.slot, slotFragments);
  }

  return {
    ...module,
    fragments,
    fragmentsById,
    fragmentsBySlot,
  };
}

export async function loadAllModuleFragments(
  config: LoadedPoliciesConfig,
  modules: Map<string, LoadedPolicyModule>,
): Promise<Map<string, ModuleWithFragments>> {
  const loaded = new Map<string, ModuleWithFragments>();

  for (const module of modules.values()) {
    loaded.set(module.id, await loadModuleFragments(config, module));
  }

  return loaded;
}
