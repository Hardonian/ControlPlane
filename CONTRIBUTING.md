# Contributing to ControlPlane

Thanks for contributing! This repository provides the contracts and tooling that power ControlPlane-compatible services and runners.

## Who Should Contribute

- Contract authors evolving schemas and error envelopes.
- Tooling contributors improving validation, compatibility, or SDK generation.
- Documentation contributors clarifying ecosystem expectations.

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
