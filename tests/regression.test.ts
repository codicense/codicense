import { describe, it, expect } from 'vitest';
import { compatibilityMatrix } from '../src/engine/compatibility-matrix';

describe('Compatibility Matrix Regression Tests', () => {
  describe('GPL family consistency', () => {
    const gplLicenses = ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0'];
    const proprietaryProjects = ['MIT', 'Apache-2.0', 'BSD-3-Clause'];

    for (const gpl of gplLicenses) {
      for (const proj of proprietaryProjects) {
        it(`should block ${gpl} with proprietary ${proj} (static)`, () => {
          const result = compatibilityMatrix.isCompatible(
            proj,
            gpl,
            'static',
            'proprietary'
          );

          expect(result.compatible).toBe(false);
          expect(['CRITICAL', 'HIGH']).toContain(result.severity);
        });
      }
    }
  });

  describe('LGPL dynamic linking consistency', () => {
    const lgplLicenses = ['LGPL-2.1', 'LGPL-3.0'];
    const projects = ['MIT', 'Apache-2.0'];

    for (const lgpl of lgplLicenses) {
      for (const proj of projects) {
        it(`should allow ${lgpl} with ${proj} (dynamic linking)`, () => {
          const result = compatibilityMatrix.isCompatible(
            proj,
            lgpl,
            'dynamic',
            'proprietary'
          );

          expect(result.compatible).toBe(true);
        });
      }
    }
  });

  describe('Permissive license cross-compatibility', () => {
    const permissive = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'];

    for (const proj of permissive) {
      for (const dep of permissive) {
        it(`should allow ${dep} in ${proj} project`, () => {
          const result = compatibilityMatrix.isCompatible(
            proj,
            dep,
            'static',
            'proprietary'
          );

          expect(result.compatible).toBe(true);
          expect(result.severity).toBe('LOW');
        });
      }
    }
  });

  describe('Public domain licenses', () => {
    const publicDomain = ['Unlicense', 'CC0-1.0', '0BSD'];

    for (const license of publicDomain) {
      it(`should allow ${license} with MIT`, () => {
        const result = compatibilityMatrix.isCompatible(
          'MIT',
          license,
          'static',
          'proprietary'
        );

        // Public domain should always be compatible
        expect(result.compatible).toBe(true);
      });
    }
  });

  describe('SaaS distribution model', () => {
    it('should allow GPL-3.0 for SaaS (no distribution)', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'GPL-3.0',
        'static',
        'saas'
      );

      expect(result.compatible).toBe(true);
    });

    it('should block AGPL-3.0 for SaaS', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'AGPL-3.0',
        'static',
        'saas'
      );

      expect(result.compatible).toBe(false);
      expect(result.severity).toBe('CRITICAL');
    });
  });

  describe('MPL-2.0 file-level copyleft', () => {
    it('should allow MPL-2.0 with proprietary (file-level copyleft)', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'MPL-2.0',
        'static',
        'proprietary'
      );

      expect(result.compatible).toBe(true);
      expect(['LOW', 'MEDIUM']).toContain(result.severity);
    });
  });

  describe('Open source distribution', () => {
    it('should allow MIT in GPL-3.0 open source project', () => {
      const result = compatibilityMatrix.isCompatible(
        'GPL-3.0',
        'MIT',
        'static',
        'open-source'
      );

      expect(result.compatible).toBe(true);
    });

    it('should allow Apache-2.0 in GPL-3.0 open source project', () => {
      const result = compatibilityMatrix.isCompatible(
        'GPL-3.0',
        'Apache-2.0',
        'static',
        'open-source'
      );

      expect(result.compatible).toBe(true);
    });

    it('should block Apache-2.0 in GPL-2.0 project', () => {
      const result = compatibilityMatrix.isCompatible(
        'GPL-2.0',
        'Apache-2.0',
        'static',
        'open-source'
      );

      expect(result.compatible).toBe(false);
    });
  });

  describe('Microservice architecture', () => {
    it('should allow GPL-3.0 in microservice architecture', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'GPL-3.0',
        'microservice',
        'proprietary'
      );

      expect(result.compatible).toBe(true);
    });
  });
});

describe('Rule Count Validation', () => {
  it('should have at least 77 explicit rules', () => {
    const rules = compatibilityMatrix.getAllRules();
    expect(rules.length).toBeGreaterThanOrEqual(77);
  });

  it('should have rules with IDs', () => {
    const rules = compatibilityMatrix.getAllRules();
    const rulesWithIds = rules.filter(r => r.id);
    
    // At least some rules should have IDs
    expect(rulesWithIds.length).toBeGreaterThan(0);
  });

  it('should have rules with SPDX references', () => {
    const rules = compatibilityMatrix.getAllRules();
    const rulesWithRefs = rules.filter(r => r.spdxRef);
    
    // At least some rules should have SPDX refs
    expect(rulesWithRefs.length).toBeGreaterThan(0);
  });
});

