# License Conflict Demo

This example demonstrates how Codicense would detect and explain license conflicts based on project intent.

**Note:** This is a conceptual demonstration. The actual conflict detection depends on having a GPL-licensed dependency in the dependency tree. To see this in action with real conflicts, add a GPL-licensed package to your own project and scan it with the proprietary SaaS intent configured.

## Scenario
- Project intent: proprietary SaaS (set in `.codicense/config.json`)
- Distribution: saas
- Example conflict: GPL-3.0 dependency in a proprietary SaaS project

## 1) What a conflict scan would show

If a GPL-3.0 dependency were present:
```bash
codicense scan
```
Expected output (simplified):
```
❌ License conflict detected

Package: some-gpl-package
License: GPL-3.0
Severity: CRITICAL

Reason:
GPL-3.0 is incompatible with proprietary SaaS distribution.

Project Intent: proprietary
Distribution: saas
```

## 2) How explain works
```bash
codicense explain some-gpl-package
```
Example output:
```
Why this is flagged:
- Your project is detected as a proprietary SaaS
- GPL-3.0 requires source code disclosure when distributed
- This conflicts with your project's intent

This would NOT be flagged the same way in an open-source project.
```

## 3) How fix-first guidance works
```bash
# Specify replacement package with --with option (required):
codicense fix some-gpl-package --with alternative-package@1.0.0

# Preview the fix without applying:
codicense fix some-gpl-package --with alternative-package@1.0.0 --dry-run

# Generate PR description:
codicense fix some-gpl-package --with alternative-package@1.0.0 --pr
```
Example output when --with is not provided:
```
Replacement package required for "some-gpl-package".

Usage:
  codicense fix some-gpl-package --with <package@version>

Options:
  --with <pkg@ver>  Specify replacement package (required)
  --dry-run         Preview changes without applying
  --pr              Generate pull request description

Example:
  codicense fix some-gpl-package --with alternative-package@1.0.0
```

When successful:
```
✅ Applied replacement: some-gpl-package → alternative-package
Run `npm install` to update lockfiles.
```

## Intent-Aware Intelligence
If the same dependency is used in an open-source project, severity changes with intent:
```bash
codicense scan --intent open-source
```
In that case the issue would be reduced or marked compatible, demonstrating Codicense's intent-aware risk model.
