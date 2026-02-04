# Contributing to ControlPlane

Thank you for your interest in contributing!

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

1. Fork and clone the repository
2. Install dependencies: `pnpm install`
3. Build contracts: `pnpm run build:contracts`
4. Run tests: `pnpm run test`

## Development Workflow

```bash
# Start the full stack
pnpm run dev:stack

# In another terminal, run tests
pnpm run test:watch

# Make changes, tests run automatically
```

## How CI Protects You

CI is intentionally strict to prevent accidental contract breakage:

- **Contract linting:** validates contracts compile and pass lint checks.
- **Contract tests & sync:** validates schemas and keeps generated artifacts in sync.
- **Compatibility matrix:** ensures version compatibility across the ecosystem.
- **Semantic checks:** enforces conventional commits for predictable releases.

If you add a runner, the contract checks run before tests or builds, so you get fast feedback without breaking the pipeline.

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
git commit -m "feat(runners): add heartbeat monitoring"
```

## Pull Request Process

1. Create a feature branch
2. Make your changes
3. Run the full CI locally: `pnpm run ci`
4. Push and open PR
5. Ensure CI passes
6. Request review

## Code Standards

- **No TODOs**: Complete all work before submitting
- **No placeholders**: All code must be functional
- **Small changes**: Prefer focused, atomic PRs
- **Test coverage**: Every change needs tests
- **Documentation**: Update docs for API changes

## Adding a New Runner

See [docs/RUNNER-GUIDE.md](./docs/RUNNER-GUIDE.md).

## Questions?

Open an issue or discussion on GitHub.
