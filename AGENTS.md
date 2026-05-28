<!-- DO NOT EDIT. Generated from .agents/policies/. Edit policy fragments, then run `pnpm build`. Source: .agents/policies/ -->


## Policy Source Of Truth

The source of truth for agent policy content in this repository lives under `.agents/policies/`.

Do not hand-edit generated harness files such as `.cursor/rules/*.mdc`, `.claude/rules/*.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, or `.github/copilot-instructions.md`.

Add or change policy content by editing policy fragments or templates in `.agents/policies/`.

When adding a new harness, register it in `.agents/policies/policies.config.json`. Renderer templates ship with `agent-unity` and are selected by target `kind`.

Run `pnpm build` to refresh outputs and `pnpm check` to confirm nothing is stale.

After changing any policy fragment, target config, or template, rebuild generated outputs before merging.

## Repository Scope

This repository contains the reusable `agent-unity` CLI and library for unifying shared agent policy sources into harness-specific outputs.

Keep this package generic. Avoid starter-pack-specific assumptions in the CLI, config loading, output handling, or documentation.

## Where things live

| Area | Location |
| --- | --- |
| CLI entrypoint | `bin/agent-unity.js` |
| Builder source | `build.ts`, `src/`, `templates/` |
| Compiled publishable output | `dist/` |
| Test suite | `tests/` |
| Package-local agent source of truth | `.agents/policies/` |
| Generated package docs | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md` |

The package should be usable both inside this monorepo and as a standalone npm package.

## Commands

- Build generated outputs for the current repo root: `pnpm build`
- Check generated outputs for drift: `pnpm check`
- Run renderer tests: `pnpm test`
- Compile publishable JS output: `pnpm compile`
