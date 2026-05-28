import pc from "picocolors";

import { loadPoliciesConfig } from "./src/config.js";
import { PolicyBuilderError } from "./src/errors.js";
import { loadAllModuleFragments } from "./src/fragment.js";
import { loadPolicyModules } from "./src/module.js";
import { renderOutputs } from "./src/render.js";
import { checkOutputs, writeOutputs } from "./src/write.js";

type Command = "build" | "check";

function parseArgs(argv: string[]): {
  command: Command;
  moduleFilter?: string;
  verbose: boolean;
  strict: boolean;
  repoRoot?: string;
} {
  const [commandArg, ...rest] = argv;
  const command = (commandArg ?? "build") as Command;

  if (!["build", "check"].includes(command)) {
    throw new PolicyBuilderError(`Unknown command "${commandArg}". Use build or check.`);
  }

  let moduleFilter: string | undefined;
  let verbose = false;
  let strict = false;
  let repoRoot: string | undefined;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--module") {
      moduleFilter = rest[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--verbose") {
      verbose = true;
      continue;
    }

    if (arg === "--strict") {
      strict = true;
      continue;
    }

    if (arg === "--repo-root") {
      repoRoot = rest[index + 1];
      index += 1;
      continue;
    }

    throw new PolicyBuilderError(`Unknown argument "${arg}"`);
  }

  return { command, moduleFilter, verbose, strict, repoRoot };
}

async function main(): Promise<void> {
  const { command, moduleFilter, verbose, strict, repoRoot } = parseArgs(process.argv.slice(2));
  const config = await loadPoliciesConfig({ repoRoot });
  const modules = await loadPolicyModules(config);
  const modulesWithFragments = await loadAllModuleFragments(config, modules);
  const renderedOutputs = await renderOutputs(config, modulesWithFragments, {
    moduleFilter,
    verbose,
  });

  if (command === "build") {
    await writeOutputs(renderedOutputs, { repoRoot: config.repoRoot, verbose });
    console.log(pc.green(`Rendered ${renderedOutputs.length} output file(s).`));
    return;
  }

  await checkOutputs(renderedOutputs, { repoRoot: config.repoRoot, verbose, strict });
  console.log(pc.green(`Checked ${renderedOutputs.length} output file(s).`));
}

main().catch((error: unknown) => {
  if (error instanceof PolicyBuilderError) {
    console.error(pc.red(error.toDisplayString()));
    process.exitCode = 1;
    return;
  }

  console.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
