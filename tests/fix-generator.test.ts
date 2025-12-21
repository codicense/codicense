import { describe, it, expect } from 'vitest';
import { FixGenerator } from '../src/engine/fix-generator';
import { LicenseFixDatabase } from '../src/engine/licensefix-db';
import type { ScanResult, Conflict } from '../src/types';

describe('FixGenerator', () => {
  const fixGenerator = new FixGenerator();

  it('should generate no fixes for clean scans', () => {
    const scanResult: ScanResult = {
      scanId: 'test-1',
      timestamp: new Date().toISOString(),
      projectLicense: 'MIT',
      riskScore: 95,
      summary: {
        totalDependencies: 10,
        conflicts: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      conflicts: [],
    };

    const fixes = fixGenerator.generateFixes(scanResult);
    expect(fixes).toHaveLength(0);
  });

  it('should generate fix for GPL-3.0 conflict', () => {
    const gplConflict: Conflict = {
      id: 'conflict-1',
      severity: 'CRITICAL',
      dependency: {
        name: 'some-gpl-lib',
        version: '2.1.0',
        license: 'GPL-3.0',
        path: ['express', 'body-parser', 'some-gpl-lib'],
      },
      reason: 'GPL-3.0 requires entire codebase to be GPL-3.0',
      contaminationPath: ['express', 'body-parser', 'some-gpl-lib'],
      fixes: [],
    };

    const scanResult: ScanResult = {
      scanId: 'test-2',
      timestamp: new Date().toISOString(),
      projectLicense: 'MIT',
      riskScore: 20,
      summary: {
        totalDependencies: 100,
        conflicts: 1,
        critical: 1,
        high: 0,
        medium: 0,
        low: 0,
      },
      conflicts: [gplConflict],
    };

    const fixes = fixGenerator.generateFixes(scanResult);
    expect(fixes).toHaveLength(1);
    expect(fixes[0].title).toContain('GPL-3.0');
    expect(fixes[0].title).toContain('some-gpl-lib');
    expect(fixes[0].strategies.length).toBeGreaterThan(0);
  });

  it('should include replace strategy for GPL conflicts', () => {
    const gplConflict: Conflict = {
      id: 'conflict-2',
      severity: 'HIGH',
      dependency: {
        name: 'some-gpl-lib',
        version: '1.0.0',
        license: 'GPL-2.0',
        path: ['some-gpl-lib'],
      },
      reason: 'GPL-2.0 incompatible with MIT proprietary license',
      contaminationPath: ['some-gpl-lib'],
      fixes: [],
    };

    const scanResult: ScanResult = {
      scanId: 'test-3',
      timestamp: new Date().toISOString(),
      projectLicense: 'MIT',
      riskScore: 40,
      summary: {
        totalDependencies: 50,
        conflicts: 1,
        critical: 0,
        high: 1,
        medium: 0,
        low: 0,
      },
      conflicts: [gplConflict],
    };

    const fixes = fixGenerator.generateFixes(scanResult);
    const hasReplaceStrategy = fixes[0].strategies.some((s) => s.type === 'replace');
    expect(hasReplaceStrategy).toBe(true);
  });

  it('should include isolate strategy for AGPL conflicts', () => {
    const agplConflict: Conflict = {
      id: 'conflict-3',
      severity: 'HIGH',
      dependency: {
        name: 'some-agpl-lib',
        version: '1.0.0',
        license: 'AGPL-3.0',
        path: ['some-agpl-lib'],
      },
      reason: 'AGPL-3.0 requires source code disclosure for SaaS',
      contaminationPath: ['some-agpl-lib'],
      fixes: [],
    };

    const scanResult: ScanResult = {
      scanId: 'test-4',
      timestamp: new Date().toISOString(),
      projectLicense: 'MIT',
      riskScore: 50,
      summary: {
        totalDependencies: 75,
        conflicts: 1,
        critical: 0,
        high: 1,
        medium: 0,
        low: 0,
      },
      conflicts: [agplConflict],
    };

    const fixes = fixGenerator.generateFixes(scanResult);
    const hasIsolateStrategy = fixes[0].strategies.some((s) => s.type === 'isolate');
    expect(hasIsolateStrategy).toBe(true);
  });

  it('should generate PR description with proper formatting', () => {
    const conflict: Conflict = {
      id: 'conflict-4',
      severity: 'CRITICAL',
      dependency: {
        name: 'gpl-package',
        version: '1.0.0',
        license: 'GPL-3.0',
        path: ['dep1', 'dep2', 'gpl-package'],
      },
      reason: 'Strong copyleft incompatible with MIT proprietary',
      contaminationPath: ['dep1', 'dep2', 'gpl-package'],
      fixes: [],
    };

    const scanResult: ScanResult = {
      scanId: 'test-5',
      timestamp: new Date().toISOString(),
      projectLicense: 'MIT',
      riskScore: 15,
      summary: {
        totalDependencies: 200,
        conflicts: 1,
        critical: 1,
        high: 0,
        medium: 0,
        low: 0,
      },
      conflicts: [conflict],
    };

    const fixes = fixGenerator.generateFixes(scanResult);
    expect(fixes[0].description).toContain('CRITICAL');
    expect(fixes[0].description).toContain('gpl-package');
    expect(fixes[0].description).toContain('Automated License Conflict Fix');
  });
});

describe('LicenseFixDatabase', () => {
  const licenseFixDb = new LicenseFixDatabase();

  it('should find alternatives for GPL-3.0', async () => {
    const result = await licenseFixDb.findAlternatives('some-gpl-package', 'GPL-3.0');
    expect(result.originalLicense).toBe('GPL-3.0');
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it('should find alternatives for GPL-2.0', async () => {
    const result = await licenseFixDb.findAlternatives('some-gpl-package', 'GPL-2.0');
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.alternatives[0].license).not.toContain('GPL');
  });

  it('should find alternatives for AGPL-3.0', async () => {
    const result = await licenseFixDb.findAlternatives('some-agpl-package', 'AGPL-3.0');
    expect(result.alternatives.length).toBeGreaterThan(0);
  });

  it('should return quality metadata for alternatives', async () => {
    const result = await licenseFixDb.findAlternatives('some-package', 'LGPL-3.0');
    const alternative = result.alternatives[0];
    expect(alternative.quality).toMatch(/production|stable|experimental/);
    expect(alternative.downloads).toBeGreaterThan(0);
  });

  it('should handle unknown licenses gracefully', async () => {
    const result = await licenseFixDb.findAlternatives('package', 'UNKNOWN-LICENSE');
    expect(result.alternatives).toEqual([]);
    expect(result.originalLicense).toBe('UNKNOWN-LICENSE');
  });
});

