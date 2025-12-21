# Getting Started

## Installation

```bash
npm install -g codicense
```

## Basic Workflow

### 1. Initialize (Optional)

```bash
codicense init          # Interactive setup
codicense init --auto   # Auto-detect
```

Creates `.codicense/config.json` with your project context.

### 2. Scan

```bash
codicense scan
```

Analyzes dependencies and displays conflicts with severity.

### 3. Understand

```bash
codicense explain <package-name>
```

Shows the conflict, why it matters, obligations, and fix options.

### 4. Fix

```bash
codicense fix <package-name> --with <alternative@version>
```

Applies the replacement and updates `package.json`.

## Output Formats

```bash
codicense scan --format markdown > report.md
codicense scan --format table
codicense scan --format sbom > sbom.json
codicense scan --json
```

## CI/CD Integration

```bash
# Fail on critical and high severity
codicense scan --json | jq '.summary'
```

Or integrate with GitHub Actions for automatic scanning.

## Viewing History

```bash
codicense trend          # Show trends
codicense trend --history   # Full scan history
```

