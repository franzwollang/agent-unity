import { describe, expect, it } from "vitest";

import { PolicyBuilderError } from "../src/errors.js";
import { loadPoliciesConfig } from "../src/config.js";
import { createFixtureRepo, writePoliciesConfig } from "./helpers.js";

describe("loadPoliciesConfig", () => {
  it("rejects slots that reference unknown targets", async () => {
    const { repoRoot, cleanup } = await createFixtureRepo();

    try {
      const config = await loadPoliciesConfig({ repoRoot });
      await writePoliciesConfig(repoRoot, {
        ...config,
        slots: {
          ...config.slots,
          broken: {
            supportedBy: ["does-not-exist"],
          },
        },
      });

      await expect(loadPoliciesConfig({ repoRoot })).rejects.toBeInstanceOf(PolicyBuilderError);
    } finally {
      await cleanup();
    }
  });

  it("rejects targets with unsupported kinds", async () => {
    const { repoRoot, cleanup } = await createFixtureRepo();

    try {
      const config = await loadPoliciesConfig({ repoRoot });
      await writePoliciesConfig(repoRoot, {
        ...config,
        targets: {
          ...config.targets,
          broken: {
            kind: "unknown-kind",
            fileExtension: ".md",
            bannerStyle: "html-comment-top",
          },
        },
      });

      await expect(loadPoliciesConfig({ repoRoot })).rejects.toBeInstanceOf(PolicyBuilderError);
    } finally {
      await cleanup();
    }
  });
});
