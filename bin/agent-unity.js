#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const binDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(binDir, "..");
const compiledEntrypointPath = resolve(packageDir, "dist", "build.js");
const sourceEntrypointPath = resolve(packageDir, "build.ts");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  process.exit(result.status ?? 1);
}

if (existsSync(sourceEntrypointPath)) {
  const tsxCliCandidates = [
    resolve(packageDir, "node_modules", "tsx", "dist", "cli.mjs"),
    resolve(packageDir, "..", "node_modules", "tsx", "dist", "cli.mjs"),
  ];
  const tsxCliPath = tsxCliCandidates.find((candidatePath) => existsSync(candidatePath));

  if (tsxCliPath) {
    run(process.execPath, [tsxCliPath, sourceEntrypointPath, ...process.argv.slice(2)]);
  }
}

if (existsSync(compiledEntrypointPath)) {
  run(process.execPath, [compiledEntrypointPath, ...process.argv.slice(2)]);
}

throw new Error(
  "agent-unity could not find a runnable CLI entrypoint. Expected either build.ts for development or dist/build.js for a packaged install.",
);
