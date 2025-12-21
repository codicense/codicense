# Security Policy

## Supported Versions

| Version | Status             |
| ------- | ------------------ |
| 3.x     | Supported          |
| < 3.0   | Not supported      |

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly.

**Do not** open a public GitHub issue. Instead:

1. Visit [GitHub Security Advisories](https://github.com/codicense/codicense/security/advisories/new)
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if available)

## Response Timeline

- Initial acknowledgment: 24 hours
- Assessment: 72 hours
- Fix development: 1-2 weeks
- Public disclosure: After fix release

## Using Codicense Securely

1. **Keep updated**: Run `npm update codicense` regularly
2. **Verify integrity**: Check npm package signatures
3. **Review changes**: Inspect lockfile changes in pull requests
4. **CI/CD integration**: Use `--fail-on critical` in production pipelines
5. **Strict mode**: Enable `strictMode: true` for regulated environments where only explicit rules apply

## Security Features

### Offline Operation

CODICENSE is **100% offline**:
- No network calls during operation
- No telemetry or data collection
- Deterministic, reproducible results

### Supply Chain Security

- All dependencies reviewed for license compliance
- Minimal dependency footprint
- No native modules required

### Error Handling

- No sensitive data in error messages
- Error codes for programmatic handling
- Sanitized stack traces in production

## Vulnerability Disclosure History

| Date | Version | Issue | Severity | Status |
|------|---------|-------|----------|--------|
| - | - | No vulnerabilities reported | - | - |

## Recognition

We appreciate responsible disclosure. Security researchers who report valid vulnerabilities will be:

- Credited in release notes (if desired)
- Listed in SECURITY.md acknowledgments

## Contact

- Security issues: Use GitHub Security Advisories
- General inquiries: GitHub Issues for non-security matters
- GitHub: https://github.com/codicense/codicense

