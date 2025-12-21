# Language and Ecosystem Support

Codicense scans JavaScript, Python, and Go projects.

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

## Python

### Supported Lockfiles

- `requirements.txt`
- `Pipfile.lock` (Pipenv)
- `poetry.lock` (Poetry)

### Example

```
my-poetry-app/
  pyproject.toml
  poetry.lock
```

## Go

### Supported Lockfiles

- `go.mod`
- `go.sum`

### Example

```
my-go-app/
  go.mod
  go.sum
```

## License Detection

Codicense determines licenses from:
- **JavaScript/TypeScript**: Package registry and lockfile metadata
- **Python**: PyPI registry and package classifiers
- **Go**: Go proxy and repository metadata

If a license cannot be determined, it is marked as `UNKNOWN`.

