# Changelog

## Unreleased

- Spun out of the parent monorepo into a standalone repository.
- Filled in publishing metadata (`author`, `repository`, `homepage`, `bugs`, `publishConfig`).
- Added a tag-driven npm publish workflow at `.github/workflows/release.yml`.

## 0.1.0

- Moved canonical Eta templates into `templates/` and resolved them by target `kind`.
- Replaced repo-level fixture checks with in-package Vitest snapshot coverage.
- Simplified the public CLI to `build` and `check`.
- Added standalone package metadata, MIT licensing, compiled JS output, and CI scaffolding.
