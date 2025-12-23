# Language and Ecosystem Support

Codicense scans JavaScript/TypeScript projects.

## JavaScript/TypeScript

### Supported Lockfiles

- `package-lock.json` (npm)
- `yarn.lock` (Yarn v1)
- `pnpm-lock.yaml` (pnpm v6+)

### Workspace Detection

Automatically detects and scans monorepos:

```
my-monorepo/
  package.json (with workspaces)
  pnpm-lock.yaml
  packages/
    app-a/package.json
    app-b/package.json
```

## License Detection

Codicense determines licenses from lockfiles and package metadata in the repository. If a license cannot be determined, it is marked as `UNKNOWN`.

