<!-- DO NOT EDIT. Generated from .agents/policies/. Edit policy fragments, then run `pnpm build`. Source: .agents/policies/ -->


# Global Policy


## Policy Source Of Truth

The source of truth for agent policy content in this repository lives under `.agents/policies/`.

Do not hand-edit generated harness files such as `.cursor/rules/*.mdc`, `.claude/rules/*.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, or `.github/copilot-instructions.md`.

Add or change policy content by editing policy fragments or templates in `.agents/policies/`.

When adding a new harness, register it in `.agents/policies/policies.config.json`. Renderer templates ship with `agent-unity` and are selected by target `kind`.

Run `pnpm build` to refresh outputs and `pnpm check` to confirm nothing is stale.

After changing any policy fragment, target config, or template, rebuild generated outputs before merging.
