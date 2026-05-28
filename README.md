# agent-unity

Reusable agent policy and skill unification tooling.

This package contains the builder, built-in Eta templates, a small public
library surface, and Vitest snapshot tests that turn policy content under
`.agents/policies/` into harness-specific outputs such as `.cursor/rules/`,
`.claude/rules/`, `.github/instructions/`, and umbrella docs at the repository
root.

## CLI

```bash
agent-unity build
agent-unity check
agent-unity check --strict
```

By default, the CLI uses the current working directory as the repo root. Point
at another repository with `--repo-root`:

```bash
agent-unity build --repo-root ../some-repo
```

Templates are built into `templates/` and selected by target `kind` in
`policies.config.json`. Consumer repos own policy fragments and config only.

Published packages run from compiled JS in `dist/`; local development falls
back to `build.ts` through `tsx`.

## Library

The package also exposes its core builder modules for programmatic use:

```ts
import { loadPoliciesConfig, loadPolicyModules, renderOutputs } from "agent-unity";
```

## Repo layout

This is the standalone home of `agent-unity`. It includes:

- `LICENSE`
- `.github/workflows/ci.yml` and `.github/workflows/release.yml`
- `.vscode/settings.json`
- `open_issues.md`
- package-local `.agents/` dogfooding

## Development

```bash
pnpm install
pnpm test      # Vitest renderer snapshots
pnpm build     # render package-local dogfood outputs
pnpm check     # drift and orphan warnings
pnpm compile   # emit dist/ for packaging
```

Backlog: [`open_issues.md`](open_issues.md). Contribution notes:
[`CONTRIBUTING.md`](CONTRIBUTING.md). Release history:
[`CHANGELOG.md`](CHANGELOG.md).

## Package-local dogfooding

`.agents/` holds this package's own policy source, and the generated outputs
(`.cursor/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`,
`.github/copilot-instructions.md`) are committed to demonstrate the renderer.

## Releasing

Releases are published to npm by `.github/workflows/release.yml`. The workflow
runs on pushes of `v*` tags and can also be dispatched manually. It requires an
`NPM_TOKEN` repository secret with publish rights for the `agent-unity` package.

- `push` on `v*` tags is the normal release path. After updating the version in
  `package.json`, create and push a matching tag such as `v0.1.0`; GitHub
  Actions will run validation and then publish to npm.
- `workflow_dispatch` is the manual path from the Actions tab. Use it to verify
  the release job on demand, including `dry_run: true` when you want to confirm
  the packaging and npm auth setup without actually publishing.

```bash
pnpm version patch   # or minor / major
git push --follow-tags
```
