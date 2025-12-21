# Small CLI Example

A minimal Node.js CLI application with common open-source dependencies.

## Dependencies (3)
- `chalk` - Terminal styling (MIT)
- `commander` - CLI framework (MIT)
- `inquirer` - Interactive prompts (MIT)

## Expected Scan Result
✅ No conflicts (all MIT-licensed)

## Run Codicense
```bash
cd examples/small-cli
npm install  # generates package-lock.json
codicense scan
```

## Output
```
🎯 Scan Results

Project Context:
  Intent: open-source
  License: MIT
  Distribution: cli

Summary:
  Total Dependencies: ~10
  Conflicts: 0
  Risk Score: 0/100

✅ No license conflicts detected
```
