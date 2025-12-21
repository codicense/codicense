# Changelog

## 3.0.0

First public release of Codicense.

### Core Features

- **Causal impact analysis**: Ranks dependencies by how much risk their removal eliminates
- **Offline scanning**: No cloud, no telemetry, entirely local
- **Deterministic output**: Same dependencies always produce the same results
- **Multi-ecosystem support**: JavaScript, Python, and Go
- **Transparent conflict paths**: Shows entry points and how risks propagate
- **License confidence scores**: Explains why each license was assigned
- **Ranked fixes**: Upgrade suggestions first, then alternatives by impact
- **Local history**: Track risk trends over time without external storage
- **Multiple output formats**: Text, JSON, Markdown, table, SBOM, GitHub Actions

### Commands

- `init` - Set project intent and create configuration
- `scan` - Analyze dependencies with multiple output options
- `explain` - Show conflict details, obligations, and fix paths
- `fix` - Apply replacements with impact analysis
- `obligations` - Display plain-English license obligations
- `badge` - Generate compliance badges
- `trend` - View local scan history and risk trends

### Install

```bash
npm install -g codicense
```