import { describe, it, expect } from 'vitest';
import { compatibilityMatrix } from '../src/engine/compatibility-matrix';

describe('Compatibility Matrix', () => {
  describe('Permissive licenses', () => {
    it('should allow MIT with MIT', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'MIT',
        'static',
        'proprietary'
      );
      expect(result.compatible).toBe(true);
      expect(result.severity).toBe('LOW');
    });

    it('should allow MIT with Apache-2.0', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'Apache-2.0',
        'static',
        'proprietary'
      );
      expect(result.compatible).toBe(true);
    });

    it('should allow MIT with BSD', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'BSD-3-Clause',
        'static',
        'proprietary'
      );
      expect(result.compatible).toBe(true);
    });
  });

  describe('GPL conflicts', () => {
    it('should block GPL-3.0 with proprietary MIT (static linking)', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'GPL-3.0',
        'static',
        'proprietary'
      );
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe('CRITICAL');
      expect(result.reason).toContain('GPL-3.0');
    });

    it('should block GPL-2.0 with proprietary MIT', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'GPL-2.0',
        'static',
        'proprietary'
      );
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe('CRITICAL');
    });

    it('should allow GPL-3.0 in microservice architecture', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'GPL-3.0',
        'microservice',
        'proprietary'
      );
      // The rule exists and should allow it
      expect(result.compatible).toBe(true);
      expect(result.severity).toBe('LOW');
    });
  });

  describe('AGPL conflicts', () => {
    it('should block AGPL-3.0 with proprietary MIT', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'AGPL-3.0',
        'static',
        'proprietary'
      );
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe('CRITICAL');
    });

    it('should block AGPL-3.0 even for SaaS', () => {
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

  describe('LGPL (weak copyleft)', () => {
    it('should allow LGPL-3.0 with dynamic linking', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'LGPL-3.0',
        'dynamic',
        'proprietary'
      );
      expect(result.compatible).toBe(true);
      expect(result.severity).toBe('LOW');
    });

    it('should flag LGPL-3.0 with static linking as HIGH risk', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'LGPL-2.1',
        'static',
        'proprietary'
      );
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe('HIGH');
    });
  });

  describe('MPL (file-level copyleft)', () => {
    it('should allow MPL-2.0 with proprietary code', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'MPL-2.0',
        'static',
        'proprietary'
      );
      expect(result.compatible).toBe(true);
      expect(result.severity).toBe('MEDIUM');
    });
  });

  describe('GPL projects (open-source)', () => {
    it('should allow MIT dependencies in GPL-3.0 projects', () => {
      const result = compatibilityMatrix.isCompatible(
        'GPL-3.0',
        'MIT',
        'static',
        'open-source'
      );
      expect(result.compatible).toBe(true);
    });

    it('should allow Apache-2.0 in GPL-3.0 projects', () => {
      const result = compatibilityMatrix.isCompatible(
        'GPL-3.0',
        'Apache-2.0',
        'static',
        'open-source'
      );
      expect(result.compatible).toBe(true);
    });

    it('should block Apache-2.0 in GPL-2.0 projects', () => {
      const result = compatibilityMatrix.isCompatible(
        'GPL-2.0',
        'Apache-2.0',
        'static',
        'open-source'
      );
      expect(result.compatible).toBe(false);
      expect(result.severity).toBe('HIGH');
    });
  });

  describe('Rule coverage', () => {
    it('should have at least 50 explicit compatibility rules', () => {
      const rules = compatibilityMatrix.getAllRules();
      expect(rules.length).toBeGreaterThanOrEqual(50);
    });

    it('should have at least 70 rules for comprehensive coverage', () => {
      const rules = compatibilityMatrix.getAllRules();
      expect(rules.length).toBeGreaterThanOrEqual(70);
    });
  });
});

