import { describe, expect, it } from "vitest";

import { loadPoliciesConfig } from "../src/config.js";
import { loadAllModuleFragments } from "../src/fragment.js";
import { loadPolicyModules } from "../src/module.js";
import { renderOutputs } from "../src/render.js";
import { createFixtureRepo } from "./helpers.js";

async function renderFixtureOutputs(repoRoot: string) {
  const config = await loadPoliciesConfig({ repoRoot });
  const modules = await loadPolicyModules(config);
  const modulesWithFragments = await loadAllModuleFragments(config, modules);
  return renderOutputs(config, modulesWithFragments);
}

describe("renderOutputs", () => {
  it("renders every target kind with stable snapshots", async () => {
    const { repoRoot, cleanup } = await createFixtureRepo();

    try {
      const rendered = await renderFixtureOutputs(repoRoot);
      const byPath = Object.fromEntries(rendered.map((output) => [output.outputPath, output.content]));

      await expect(byPath[".cursor/rules/sample.mdc"]).toMatchFileSnapshot(
        "./__snapshots__/cursor-rule.sample.mdc",
      );
      await expect(byPath[".claude/rules/sample.md"]).toMatchFileSnapshot(
        "./__snapshots__/claude-rule.sample.md",
      );
      await expect(byPath["AGENTS.md"]).toMatchFileSnapshot("./__snapshots__/agents-doc.AGENTS.md");
      await expect(byPath["CLAUDE.md"]).toMatchFileSnapshot("./__snapshots__/claude-doc.CLAUDE.md");
      await expect(byPath["GEMINI.md"]).toMatchFileSnapshot("./__snapshots__/gemini-doc.GEMINI.md");
      await expect(byPath[".github/copilot-instructions.md"]).toMatchFileSnapshot(
        "./__snapshots__/github-copilot.copilot-instructions.md",
      );
      await expect(byPath[".github/instructions/sample.instructions.md"]).toMatchFileSnapshot(
        "./__snapshots__/copilot-scoped.sample.instructions.md",
      );
      await expect(byPath["docs/sample.md"]).toMatchFileSnapshot("./__snapshots__/plain-markdown.sample.md");
    } finally {
      await cleanup();
    }
  });

  it("orders cursor-rule frontmatter with description before alwaysApply", async () => {
    const { repoRoot, cleanup } = await createFixtureRepo();

    try {
      const rendered = await renderFixtureOutputs(repoRoot);
      const cursorRule = rendered.find((output) => output.outputPath === ".cursor/rules/sample.mdc");

      expect(cursorRule?.content).toContain("description: Sample cursor rule");
      expect(cursorRule?.content).toContain("alwaysApply: true");
      expect(cursorRule?.content.indexOf("description:")).toBeLessThan(
        cursorRule?.content.indexOf("alwaysApply:") ?? -1,
      );
    } finally {
      await cleanup();
    }
  });

  it("quotes copilot-scoped applyTo without extra wrapping", async () => {
    const { repoRoot, cleanup } = await createFixtureRepo();

    try {
      const rendered = await renderFixtureOutputs(repoRoot);
      const scoped = rendered.find(
        (output) => output.outputPath === ".github/instructions/sample.instructions.md",
      );

      expect(scoped?.content).toContain("applyTo: **/*.ts");
      expect(scoped?.content).not.toContain('applyTo: "**/*.ts"');
    } finally {
      await cleanup();
    }
  });
});
