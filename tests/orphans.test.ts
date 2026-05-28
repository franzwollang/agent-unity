import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { findOrphanedOutputs } from "../src/orphans.js";
import type { RenderedOutput } from "../src/render.js";
import { createFixtureRepo } from "./helpers.js";

describe("findOrphanedOutputs", () => {
  it("detects generated files not produced by the current render set", async () => {
    const { repoRoot, cleanup } = await createFixtureRepo();

    try {
      const orphanPath = ".cursor/rules/orphan.mdc";
      await mkdir(join(repoRoot, ".cursor/rules"), { recursive: true });
      await writeFile(join(repoRoot, orphanPath), "orphan\n", "utf8");

      const rendered: RenderedOutput[] = [
        {
          moduleId: "render-samples",
          outputPath: ".cursor/rules/sample.mdc",
          absoluteOutputPath: join(repoRoot, ".cursor/rules/sample.mdc"),
          target: "cursor-rule",
          content: "expected\n",
        },
      ];

      const orphans = await findOrphanedOutputs(rendered, repoRoot);
      expect(orphans).toContain(orphanPath);
      expect(orphans).not.toContain(".cursor/rules/sample.mdc");
    } finally {
      await cleanup();
    }
  });
});
