/**
 * CODICENSE Error Engineering System
 * Centralized, human-friendly, actionable errors with codes
 */

import chalk from 'chalk';

/**
 * Error codes for all CODICENSE errors
 */
export const ErrorCodes = {
  // Lockfile errors (100-199)
  LOCKFILE_NOT_FOUND: 'CODICENSE_ERR_100',
  LOCKFILE_PARSE_FAILED: 'CODICENSE_ERR_101',
  LOCKFILE_INVALID_FORMAT: 'CODICENSE_ERR_102',
  LOCKFILE_UNSUPPORTED_VERSION: 'CODICENSE_ERR_103',
  LOCKFILE_EMPTY: 'CODICENSE_ERR_104',
  LOCKFILE_MALFORMED_JSON: 'CODICENSE_ERR_105',
  LOCKFILE_MISSING_PACKAGES: 'CODICENSE_ERR_106',

  // Config errors (200-299)
  CONFIG_NOT_FOUND: 'CODICENSE_ERR_200',
  CONFIG_PARSE_FAILED: 'CODICENSE_ERR_201',
  CONFIG_INVALID_LICENSE: 'CODICENSE_ERR_202',
  CONFIG_INVALID_DISTRIBUTION: 'CODICENSE_ERR_203',
  CONFIG_INVALID_LINKING: 'CODICENSE_ERR_204',
  CONFIG_MISSING_REQUIRED: 'CODICENSE_ERR_205',

  // License errors (300-399)
  LICENSE_UNKNOWN: 'CODICENSE_ERR_300',
  LICENSE_NOT_IN_SPDX: 'CODICENSE_ERR_301',
  LICENSE_DUAL_AMBIGUOUS: 'CODICENSE_ERR_302',
  LICENSE_EXPRESSION_INVALID: 'CODICENSE_ERR_303',

  // Scan errors (400-499)
  SCAN_NO_DEPENDENCIES: 'CODICENSE_ERR_400',
  SCAN_CIRCULAR_DEPENDENCY: 'CODICENSE_ERR_401',
  SCAN_DEPTH_EXCEEDED: 'CODICENSE_ERR_402',
  SCAN_TIMEOUT: 'CODICENSE_ERR_403',

  // Fix errors (500-599)
  FIX_NO_ALTERNATIVES: 'CODICENSE_ERR_500',
  FIX_PR_GENERATION_FAILED: 'CODICENSE_ERR_501',
  FIX_GITHUB_AUTH_MISSING: 'CODICENSE_ERR_502',
  FIX_INCOMPATIBLE_RANGE: 'CODICENSE_ERR_503',

  // Compatibility errors (600-699)
  COMPAT_RULE_NOT_FOUND: 'CODICENSE_ERR_600',
  COMPAT_CONFLICT_DETECTED: 'CODICENSE_ERR_601',
  COMPAT_STRICT_MODE_VIOLATION: 'CODICENSE_ERR_602',

  // General errors (900-999)
  INTERNAL_ERROR: 'CODICENSE_ERR_900',
  UNKNOWN_ERROR: 'CODICENSE_ERR_999',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Error metadata with human-friendly messages and recommendations
 */
interface ErrorMetadata {
  code: ErrorCode;
  message: string;
  recommendation: string;
  docLink?: string;
}

const errorMetadata: Record<ErrorCode, Omit<ErrorMetadata, 'code'>> = {
  [ErrorCodes.LOCKFILE_NOT_FOUND]: {
    message: 'No lockfile found in the project',
    recommendation: 'Run "npm install" or "yarn install" to generate a lockfile, then run CODICENSE again.',
    docLink: 'https://codicense.dev/docs/lockfiles',
  },
  [ErrorCodes.LOCKFILE_PARSE_FAILED]: {
    message: 'Failed to parse the lockfile',
    recommendation: 'Ensure your lockfile is valid. Try deleting it and running "npm install" again.',
  },
  [ErrorCodes.LOCKFILE_INVALID_FORMAT]: {
    message: 'Lockfile format is not recognized',
    recommendation: 'CODICENSE supports npm (package-lock.json) and Yarn Classic (yarn.lock). pnpm support coming soon.',
  },
  [ErrorCodes.LOCKFILE_UNSUPPORTED_VERSION]: {
    message: 'Lockfile version is not supported',
    recommendation: 'Update to npm 7+ for lockfile v2/v3, or use Yarn Classic. Yarn Berry is not yet supported.',
  },
  [ErrorCodes.LOCKFILE_EMPTY]: {
    message: 'Lockfile exists but contains no dependencies',
    recommendation: 'Your project has no dependencies. Add dependencies to package.json and run npm install.',
  },
  [ErrorCodes.LOCKFILE_MALFORMED_JSON]: {
    message: 'Lockfile contains invalid JSON',
    recommendation: 'The lockfile is corrupted. Delete package-lock.json and run "npm install" to regenerate.',
  },
  [ErrorCodes.LOCKFILE_MISSING_PACKAGES]: {
    message: 'Lockfile is missing the packages section',
    recommendation: 'Lockfile may be incomplete. Delete and regenerate with "npm install".',
  },
  [ErrorCodes.CONFIG_NOT_FOUND]: {
    message: 'No CODICENSE configuration found',
    recommendation: 'Run "codicense init" to create a codicense.config.json file with your project settings.',
  },
  [ErrorCodes.CONFIG_PARSE_FAILED]: {
    message: 'Failed to parse CODICENSE configuration',
    recommendation: 'Check codicense.config.json for JSON syntax errors. Use a JSON validator.',
  },
  [ErrorCodes.CONFIG_INVALID_LICENSE]: {
    message: 'Invalid project license specified in config',
    recommendation: 'Use a valid SPDX license identifier (e.g., "MIT", "Apache-2.0", "GPL-3.0").',
  },
  [ErrorCodes.CONFIG_INVALID_DISTRIBUTION]: {
    message: 'Invalid distribution model specified',
    recommendation: 'Use one of: "proprietary", "saas", "open-source", or "internal-only".',
  },
  [ErrorCodes.CONFIG_INVALID_LINKING]: {
    message: 'Invalid linking model specified',
    recommendation: 'Use one of: "static", "dynamic", "runtime", or "microservice".',
  },
  [ErrorCodes.CONFIG_MISSING_REQUIRED]: {
    message: 'Required configuration field is missing',
    recommendation: 'Ensure projectLicense, distributionModel, and linkingModel are set in codicense.config.json.',
  },
  [ErrorCodes.LICENSE_UNKNOWN]: {
    message: 'Dependency has an unknown or missing license',
    recommendation: 'Check the package\'s repository for license info. Consider contacting the maintainer.',
  },
  [ErrorCodes.LICENSE_NOT_IN_SPDX]: {
    message: 'License is not in the SPDX database',
    recommendation: 'This may be a custom license. Review it manually or add to policy.allowedLicenses.',
  },
  [ErrorCodes.LICENSE_DUAL_AMBIGUOUS]: {
    message: 'Dual-licensed package has ambiguous license selection',
    recommendation: 'Choose the compatible license variant and add to policy.allowedLicenses.',
  },
  [ErrorCodes.LICENSE_EXPRESSION_INVALID]: {
    message: 'SPDX license expression is malformed',
    recommendation: 'Check the package.json license field. Common formats: "MIT", "MIT OR Apache-2.0".',
  },
  [ErrorCodes.SCAN_NO_DEPENDENCIES]: {
    message: 'No dependencies to scan',
    recommendation: 'Add dependencies to your project or check that devDependencies filtering is correct.',
  },
  [ErrorCodes.SCAN_CIRCULAR_DEPENDENCY]: {
    message: 'Circular dependency detected in dependency tree',
    recommendation: 'This is usually harmless but may indicate a packaging issue. Check npm ls for details.',
  },
  [ErrorCodes.SCAN_DEPTH_EXCEEDED]: {
    message: 'Maximum dependency depth exceeded',
    recommendation: 'Your dependency tree is very deep. This may slow scans. Consider flattening dependencies.',
  },
  [ErrorCodes.SCAN_TIMEOUT]: {
    message: 'Scan timed out',
    recommendation: 'Large projects may take longer. Try scanning with --timeout 60000 for extended time.',
  },
  [ErrorCodes.FIX_NO_ALTERNATIVES]: {
    message: 'No alternative packages found for this conflict',
    recommendation: 'Consider using a wrapper pattern or architectural restructuring. See docs for strategies.',
  },
  [ErrorCodes.FIX_PR_GENERATION_FAILED]: {
    message: 'Failed to generate fix PR',
    recommendation: 'Check your GitHub token permissions. Ensure you have write access to the repository.',
  },
  [ErrorCodes.FIX_GITHUB_AUTH_MISSING]: {
    message: 'GitHub authentication required for PR generation',
    recommendation: 'Set GITHUB_TOKEN environment variable or use --token flag.',
  },
  [ErrorCodes.FIX_INCOMPATIBLE_RANGE]: {
    message: 'No compatible version range found',
    recommendation: 'The package may not have a version with a compatible license. Consider alternatives.',
  },
  [ErrorCodes.COMPAT_RULE_NOT_FOUND]: {
    message: 'No compatibility rule found for this license combination',
    recommendation: 'CODICENSE used heuristics. For certainty, add an explicit rule or enable strict mode.',
  },
  [ErrorCodes.COMPAT_CONFLICT_DETECTED]: {
    message: 'License conflict detected',
    recommendation: 'Run "codicense fix" for automated resolution suggestions.',
  },
  [ErrorCodes.COMPAT_STRICT_MODE_VIOLATION]: {
    message: 'Strict mode violation: heuristic rule used',
    recommendation: 'In strict mode, only explicit rules are allowed. Add a rule or disable strict mode.',
  },
  [ErrorCodes.INTERNAL_ERROR]: {
    message: 'An internal error occurred',
    recommendation: 'This is a bug in CODICENSE. Please report it at https://github.com/codicense/codicense/issues',
  },
  [ErrorCodes.UNKNOWN_ERROR]: {
    message: 'An unknown error occurred',
    recommendation: 'Try running with --verbose for more details. If persistent, report the issue.',
  },
};

/**
 * CODICENSE Error class with enhanced metadata
 */
export class CodicenseError extends Error {
  public readonly code: ErrorCode;
  public readonly recommendation: string;
  public readonly docLink?: string;
  public readonly context?: Record<string, unknown>;
  public readonly ruleId?: string;
  public readonly spdxRef?: string;

  constructor(
    code: ErrorCode,
    customMessage?: string,
    options?: {
      context?: Record<string, unknown>;
      ruleId?: string;
      spdxRef?: string;
      cause?: Error;
    }
  ) {
    const meta = errorMetadata[code];
    const message = customMessage || meta.message;

    super(message);
    this.name = 'CodicenseError';
    this.code = code;
    this.recommendation = meta.recommendation;
    this.docLink = meta.docLink;
    this.context = options?.context;
    this.ruleId = options?.ruleId;
    this.spdxRef = options?.spdxRef;

    if (options?.cause) {
      this.cause = options.cause;
    }

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace?.(this, CodicenseError);
  }

  /**
   * Format error for console output
   */
  format(options: { color?: boolean; verbose?: boolean } = {}): string {
    const { color = true, verbose = false } = options;

    const lines: string[] = [];

    // Error header
    const errorIcon = color ? chalk.red('✖') : '✖';
    const codeStr = color ? chalk.dim(`[${this.code}]`) : `[${this.code}]`;
    lines.push(`${errorIcon} ${codeStr} ${this.message}`);

    // Recommendation
    const tryIcon = color ? chalk.yellow('→') : '→';
    const tryLabel = color ? chalk.yellow('Try:') : 'Try:';
    lines.push(`  ${tryIcon} ${tryLabel} ${this.recommendation}`);

    // Rule ID and SPDX reference (for traceability)
    if (this.ruleId) {
      const ruleLabel = color ? chalk.cyan('Rule:') : 'Rule:';
      lines.push(`  ${ruleLabel} ${this.ruleId}`);
    }
    if (this.spdxRef) {
      const refLabel = color ? chalk.cyan('Reference:') : 'Reference:';
      lines.push(`  ${refLabel} ${this.spdxRef}`);
    }

    // Doc link
    if (this.docLink) {
      const linkLabel = color ? chalk.blue('Docs:') : 'Docs:';
      lines.push(`  ${linkLabel} ${this.docLink}`);
    }

    // Context (verbose mode)
    if (verbose && this.context) {
      const contextLabel = color ? chalk.dim('Context:') : 'Context:';
      lines.push(`  ${contextLabel}`);
      for (const [key, value] of Object.entries(this.context)) {
        lines.push(`    ${key}: ${JSON.stringify(value)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Convert to JSON for programmatic use
   */
  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      recommendation: this.recommendation,
      docLink: this.docLink,
      ruleId: this.ruleId,
      spdxRef: this.spdxRef,
      context: this.context,
    };
  }
}

/**
 * Error formatter utility
 */
export class ErrorFormatter {
  private colorEnabled: boolean;
  private verboseEnabled: boolean;

  constructor(options: { color?: boolean; verbose?: boolean } = {}) {
    this.colorEnabled = options.color ?? true;
    this.verboseEnabled = options.verbose ?? false;
  }

  /**
   * Format any error for console output
   */
  format(error: unknown): string {
    if (error instanceof CodicenseError) {
      return error.format({ color: this.colorEnabled, verbose: this.verboseEnabled });
    }

    if (error instanceof Error) {
      return this.formatGenericError(error);
    }

    return this.formatUnknown(error);
  }

  private formatGenericError(error: Error): string {
    const lines: string[] = [];
    const errorIcon = this.colorEnabled ? chalk.red('✖') : '✖';
    const codeStr = this.colorEnabled ? chalk.dim(`[${ErrorCodes.INTERNAL_ERROR}]`) : `[${ErrorCodes.INTERNAL_ERROR}]`;

    lines.push(`${errorIcon} ${codeStr} ${error.message}`);

    const tryIcon = this.colorEnabled ? chalk.yellow('→') : '→';
    const tryLabel = this.colorEnabled ? chalk.yellow('Try:') : 'Try:';
    lines.push(`  ${tryIcon} ${tryLabel} ${errorMetadata[ErrorCodes.INTERNAL_ERROR].recommendation}`);

    if (this.verboseEnabled && error.stack) {
      const stackLabel = this.colorEnabled ? chalk.dim('Stack:') : 'Stack:';
      lines.push(`  ${stackLabel}`);
      lines.push(error.stack.split('\n').slice(1).map((l) => `    ${l.trim()}`).join('\n'));
    }

    return lines.join('\n');
  }

  private formatUnknown(error: unknown): string {
    const errorIcon = this.colorEnabled ? chalk.red('✖') : '✖';
    const codeStr = this.colorEnabled ? chalk.dim(`[${ErrorCodes.UNKNOWN_ERROR}]`) : `[${ErrorCodes.UNKNOWN_ERROR}]`;

    return `${errorIcon} ${codeStr} ${String(error)}`;
  }

  setColor(enabled: boolean): void {
    this.colorEnabled = enabled;
  }

  setVerbose(enabled: boolean): void {
    this.verboseEnabled = enabled;
  }
}

/**
 * Create a CODICENSE error with proper typing
 */
export function createError(
  code: ErrorCode,
  customMessage?: string,
  options?: {
    context?: Record<string, unknown>;
    ruleId?: string;
    spdxRef?: string;
    cause?: Error;
  }
): CodicenseError {
  return new CodicenseError(code, customMessage, options);
}

/**
 * Global error formatter instance
 */
export const errorFormatter = new ErrorFormatter();

