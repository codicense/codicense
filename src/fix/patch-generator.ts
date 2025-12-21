/**
 * Patch Generator - Creates code diffs for fixes
 * 
 * Generates deterministic, reviewable patches for dependency replacements.
 */

import fs from 'fs';
import path from 'path';

export interface PatchOperation {
  file: string;
  operation: 'add' | 'remove' | 'modify';
  before?: string;
  after?: string;
  lineNumber?: number;
}

export interface Patch {
  description: string;
  operations: PatchOperation[];
  diff: string;
}

export class PatchGenerator {
  /**
   * Generate patch for replacing a dependency
   */
  static generateReplacementPatch(
    projectPath: string,
    oldPackage: string,
    newPackage: string,
    newVersion?: string
  ): Patch {
    const operations: PatchOperation[] = [];

    // Update package.json
    const pkgJsonPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      const deps = pkg.dependencies || {};
      const devDeps = pkg.devDependencies || {};

      if (deps[oldPackage]) {
        const targetVersion = newVersion ?? deps[oldPackage];
        operations.push({
          file: 'package.json',
          operation: 'modify',
          before: `"${oldPackage}": "${deps[oldPackage]}"`,
          after: `"${newPackage}": "${targetVersion}"`,
        });
      }

      if (devDeps[oldPackage]) {
        const targetVersion = newVersion ?? devDeps[oldPackage];
        operations.push({
          file: 'package.json',
          operation: 'modify',
          before: `"${oldPackage}": "${devDeps[oldPackage]}"`,
          after: `"${newPackage}": "${targetVersion}"`,
        });
      }
    }

    const diff = this.generateUnifiedDiff(operations);

    return {
      description: `Replace ${oldPackage} with ${newPackage}`,
      operations,
      diff,
    };
  }

  /**
   * Generate unified diff format
   */
  private static generateUnifiedDiff(operations: PatchOperation[]): string {
    const lines: string[] = [];

    for (const op of operations) {
      lines.push(`--- a/${op.file}`);
      lines.push(`+++ b/${op.file}`);
      lines.push(`@@ -1,1 +1,1 @@`);
      
      if (op.before) {
        lines.push(`-${op.before}`);
      }
      if (op.after) {
        lines.push(`+${op.after}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate migration guide
   */
  static generateMigrationGuide(
    oldPackage: string,
    newPackage: string,
    apiChanges: string[]
  ): string {
    const lines: string[] = [];
    
    lines.push(`# Migration Guide: ${oldPackage} → ${newPackage}`);
    lines.push('');
    lines.push('## Installation');
    lines.push('');
    lines.push('```bash');
    lines.push(`npm uninstall ${oldPackage}`);
    lines.push(`npm install ${newPackage}`);
    lines.push('```');
    lines.push('');
    lines.push('## Code Changes');
    lines.push('');

    if (apiChanges.length === 0) {
      lines.push('No code changes required - drop-in replacement.');
    } else {
      for (const change of apiChanges) {
        lines.push(`- ${change}`);
      }
    }

    lines.push('');
    lines.push('## Testing');
    lines.push('');
    lines.push('1. Run your test suite: `npm test`');
    lines.push('2. Check for any deprecation warnings');
    lines.push('3. Update imports if package name changed');

    return lines.join('\n');
  }
}

