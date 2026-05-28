# Open Issues — agent-unity

Living tracker for the `agent-unity` policy builder package. Update as items land or are reprioritized.

## Open

### Builder ergonomics

- [ ] Discover-and-emit pattern: one source module emits per-scope files via a glob template (e.g. one Copilot rule per language).
- [ ] `defaults.outputs` shorthand so a module can opt into "emit to all umbrella targets" or "emit to all modular targets" without listing each.
- [ ] Strongly typed per-target frontmatter (Zod discriminated union on target `kind`) replacing `Record<string, unknown>`.
- [ ] Shared Eta partial for the umbrella templates (`agents-doc`, `claude-doc`, `gemini-doc`) to eliminate copy-paste.

### Tooling and DX

- [ ] `--strict` orphan-fail mode in `check` for CI (CLI flag exists; document and wire root `policies:check --strict` when needed).
## Done (recent)

- Repo spun out as standalone; publishing metadata and npm publish workflow added.
- Built-in Eta templates in `templates/`, resolved by target `kind` (no repo-local templates).
- Vitest snapshot tests in `tests/` replace the `fixture-check` CLI and repo-level fixtures.
- Public CLI exposes `build` and `check` only; removed `--fixtures-dir`.
- Package-local dogfood under `.agents/` uses the same built-in templates as consumers.
- Added standalone repo scaffolding: MIT `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, and package-local CI.
- Added compiled `dist/` output for publishing while keeping `tsx`-based local development.
