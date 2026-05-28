import { cp, mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const fixturesDir = resolve(packageDir, "tests/fixtures");

export async function createFixtureRepo(): Promise<{ repoRoot: string; cleanup: () => Promise<void> }> {
  const repoRoot = await mkdtemp(join(tmpdir(), "agent-unity-test-"));
  const policiesDir = join(repoRoot, ".agents/policies");

  await mkdir(policiesDir, { recursive: true });
  await cp(fixturesDir, policiesDir, { recursive: true });

  return {
    repoRoot,
    cleanup: async () => {
      const { rm } = await import("node:fs/promises");
      await rm(repoRoot, { recursive: true, force: true });
    },
  };
}

export async function writePoliciesConfig(
  repoRoot: string,
  config: unknown,
): Promise<void> {
  const configPath = join(repoRoot, ".agents/policies/policies.config.json");
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
