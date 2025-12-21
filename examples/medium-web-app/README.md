# Medium Web App Example

A typical Express.js REST API with ~40 dependencies including authentication, database, logging.

## Dependencies (~40)
### Production
- `express` - Web framework (MIT)
- `cors` - CORS middleware (MIT)
- `dotenv` - Environment vars (BSD-2-Clause)
- `helmet` - Security headers (MIT)
- `mongoose` - MongoDB ODM (MIT)
- `bcryptjs` - Password hashing (MIT)
- `jsonwebtoken` - JWT auth (MIT)
- `express-validator` - Input validation (MIT)
- `morgan` - HTTP logger (MIT)
- `winston` - Logging (MIT)

### Dev
- TypeScript, Nodemon, type definitions

## Expected Scan Result
✅ No conflicts (all permissive licenses)

## Run Codicense
```bash
cd examples/medium-web-app
npm install  # generates package-lock.json
codicense scan

# Try different formats
codicense scan --format markdown > report.md
codicense scan --format table
codicense scan --format sbom > sbom.json
```

## Output
```
🎯 Scan Results

Project Context:
  Intent: open-source
  License: MIT
  Distribution: saas

Summary:
  Total Dependencies: ~40
  Conflicts: 0
  Risk Score: 0/100

✅ No license conflicts detected
```

## Use Case
Demonstrates scanning a real-world web application with typical production dependencies. Shows how Codicense handles:
- Multiple transitive dependencies
- Mixed license types (MIT, BSD, ISC)
- Common authentication/security libraries
