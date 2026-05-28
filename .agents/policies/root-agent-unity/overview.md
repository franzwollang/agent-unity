---
id: overview
title: Repository Scope
slot: body
order: 10
kind: policy
summary: High-level scope for the agent-unity package repository.
---
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
