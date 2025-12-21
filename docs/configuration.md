# Configuration

Codicense stores project context in `.codicense/config.json`.

## Format

```json
{
  "projectLicense": "MIT",
  "intent": "open-source",
  "distributionModel": "cli",
  "linkingModel": "static"
}
```

## Fields

- **projectLicense**: Your project's license (e.g., MIT, Apache-2.0, GPL-3.0)
- **intent**: Project type - `open-source`, `proprietary`, or `undecided`
- **distributionModel**: How you distribute - `saas`, `cli`, `library`, or `internal-only`
- **linkingModel**: How dependencies link - `static`, `dynamic`, or `runtime`

## Creating Configuration

```bash
codicense init          # Interactive mode
codicense init --auto   # Auto-detect
```

The auto-detect will inspect your `LICENSE` file and infer sensible defaults.

