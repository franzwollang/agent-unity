import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import type { RenderedOutput } from "./render.js";

const GENERATED_ROOTS = [
  { dir: ".cursor/rules", extensions: [".mdc"] },
  { dir: ".claude/rules", extensions: [".md"] },
  { dir: ".github/instructions", extensions: [".instructions.md"] },
] as const;

const UMBRELLA_FILES = ["AGENTS.md", "CLAUDE.md", "GEMINI.md", ".github/copilot-instructions.md"] as const;

async function listGeneratedFilesUnder(
  repoRoot: string,
  absoluteDir: string,
  extensions: readonly string[],
): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(absoluteDir);
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const absolutePath = join(absoluteDir, entry);
    const entryStat = await stat(absolutePath);
    if (!entryStat.isFile()) {
      continue;
    }

    if (extensions.some((extension) => entry.endsWith(extension))) {
      files.push(relative(repoRoot, absolutePath).replaceAll("\\", "/"));
    }
  }

  return files.sort();
}

export async function findOrphanedOutputs(renderedOutputs: RenderedOutput[], repoRoot: string): Promise<string[]> {
  const expected = new Set(renderedOutputs.map((output) => output.outputPath.replaceAll("\\", "/")));
  const onDisk = new Set<string>();

  for (const root of GENERATED_ROOTS) {
    const files = await listGeneratedFilesUnder(repoRoot, resolve(repoRoot, root.dir), root.extensions);
    for (const file of files) {
      onDisk.add(file);
    }
  }

  for (const umbrellaFile of UMBRELLA_FILES) {
    try {
      const umbrellaStat = await stat(resolve(repoRoot, umbrellaFile));
      if (umbrellaStat.isFile()) {
        onDisk.add(umbrellaFile);
      }
    } catch {
      // Umbrella not present yet.
    }
  }

  return [...onDisk].filter((path) => !expected.has(path)).sort();
}
