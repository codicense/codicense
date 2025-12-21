# Command Reference

## codicense init

Create or update project configuration.

```bash
codicense init                # Interactive mode
codicense init --auto         # Auto-detect without prompts
codicense init --strict       # Disable heuristics
```

Creates `.codicense/config.json` with project context (license, intent, distribution model, linking model).

## codicense scan

Analyze dependencies for license conflicts.

```bash
codicense scan                        # Standard output
codicense scan --json                 # JSON for tooling
codicense scan --format markdown      # Markdown report
codicense scan --format table         # Table view
codicense scan --format sbom          # CycloneDX SBOM
codicense scan --format summary       # GitHub Actions summary
codicense scan --visualize            # Show dependency trees
codicense scan --diff                 # Compare with previous scan
codicense scan --hotspots             # Show risk contributors
codicense scan --confidence           # Show license confidence
```

**Exit codes:**
- `0` - No blocking conflicts
- `1` - Blocking conflicts found
- `2` - Error

## codicense explain

Show detailed explanation for a conflict or license.

```bash
codicense explain <package-name>   # Explain by package
codicense explain <conflict-id>    # Explain by conflict ID
codicense explain <license>        # Explain license obligations
```

Displays:
- Conflict details and severity
- Why the conflict exists
- License obligations
- Dependency path showing how risk entered the graph
- Ranked fix options with effort and impact

## codicense fix

Apply fixes for license conflicts.

```bash
codicense fix <package> --with <alternative@version>              # Apply fix
codicense fix <package> --with <alternative@version> --dry-run    # Preview
codicense fix <package> --with <alternative@version> --pr         # Generate PR description
```

**Requirements:**
- The `--with` option is required
- You specify the replacement package and version
- Example: `codicense fix gpl-package --with mit-alternative@2.0.0`

**Workflow:**
1. Run `codicense scan` to identify conflicts
2. Run `codicense explain <package>` to understand the conflict
3. Identify a compatible alternative package
4. Preview: `codicense fix <package> --with <alternative@version> --dry-run`
5. Apply: `codicense fix <package> --with <alternative@version>`
6. Run `npm install` (or equivalent) to update lockfiles

## codicense obligations

Display license obligations in plain English.

```bash
codicense obligations <license>
```

Example:
```bash
codicense obligations GPL-3.0
```

## codicense badge

Generate compliance status badges.

```bash
codicense badge                           # Markdown format (default)
codicense badge --format html             # HTML badge
codicense badge --format rst              # reStructuredText
codicense badge --format url              # Badge URL only
codicense badge --style flat-square       # Badge style
```

## codicense trend

View local risk history.

```bash
codicense trend                     # Show trends
codicense trend --history           # Full history
codicense trend --clear             # Clear history
```

Shows risk direction (improving, worsening, stable) based on local scan history.
codicense ci                                # Default: fail on critical,high
codicense ci --fail-on critical,high,medium # Custom fail levels
codicense ci --fail-on none                 # Never fail (report only)
```

Outputs JSON by default in CI mode.

