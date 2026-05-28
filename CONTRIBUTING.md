# Contributing

## Local development

```bash
pnpm install
pnpm test
pnpm build
pnpm check
pnpm compile
```

## Expectations

- Edit policy content under `.agents/policies/` when updating the package's dogfood setup.
- Edit renderer code under `src/` and built-in templates under `templates/`.
- Keep `pnpm test`, `pnpm build`, `pnpm check`, and `pnpm compile` green before opening a PR.
