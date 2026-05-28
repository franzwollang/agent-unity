import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { Eta } from "eta";

import type { LoadedPoliciesConfig } from "./config.js";
import { resolveBuiltinTemplate } from "./config.js";
import { buildBannerText, formatBanner } from "./banner.js";
import { PolicyBuilderError } from "./errors.js";
import type { ModuleWithFragments, LoadedFragment } from "./fragment.js";
import type { LoadedPolicyModule } from "./module.js";
import type { IncludeConfig, OutputConfig } from "./schema.js";

interface ResolvedSection {
  id: string;
  title: string;
  body: string;
  slot: string;
  sourceSlot: string;
  sourceModuleId: string;
  filePath: string;
  order: number;
  requires: string[];
  injectionGroup: number;
  showHeading: boolean;
}

function renderSlotSections(sections: ResolvedSection[]): string {
  if (sections.length === 0) {
    return "";
  }

  return sections
    .map((section) => {
      const parts: string[] = [];
      if (section.showHeading) {
        parts.push(`## ${section.title}`);
      }
      parts.push(section.body.trimEnd());
      return parts.join("\n\n");
    })
    .join("\n\n");
}

export interface RenderedOutput {
  moduleId: string;
  outputPath: string;
  absoluteOutputPath: string;
  target: string;
  content: string;
}

function matchesTarget(fragment: LoadedFragment, targetId: string): boolean {
  return fragment.effectiveTargets.includes("*") || fragment.effectiveTargets.includes(targetId);
}

function compareSections(a: ResolvedSection, b: ResolvedSection): number {
  return (
    a.injectionGroup - b.injectionGroup ||
    a.order - b.order ||
    a.id.localeCompare(b.id) ||
    a.sourceModuleId.localeCompare(b.sourceModuleId)
  );
}

function sortSectionsForSlot(
  config: LoadedPoliciesConfig,
  slotName: string,
  sections: ResolvedSection[],
): ResolvedSection[] {
  const byKey = new Map<string, ResolvedSection>();
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();
  const indegree = new Map<string, number>();

  for (const section of sections) {
    const key = `${section.sourceModuleId}:${section.id}`;
    byKey.set(key, section);
    dependencies.set(key, new Set());
    dependents.set(key, new Set());
    indegree.set(key, 0);
  }

  for (const section of sections) {
    const sectionKey = `${section.sourceModuleId}:${section.id}`;
    for (const requireId of section.requires) {
      let dependencyKey = `${section.sourceModuleId}:${requireId}`;
      if (!byKey.has(dependencyKey)) {
        const matches = sections.filter((candidate) => candidate.id === requireId);
        if (matches.length === 1) {
          dependencyKey = `${matches[0].sourceModuleId}:${matches[0].id}`;
        } else if (matches.length === 0) {
          throw new PolicyBuilderError(
            `Fragment "${section.id}" requires missing fragment "${requireId}" within slot "${slotName}"`,
            { filePath: section.filePath },
          );
        } else {
          throw new PolicyBuilderError(
            `Fragment "${section.id}" has ambiguous require "${requireId}" within slot "${slotName}"`,
            { filePath: section.filePath },
          );
        }
      }

      if (dependencyKey === sectionKey) {
        continue;
      }

      dependencies.get(sectionKey)?.add(dependencyKey);
      dependents.get(dependencyKey)?.add(sectionKey);
    }
  }

  for (const [key, deps] of dependencies.entries()) {
    indegree.set(key, deps.size);
  }

  const available = [...sections]
    .filter((section) => indegree.get(`${section.sourceModuleId}:${section.id}`) === 0)
    .sort(compareSections);

  const sorted: ResolvedSection[] = [];

  while (available.length > 0) {
    const next = available.shift();
    if (!next) {
      break;
    }

    const nextKey = `${next.sourceModuleId}:${next.id}`;
    sorted.push(next);

    for (const dependentKey of dependents.get(nextKey) ?? []) {
      const current = indegree.get(dependentKey);
      if (current === undefined) {
        continue;
      }

      const updated = current - 1;
      indegree.set(dependentKey, updated);
      if (updated === 0) {
        const dependent = byKey.get(dependentKey);
        if (dependent) {
          available.push(dependent);
          available.sort(compareSections);
        }
      }
    }
  }

  if (config.validation.failOnRequiresCycle && sorted.length !== sections.length) {
    throw new PolicyBuilderError(`Detected a requires cycle while sorting slot "${slotName}"`);
  }

  return sorted;
}

function stripSurroundingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function formatFrontmatterValue(targetKind: string, key: string, value: unknown): string {
  const asString = String(value);

  if (targetKind === "copilot-scoped" && key === "applyTo") {
    return stripSurroundingQuotes(asString);
  }

  return asString;
}

function createFrontmatterLines(
  frontmatter: Record<string, unknown> | undefined,
  targetKind: string,
): string[] {
  if (!frontmatter) {
    return [];
  }

  const priorityByKind: Record<string, string[]> = {
    "cursor-rule": ["description", "globs", "alwaysApply"],
    "copilot-scoped": ["applyTo", "description"],
  };
  const priority = priorityByKind[targetKind] ?? ["description", "globs", "alwaysApply", "applyTo"];
  const orderedKeys = [
    ...priority.filter((key) => key in frontmatter),
    ...Object.keys(frontmatter)
      .filter((key) => !priority.includes(key))
      .sort(),
  ];

  return orderedKeys.map((key) => `${key}: ${formatFrontmatterValue(targetKind, key, frontmatter[key])}`);
}

function getSlotOrder(config: LoadedPoliciesConfig, targetId: string): string[] {
  return Object.entries(config.slots)
    .filter(([, slotConfig]) => slotConfig.supportedBy.includes(targetId))
    .map(([slotName]) => slotName);
}

function resolveSectionsForOutput(
  config: LoadedPoliciesConfig,
  modules: Map<string, ModuleWithFragments>,
  ownerModule: ModuleWithFragments,
  output: OutputConfig,
): Record<string, ResolvedSection[]> {
  const slotOrder = getSlotOrder(config, output.target);
  const resolvedSections: Record<string, ResolvedSection[]> = Object.fromEntries(slotOrder.map((slot) => [slot, []]));
  const includeEntries: IncludeConfig[] = output.include ?? [{ module: "self" }];
  const globalModuleIds = config.compose.alwaysInclude.filter((moduleId) => moduleId !== ownerModule.id);

  const visitModule = (
    sourceModule: ModuleWithFragments,
    include: IncludeConfig,
    injectionGroup: number,
  ): void => {
    for (const fragment of sourceModule.fragments) {
      if (!fragment.frontmatter.enabled || !matchesTarget(fragment, output.target)) {
        continue;
      }

      if (include.slot && fragment.frontmatter.slot !== include.slot) {
        continue;
      }

      const assignedSlot = include.as ?? fragment.frontmatter.slot;
      const slotConfig = config.slots[assignedSlot];
      if (!slotConfig) {
        throw new PolicyBuilderError(`Output assigns fragment "${fragment.frontmatter.id}" to unknown slot "${assignedSlot}"`, {
          filePath: fragment.filePath,
        });
      }

      if (!slotConfig.supportedBy.includes(output.target)) {
        throw new PolicyBuilderError(
          `Slot "${assignedSlot}" is not supported by target "${output.target}" for fragment "${fragment.frontmatter.id}"`,
          { filePath: fragment.filePath },
        );
      }

      resolvedSections[assignedSlot].push({
        id: fragment.frontmatter.id,
        title: fragment.frontmatter.title,
        body: fragment.body,
        slot: assignedSlot,
        sourceSlot: fragment.frontmatter.slot,
        sourceModuleId: sourceModule.id,
        filePath: fragment.filePath,
        order: fragment.frontmatter.order,
        requires: fragment.frontmatter.requires,
        injectionGroup,
        showHeading: fragment.frontmatter.render?.[output.target]?.heading !== false,
      });
    }
  };

  for (const globalModuleId of globalModuleIds) {
    const globalModule = modules.get(globalModuleId);
    if (!globalModule) {
      throw new PolicyBuilderError(`Global include module "${globalModuleId}" was not found`, {
        filePath: config.configPath,
      });
    }

    visitModule(globalModule, { module: globalModuleId }, 0);
  }

  for (const include of includeEntries) {
    const sourceModuleId = include.module === "self" ? ownerModule.id : include.module;
    const sourceModule = modules.get(sourceModuleId);
    if (!sourceModule) {
      throw new PolicyBuilderError(`Output include references unknown module "${sourceModuleId}"`, {
        filePath: ownerModule.modulePath,
      });
    }

    visitModule(sourceModule, include, 1);
  }

  for (const slotName of Object.keys(resolvedSections)) {
    resolvedSections[slotName] = sortSectionsForSlot(config, slotName, resolvedSections[slotName]);
  }

  return resolvedSections;
}

export async function renderOutputs(
  config: LoadedPoliciesConfig,
  modules: Map<string, ModuleWithFragments>,
  options: { moduleFilter?: string; verbose?: boolean } = {},
): Promise<RenderedOutput[]> {
  const eta = new Eta({ useWith: false, autoTrim: false });
  const bannerText = buildBannerText(config);
  const rendered: RenderedOutput[] = [];

  for (const ownerModule of modules.values()) {
    if (options.moduleFilter && ownerModule.id !== options.moduleFilter) {
      continue;
    }

    for (const output of ownerModule.outputs) {
      const targetConfig = config.targets[output.target];
      const templatePath = resolveBuiltinTemplate(targetConfig.kind);
      const template = await readFile(templatePath, "utf8");
      const slots = resolveSectionsForOutput(config, modules, ownerModule, output);
      const content = eta.renderString(template, {
        banner: formatBanner(targetConfig.bannerStyle, bannerText),
        frontmatterBlock: createFrontmatterLines(output.frontmatter, targetConfig.kind).join("\n"),
        emitTitle: output.emitTitle ?? true,
        module: {
          id: ownerModule.id,
          title: output.title ?? ownerModule.title,
        },
        renderedBody: getSlotOrder(config, output.target)
          .map((slotName) => renderSlotSections(slots[slotName] ?? []))
          .filter(Boolean)
          .join("\n\n"),
      });

      if (content === undefined) {
        throw new PolicyBuilderError(`Template "${templatePath}" returned no content`, {
          filePath: templatePath,
        });
      }

      const normalizedContent = content.trimEnd() + "\n";
      rendered.push({
        moduleId: ownerModule.id,
        outputPath: output.out,
        absoluteOutputPath: resolve(config.repoRoot, output.out),
        target: output.target,
        content: normalizedContent,
      });
    }
  }

  return rendered;
}
