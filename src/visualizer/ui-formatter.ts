/**
 * Beautiful CLI UI Formatter
 * Provides color-coded, icon-enhanced output for CODICENSE
 */

import chalk from 'chalk';
import type { DynamicSeverity } from '../ili/types';
import type { EnhancedConflict } from '../engine/ili-scanner';

export class UIFormatter {
  /**
   * Format severity level with color and icon
   */
  static formatSeverity(severity: DynamicSeverity | string): string {
    const level = typeof severity === 'string' ? severity : severity.level;

    switch (level) {
      case 'critical':
        return chalk.red(`🔴 CRITICAL`);
      case 'high':
        return chalk.red(`🟠 HIGH`);
      case 'medium':
        return chalk.yellow(`🟡 MEDIUM`);
      case 'low':
        return chalk.blue(`🟢 LOW`);
      case 'info':
        return chalk.cyan(`ℹ️  INFO`);
      default:
        return chalk.gray(`⚪ ${level.toUpperCase()}`);
    }
  }

  /**
   * Format a summary table of conflicts
   */
  static formatSummaryTable(conflicts: Array<{ name: string; count: number; severity: string }>): string {
    if (conflicts.length === 0) {
      return chalk.green('✅ No license conflicts found!\n');
    }

    let output = chalk.bold('\n📋 License Conflicts Summary:\n');
    output += chalk.dim('─'.repeat(60)) + '\n';

    for (const conflict of conflicts) {
      const severityFormatted = this.formatSeverity(conflict.severity);
      const countStr = chalk.cyan(`(${conflict.count})`);
      output += `  ${severityFormatted}  ${chalk.bold(conflict.name)}  ${countStr}\n`;
    }

    output += chalk.dim('─'.repeat(60)) + '\n';
    return output;
  }

  /**
   * Format a single enhanced conflict with details
   */
  static formatEnhancedConflict(conflict: EnhancedConflict, index: number): string {
    let output = chalk.bold(`\n${index + 1}. Conflict: ${conflict.dependency.name}\n`);

    output += `   ${chalk.dim('Package:')}  ${chalk.cyan(conflict.dependency.name)}@${chalk.cyan(conflict.dependency.version)}\n`;
    output += `   ${chalk.dim('License:')}  ${chalk.yellow(conflict.dependency.license)}\n`;

    if (conflict.triggeredRule && conflict.triggeredRule.id) {
      output += `   ${chalk.dim('Rule:')}       ${chalk.yellow(conflict.triggeredRule.id)}\n`;
    }

    if (conflict.dynamicSeverity) {
      output += `   ${chalk.dim('Severity:')}   ${this.formatSeverity(conflict.dynamicSeverity)}\n`;
      if (conflict.dynamicSeverity.reason) {
        output += `   ${chalk.dim('Reason:')}     ${chalk.gray(conflict.dynamicSeverity.reason)}\n`;
      }
    }

    return output;
  }

  /**
   * Format a fix suggestion with effort level
   */
  static formatFix(fix: { description: string; effort: 'low' | 'medium' | 'high'; steps?: string[] }): string {
    const effortColor =
      fix.effort === 'low' ? chalk.green : fix.effort === 'medium' ? chalk.yellow : chalk.red;
    const effortIcon =
      fix.effort === 'low' ? '✅' : fix.effort === 'medium' ? '⚠️ ' : '🔧';

    let output = `   ${effortIcon} ${effortColor(`[${fix.effort.toUpperCase()} EFFORT]`)}  ${fix.description}\n`;

    if (fix.steps && fix.steps.length > 0) {
      for (const [idx, step] of fix.steps.entries()) {
        output += `      ${chalk.dim(`${idx + 1}.`)} ${step}\n`;
      }
    }

    return output;
  }

  /**
   * Format header with branding
   */
  static formatHeader(title: string, subtitle?: string): string {
    const line = chalk.cyan('═'.repeat(60));
    let output = `\n${line}\n`;
    output += chalk.bold.cyan(`  ⚖️  ${title}\n`);
    if (subtitle) {
      output += chalk.dim(`  ${subtitle}\n`);
    }
    output += `${line}\n`;
    return output;
  }

  /**
   * Format success message
   */
  static formatSuccess(message: string): string {
    return chalk.green(`✅ ${message}`);
  }

  /**
   * Format warning message
   */
  static formatWarning(message: string): string {
    return chalk.yellow(`⚠️  ${message}`);
  }

  /**
   * Format error message
   */
  static formatError(message: string): string {
    return chalk.red(`❌ ${message}`);
  }

  /**
   * Format info message
   */
  static formatInfo(message: string): string {
    return chalk.cyan(`ℹ️  ${message}`);
  }

  /**
   * Format a dependency tree node
   */
  static formatDependencyTree(name: string, version: string, depth: number, isLast: boolean = true): string {
    const indent = '  '.repeat(depth);
    const prefix = isLast ? '└── ' : '├── ';
    return `${indent}${chalk.cyan(prefix)}${chalk.bold(name)}@${chalk.yellow(version)}\n`;
  }

  /**
   * Format stats row for tables
   */
  static formatStatsRow(label: string, value: string | number, color: 'cyan' | 'green' | 'red' | 'yellow' = 'cyan'): string {
    const colorFn = color === 'cyan' ? chalk.cyan : color === 'green' ? chalk.green : color === 'red' ? chalk.red : chalk.yellow;
    return `  ${chalk.dim(label.padEnd(25))} ${colorFn(String(value).padStart(10))}\n`;
  }
}

