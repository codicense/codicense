# Codicense

[![npm version](https://img.shields.io/npm/v/codicense.svg)](https://www.npmjs.com/package/codicense)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![CI Status](https://github.com/codicense/codicense/actions/workflows/ci.yml/badge.svg)](https://github.com/codicense/codicense/actions/workflows/ci.yml)

Deterministic, offline license intelligence for JavaScript, Python, and Go. Runs entirely locally. Explains why license risk exists. Ranks fixes by impact. Stays predictable.

## What Codicense Does

Codicense answers the core question: **Which single change removes the most license risk?**

It scans your dependency graph, detects license conflicts, traces how conflicts propagate through transitive dependencies, and ranks fixes by causality: the package that, if removed or replaced, eliminates the most risk.

- **Offline**: No cloud, no API calls, no tracking
- **Deterministic**: Same input, same output, every time
- **Transparent**: Shows entry points, propagation paths, and impact
- **Decision-driven**: Not reporting. Fix ranking by outcome, not just severity.

## Capabilities

- **Multi-ecosystem scanning**: npm/Yarn/pnpm, Pip/Poetry/Pipenv, Go modules
- **Conflict path visualization**: Full dependency chains with entry-point markers
- **Causal impact analysis**: See which packages contribute most risk
- **Diff-aware scans**: Compare scans to detect what changed and why
- **License confidence**: Understand why each license was assigned and where it came from
- **Ranked fixes**: Upgrades first, then replacements ranked by impact
- **Risk hotspots**: Find the dependencies and contexts that create most risk
- **Plain-English obligations**: Understand what each license requires
- **Local history and trends**: Track risk over time without cloud storage
- **Multiple export formats**: Text, JSON, markdown, table, GitHub summary, CycloneDX SBOM

## Install

```bash
npm install -g codicense
```

## Quick Start

```bash
codicense init          # Detect project intent and create config
codicense scan          # Analyze dependencies
codicense explain foo   # Show path, severity, obligations, fixes
codicense fix foo --with alternative@1.0.0  # Apply a fix
```

## Commands

- `codicense init [--auto] [--strict]` - Set project intent; `--strict` disables heuristics
- `codicense scan [--json|--format markdown|table|sbom|summary] [--visualize] [--diff] [--hotspots] [--confidence] [--hints]` - Scan dependencies
- `codicense explain <package|conflict-id|license>` - Show conflict details, path, obligations
- `codicense fix <package> --with <pkg@ver>` - Generate and apply fixes
- `codicense obligations <license>` - Explain license obligations
- `codicense badge` - Generate status badges
- `codicense trend` - View local risk history

## Output Formats

- **Text** (default): Human-readable CLI output
- **JSON**: `--json` for automation and tooling
- **Markdown**: `--format markdown` for reports
- **Table**: `--format table` for terminals
- **SBOM**: `--format sbom` exports CycloneDX 1.4 for supply chain management
- **GitHub Summary**: `--format summary` for GitHub Actions

## How Fixes Work

1. **Upgrade-first**: If a better-licensed version exists, it's recommended first
2. **Ranked alternatives**: Replacements are ranked by causal impact (how much risk removal)
3. **Explicit control**: You decide the replacement; the tool shows impact
4. **Effort and rationale**: Each fix explains the work required and why it helps

## Determinism and Transparency

- **Offline by default**: No telemetry, no cloud, no registration
- **Deterministic output**: Same input always produces the same output
- **Explainable scoring**: See why each license was detected and how it was classified
- **Causal ranking**: Fixes ranked by measurable impact on overall risk

## Supported Languages and Lockfiles

- **JavaScript/TypeScript**: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- **Python**: `requirements.txt`, `Pipfile.lock`, `poetry.lock`
- **Go**: `go.mod`, `go.sum`

## Configuration

Codicense stores project context in `.codicense/config.json`:

```json
{
  "projectLicense": "MIT",
  "intent": "open-source",
  "distributionModel": "cli",
  "linkingModel": "static"
}
```

Create or update with `codicense init`.

## Examples

See `examples/` for ready-to-run projects demonstrating scanning, conflict resolution, and multi-package workflows.

## License

Apache-2.0. See [LICENSE](LICENSE).

