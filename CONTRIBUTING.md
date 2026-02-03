# Contributing to ControlPlane

Thank you for your interest in contributing!

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
