/**
 * Patch Generator Tests
 * 
 * Tests for patch creation and diff generation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PatchGenerator } from '../../src/fix/patch-generator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('PatchGenerator', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codicense-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('generateReplacementPatch', () => {
    it('should generate patch for dependency replacement', () => {
      const pkgJson = {
        dependencies: {
          'gpl-library': '^1.0.0',
          'other-lib': '^2.0.0',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patch = PatchGenerator.generateReplacementPatch(
        tempDir,
        'gpl-library',
        'mit-alternative'
      );

      expect(patch.description).toContain('gpl-library');
      expect(patch.description).toContain('mit-alternative');
      expect(patch.operations.length).toBeGreaterThan(0);
    });

    it('should handle both dependencies and devDependencies', () => {
      const pkgJson = {
        dependencies: {
          'gpl-library': '^1.0.0',
        },
        devDependencies: {
          'gpl-library': '^1.0.0',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patch = PatchGenerator.generateReplacementPatch(
        tempDir,
        'gpl-library',
        'mit-alternative'
      );

      expect(patch.operations.length).toBe(2); // Both deps and devDeps
    });

    it('should generate unified diff format', () => {
      const pkgJson = {
        dependencies: {
          'old-pkg': '^1.0.0',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patch = PatchGenerator.generateReplacementPatch(
        tempDir,
        'old-pkg',
        'new-pkg'
      );

      expect(patch.diff).toContain('---');
      expect(patch.diff).toContain('+++');
      expect(patch.diff).toContain('@@');
      expect(patch.diff).toContain('-"old-pkg"');
      expect(patch.diff).toContain('+"new-pkg"');
    });

    it('should handle missing package.json', () => {
      const patch = PatchGenerator.generateReplacementPatch(
        tempDir,
        'gpl-library',
        'mit-alternative'
      );

      expect(patch.operations.length).toBe(0);
      expect(patch.description).toBeDefined();
    });

    it('should preserve version range', () => {
      const pkgJson = {
        dependencies: {
          'old-lib': '^3.2.1',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patch = PatchGenerator.generateReplacementPatch(
        tempDir,
        'old-lib',
        'new-lib'
      );

      const op = patch.operations[0];
      expect(op?.after).toContain('^3.2.1'); // Preserves version
    });
  });

  describe('generateMigrationGuide', () => {
    it('should generate basic migration guide', () => {
      const guide = PatchGenerator.generateMigrationGuide(
        'gpl-library',
        'mit-alternative',
        []
      );

      expect(guide).toContain('# Migration Guide');
      expect(guide).toContain('gpl-library');
      expect(guide).toContain('mit-alternative');
      expect(guide).toContain('npm uninstall');
      expect(guide).toContain('npm install');
    });

    it('should include API changes when provided', () => {
      const apiChanges = [
        'Import renamed: OldClass → NewClass',
        'Method signature changed: doSomething(x) → doSomething(x, y)',
      ];

      const guide = PatchGenerator.generateMigrationGuide(
        'old-lib',
        'new-lib',
        apiChanges
      );

      expect(guide).toContain('OldClass');
      expect(guide).toContain('NewClass');
      expect(guide).toContain('doSomething');
    });

    it('should note drop-in replacement when no API changes', () => {
      const guide = PatchGenerator.generateMigrationGuide(
        'lib-a',
        'lib-b',
        []
      );

      expect(guide).toContain('drop-in replacement');
      expect(guide).toContain('No code changes required');
    });

    it('should include testing checklist', () => {
      const guide = PatchGenerator.generateMigrationGuide(
        'any-lib',
        'other-lib',
        []
      );

      expect(guide).toContain('npm test');
      expect(guide).toContain('Testing');
    });

    it('should use markdown formatting', () => {
      const guide = PatchGenerator.generateMigrationGuide(
        'lib-a',
        'lib-b',
        []
      );

      expect(guide).toContain('#');
      expect(guide).toContain('```');
      expect(guide).toContain('-');
    });
  });

  describe('patch determinism', () => {
    it('should generate identical patches for same input', () => {
      const pkgJson = {
        dependencies: {
          'test-lib': '^1.0.0',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patch1 = PatchGenerator.generateReplacementPatch(
        tempDir,
        'test-lib',
        'alt-lib'
      );

      const patch2 = PatchGenerator.generateReplacementPatch(
        tempDir,
        'test-lib',
        'alt-lib'
      );

      expect(patch1.diff).toBe(patch2.diff);
      expect(patch1.operations.length).toBe(patch2.operations.length);
    });

    it('should not include timestamps', () => {
      const pkgJson = {
        dependencies: {
          'test-lib': '^1.0.0',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patch = PatchGenerator.generateReplacementPatch(
        tempDir,
        'test-lib',
        'alt-lib'
      );

      expect(patch.diff).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(patch.diff).not.toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('should produce consistent operation order', () => {
      const pkgJson = {
        dependencies: {
          'lib-a': '^1.0.0',
        },
        devDependencies: {
          'lib-a': '^1.0.0',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patches = [];
      for (let i = 0; i < 5; i++) {
        patches.push(
          PatchGenerator.generateReplacementPatch(tempDir, 'lib-a', 'lib-b')
        );
      }

      const firstOperations = patches[0]?.operations;
      for (const patch of patches.slice(1)) {
        expect(patch.operations).toEqual(firstOperations);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle package not in dependencies', () => {
      const pkgJson = {
        dependencies: {
          'other-lib': '^1.0.0',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patch = PatchGenerator.generateReplacementPatch(
        tempDir,
        'missing-lib',
        'new-lib'
      );

      expect(patch.operations.length).toBe(0);
    });

    it('should handle malformed package.json gracefully', () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, '{ invalid json');

      expect(() => {
        PatchGenerator.generateReplacementPatch(tempDir, 'lib', 'new-lib');
      }).toThrow();
    });

    it('should handle scoped packages', () => {
      const pkgJson = {
        dependencies: {
          '@company/gpl-lib': '^1.0.0',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patch = PatchGenerator.generateReplacementPatch(
        tempDir,
        '@company/gpl-lib',
        '@other/mit-lib'
      );

      expect(patch.operations.length).toBe(1);
      expect(patch.operations[0]?.after).toContain('@other/mit-lib');
    });

    it('should handle special characters in package names', () => {
      const pkgJson = {
        dependencies: {
          'lib-with-dash': '^1.0.0',
        },
      };

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));

      const patch = PatchGenerator.generateReplacementPatch(
        tempDir,
        'lib-with-dash',
        'new-lib'
      );

      expect(patch.operations.length).toBe(1);
    });
  });
});

