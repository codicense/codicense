# Contributing to Codicense

Thank you for your interest in contributing. This document outlines how to report issues, suggest improvements, and submit code.

## Code of Conduct

Be respectful, professional, and inclusive. We are solving license compliance problems together.

## Reporting Issues

1. Check [existing issues](https://github.com/codicense/codicense/issues) first
2. Create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs. actual behavior
   - Environment details (OS, Node.js version, package manager)
   - Relevant lockfile (if applicable)

## Suggesting Improvements

1. Open an issue with the `enhancement` label
2. Describe the improvement and its rationale
3. Explain the use case and expected outcome

## Submitting Code

### Setup

```bash
git clone https://github.com/codicense/codicense.git
cd codicense
npm install
```

### Development

1. Create a feature branch: `git checkout -b feature/description`
2. Make your changes following the code style
3. Write tests for new functionality
4. Update documentation as needed
5. Run the build and tests before committing:
   ```bash
   npm run build
   npm test
   npm run lint
   ```

### Commit Messages

Use conventional commits:
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `test:` test additions or updates
- `refactor:` code restructuring
- `chore:` maintenance tasks

Example: `feat: add support for pnpm workspaces`

### Pull Requests

1. Push your branch: `git push origin feature/description`
2. Open a PR with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots or examples if applicable

## Project Structure

```
codicense/
├── src/
│   ├── cli.ts                   # CLI entry point
│   ├── cli-ili.ts               # Command implementations
│   ├── types.ts                 # TypeScript interfaces
│   ├── license-db.ts            # SPDX license database
│   ├── config/                  # Configuration management
│   ├── engine/                  # Core scanning engines
│   ├── ili/                     # Intent-aware logic
│   ├── parsers/                 # Language-specific parsers
│   ├── fix/                     # Fix generators
│   └── visualizer/              # Output formatters
├── tests/                       # Vitest test suites
├── docs/                        # Documentation
├── examples/                    # Example projects
└── package.json
```

### Building and Testing

```bash
# Build
npm run build

# Watch mode
npm run dev

# Run CLI locally
node dist/cli.js scan

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## Adding Features

### New License Rules

Edit `src/engine/compatibility-matrix.ts`:

```typescript
rules.push({
  projectLicense: 'MIT',
  dependencyLicense: 'NewLicense-1.0',
  linkingModel: 'static',
  distributionModel: 'proprietary',
  compatible: false,
  reason: 'Clear explanation of incompatibility',
  severity: 'CRITICAL',
});
```

Add tests in `tests/compatibility-matrix.test.ts`.

### New Package Manager Support

1. Create a parser in `src/parsers/` (e.g., `new-manager-parser.ts`)
2. Implement the `parse()` method returning `DependencyNode`
3. Update `LockfileParser.parse()` to detect and route to the new parser
4. Add tests

## Code Style

- **TypeScript** for type safety
- **Prettier** for formatting
- **ESLint** for linting
- **Vitest** for testing

Run `npm run format` before committing.

## Testing Guidelines

- Use descriptive test names
- Test normal cases and edge cases
- Aim for good coverage
- Keep tests focused and readable

Example:

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('handles normal input', () => {
    expect(myFunction('input')).toBe('expected');
  });

  it('handles empty input', () => {
    expect(myFunction('')).toBe('');
  });
});
```

## License

Contributions are licensed under Apache-2.0. By contributing, you agree to this license.

## Questions?

Open a [Discussion](https://github.com/codicense/codicense/discussions) or email the maintainers.

