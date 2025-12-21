# Examples

Ready-to-run projects demonstrating Codicense scanning across different scenarios.

## Projects

### small-cli/

A minimal Node.js CLI with a few dependencies. Good starting point for first scan.

### medium-web-app/

A typical Express.js web application with ~30-50 dependencies. Demonstrates conflict detection and fix workflows.

### monorepo-workspace/

A pnpm/yarn workspace with multiple packages. Shows how Codicense handles monorepos.

### license-conflict-demo/

A demo project with intentional GPL conflicts in a proprietary context. Shows conflict detection, severity analysis, and fix options.

## Running Examples

Navigate to any example directory:

```bash
cd small-cli
codicense init --auto
codicense scan
codicense explain <package-name>
codicense fix <package-name> --with <alternative@version>
```

## Output Formats

```bash
codicense scan --json
codicense scan --format markdown > report.md
codicense scan --format table
codicense scan --format sbom > sbom.json
```

## Creating Your Own

Each example includes:
- `package.json` with dependencies
- Lockfile (`package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`)
- `.codicense/config.json` (project intent)
- `README.md` (setup instructions)
