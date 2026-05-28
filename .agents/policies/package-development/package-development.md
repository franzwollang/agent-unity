---
id: package-development
title: Package Development
slot: body
order: 10
kind: policy
summary: Guidance for maintaining the reusable agent-unity package.
---
- Keep the CLI generic and reusable across repositories.
- Prefer explicit CLI flags such as `--repo-root` over hard-coded repository assumptions.
- Repository-specific policy content and references belong with the target repo; built-in templates and renderer tests live in this package.
- Keep the published package runnable from compiled `dist/` output while preserving a simple local-development path.
- Keep package-local dogfooding assets under `.agents/` so the package can serve as its own example repo shape when extracted.
- When changing render behavior or path resolution, verify both the starter-pack root invocation and the package-local invocation.
