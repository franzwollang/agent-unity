import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import pc from "picocolors";

import { PolicyBuilderError } from "./errors.js";
import { findOrphanedOutputs } from "./orphans.js";
import type { RenderedOutput } from "./render.js";

function createDiffSnippet(expected: string, actual: string): string {
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const maxLength = Math.max(expectedLines.length, actualLines.length);

  for (let index = 0; index < maxLength; index += 1) {
    if (expectedLines[index] !== actualLines[index]) {
      const expectedLine = expectedLines[index] ?? "<missing>";
      const actualLine = actualLines[index] ?? "<missing>";
      return `line ${index + 1}\n- ${actualLine}\n+ ${expectedLine}`;
    }
  }

  return "contents differ";
}

export async function writeOutputs(
  renderedOutputs: RenderedOutput[],
  options: { repoRoot: string; verbose?: boolean; removeOrphans?: boolean },
): Promise<void> {
  const { repoRoot, verbose = false, removeOrphans = true } = options;

  for (const output of renderedOutputs) {
    await mkdir(dirname(output.absoluteOutputPath), { recursive: true });
    await writeFile(output.absoluteOutputPath, output.content, "utf8");
    if (verbose) {
      console.log(pc.green(`wrote ${output.outputPath}`));
    }
  }

  if (removeOrphans) {
    const orphans = await findOrphanedOutputs(renderedOutputs, repoRoot);
    for (const orphanPath of orphans) {
      await unlink(resolve(repoRoot, orphanPath));
      if (verbose) {
        console.log(pc.yellow(`removed orphan ${orphanPath}`));
      }
    }
  }
}

export async function checkOutputs(
  renderedOutputs: RenderedOutput[],
  options: { repoRoot: string; verbose?: boolean; strict?: boolean },
): Promise<void> {
  const { repoRoot, verbose = false, strict = false } = options;
  const mismatches: string[] = [];

  for (const output of renderedOutputs) {
    let onDisk: string;
    try {
      onDisk = await readFile(output.absoluteOutputPath, "utf8");
    } catch (error) {
      mismatches.push(`${output.outputPath}: file does not exist`);
      continue;
    }

    if (onDisk !== output.content) {
      mismatches.push(`${output.outputPath}: ${createDiffSnippet(output.content, onDisk)}`);
      continue;
    }

    if (verbose) {
      console.log(pc.green(`checked ${output.outputPath}`));
    }
  }

  if (mismatches.length > 0) {
    throw new PolicyBuilderError(`Generated outputs are stale:\n${mismatches.join("\n")}`);
  }

  const orphans = await findOrphanedOutputs(renderedOutputs, repoRoot);
  if (orphans.length > 0) {
    const message = `Orphaned generated file(s) not produced by the builder:\n${orphans.map((path) => `- ${path}`).join("\n")}`;
    if (strict) {
      throw new PolicyBuilderError(message);
    }

    console.warn(pc.yellow(message));
    console.warn(pc.yellow("Run `pnpm policies:build` to remove orphans, or pass --strict to fail the check."));
  }
}
