# Monorepo Workspace Example

A pnpm workspace monorepo with multiple packages demonstrating workspace detection.

## Structure
```
monorepo-workspace/
  package.json (root)
  pnpm-workspace.yaml
  packages/
    ui/
      package.json (React UI components)
    utils/
      package.json (Shared utilities)
```

## Packages
### @workspace/ui
- react
- react-dom

### @workspace/utils
- lodash
- date-fns

## Expected Scan Result
✅ No conflicts (all MIT-licensed)

## Run Codicense
```bash
cd examples/monorepo-workspace
pnpm install  # generates pnpm-lock.yaml
codicense scan

# Export SBOM for entire monorepo
codicense scan --format sbom > monorepo-sbom.json
```

## Output
```
🎯 Scan Results

Project Context:
  Intent: open-source
  License: MIT
  Distribution: library

Summary:
  Total Dependencies: ~15 (across all workspaces)
  Conflicts: 0
  Risk Score: 0/100

✅ No license conflicts detected
```

## Use Case
Demonstrates:
- Workspace/monorepo detection
- Multi-package scanning
- Shared dependencies across workspaces
- SBOM generation for entire monorepo
