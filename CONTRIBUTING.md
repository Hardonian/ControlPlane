# Contributing to ControlPlane

Thanks for contributing! This repository provides the contracts and tooling that power ControlPlane-compatible services and runners. All contributions are reviewed against compatibility and governance standards.

## Who Should Contribute

- Contract authors evolving schemas and error envelopes.
- Tooling contributors improving validation, compatibility, or SDK generation.
- Documentation contributors clarifying ecosystem expectations.

## Where to Start

- **Docs fixes:** Start in `docs/` or `README.md` and open a small PR.
- **Runner work:** Use the quickstart to scaffold a runner, then run contract checks locally.
- **Connector work:** Follow the marketplace guide to align on connector types and metadata.
- **Contracts:** Read the contract versioning guide before proposing schema changes.

Helpful entry points:

- [Runner quickstart](./docs/CREATE-RUNNER-QUICKSTART.md)
- [Runner guide](./docs/RUNNER-GUIDE.md)
- [Marketplace submission guide](./docs/MARKETPLACE-SUBMISSION-GUIDE.md)
- [Contract upgrade guide](./docs/CONTRACT-UPGRADE.md)

## Contribution Lanes

We keep changes safe by clearly separating contribution areas. Pick a lane and follow its guardrails:

| Lane | Typical changes | Start here | Local checks |
| --- | --- | --- | --- |
| docs | Guides, READMEs, release notes | `docs/` | `pnpm run format:check` |
| runner | New or updated runners | Runner quickstart + guide | `pnpm run runner:ci:check` |
| connector | New connectors or templates | Marketplace guide | `pnpm run build:contracts && pnpm run contract:validate` |
| contracts | Schema, types, versioning | Contract upgrade guide | `pnpm run build:contracts && pnpm run contract:lint && pnpm run contract:validate` |

## Development Setup

```bash
pnpm install
pnpm run build:contracts
pnpm run build:test-kit
```

## Common Tasks

```bash
# Run the full verification suite (lint, typecheck, tests, build, docs)
pnpm run verify

# Validate contracts only
pnpm run contract:validate

# Regenerate the compatibility matrix
pnpm run compat:generate
```

## Development Workflow

1. Create a branch from `main`.
2. Keep changes small and focused.
3. Run `pnpm run verify` before opening a PR.
4. Update documentation when contracts change.

## How CI Protects You

CI is intentionally strict to prevent accidental contract breakage and maintain ecosystem compatibility:

- **Contract linting:** validates contracts compile and pass lint checks.
- **Contract tests & sync:** validates schemas and keeps generated artifacts in sync.
- **Compatibility matrix:** ensures version compatibility across the ecosystem.
- **Semantic checks:** enforces conventional commits for predictable releases.

If you add a runner, the contract checks run before tests or builds, so you get fast feedback without breaking the pipeline. All checks require human review before merge.

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Formatting, no code change
- `refactor:` Code restructuring
- `test:` Adding or updating tests
- `chore:` Build process, dependencies

Example:

```bash
git commit -m "feat(contracts): add runner heartbeat schema"
```

## Pull Request Process

1. Open a PR with a clear description and scope.
2. Ensure `pnpm run verify` passes.
3. Include contract compatibility notes when required.

## Code Standards

- Keep schemas backwards compatible within a major version.
- Avoid placeholder docs or TODOs.
- Keep validation tooling deterministic and fast.
- Update the compatibility matrix when versions change.

## Community & Support

- Use GitHub Discussions for questions and design proposals.
- Use Issues for bugs and feature requests.

See [SUPPORT.md](./SUPPORT.md) for guidance.

### Discussion Categories

- **Q&A**: troubleshooting and usage questions.
- **Ideas**: proposals for new contracts or tooling.
- **Show & Tell**: sharing integrations or adoption stories.
- **Design / Architecture**: contract evolution and ecosystem design discussions.
