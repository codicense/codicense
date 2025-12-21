/**
 * Fix-First Engine Tests
 * 
 * Tests for fix generation strategies.
 */

import { describe, it, expect } from 'vitest';
import { FixFirstEngine } from '../../src/ili/fix-first-engine';

describe('FixFirstEngine', () => {
  const engine = new FixFirstEngine();

  describe('Replacement Fixes', () => {
    it('should suggest replacing GPL with permissive alternative', () => {
      const fixes = engine.generateFixes('gpl-library', 'GPL-3.0', 'UNLICENSED');
      
      const replaceFix = fixes.find((f) => f.strategy === 'replace');
      expect(replaceFix).toBeDefined();
      expect(replaceFix?.effort).toBe('low');
      expect(replaceFix?.description).toContain('alternative');
    });

    it('should suggest replacing AGPL with permissive alternative', () => {
      const fixes = engine.generateFixes('agpl-lib', 'AGPL-3.0', 'MIT');
      
      const replaceFix = fixes.find((f) => f.strategy === 'replace');
      expect(replaceFix).toBeDefined();
      expect(replaceFix?.implementation).toBeDefined();
    });

    it('should include implementation steps', () => {
      const fixes = engine.generateFixes('test-lib', 'GPL-2.0', 'Apache-2.0');
      
      const replaceFix = fixes.find((f) => f.strategy === 'replace');
      expect(replaceFix?.implementation).toContain('npm');
    });
  });

  describe('Isolation Fixes', () => {
    it('should suggest isolating GPL code via microservice', () => {
      const fixes = engine.generateFixes('gpl-service', 'GPL-3.0', 'UNLICENSED');
      
      const isolateFix = fixes.find((f) => f.strategy === 'isolate');
      expect(isolateFix).toBeDefined();
      expect(isolateFix?.effort).toBe('medium');
      expect(isolateFix?.description).toContain('microservice');
    });

    it('should suggest dual licensing', () => {
      const fixes = engine.generateFixes('dual-lib', 'GPL-3.0 OR MIT', 'Apache-2.0');
      
      const dualFix = fixes.find((f) => f.strategy === 'dual-license');
      expect(dualFix).toBeDefined();
      expect(dualFix?.effort).toBe('low');
    });

    it('should include tradeoffs for isolation', () => {
      const fixes = engine.generateFixes('complex-lib', 'AGPL-3.0', 'MIT');
      
      const isolateFix = fixes.find((f) => f.strategy === 'isolate');
      expect(isolateFix?.tradeoffs).toContain('Adds deployment complexity');
    });
  });

  describe('Removal Fixes', () => {
    it('should suggest removing dependency', () => {
      const fixes = engine.generateFixes('optional-lib', 'GPL-3.0', 'UNLICENSED');
      
      const removeFix = fixes.find((f) => f.strategy === 'remove');
      expect(removeFix).toBeDefined();
      expect(removeFix?.effort).toBe('high');
    });

    it('should warn about functionality loss', () => {
      const fixes = engine.generateFixes('critical-lib', 'AGPL-3.0', 'MIT');
      
      const removeFix = fixes.find((f) => f.strategy === 'remove');
      expect(removeFix?.tradeoffs).toContain('Lose functionality');
    });
  });

  describe('Boundary Refactor Fixes', () => {
    it('should suggest refactoring for LGPL', () => {
      const fixes = engine.generateFixes('lgpl-lib', 'LGPL-3.0', 'UNLICENSED');
      
      const refactorFix = fixes.find((f) => f.strategy === 'boundary-refactor');
      expect(refactorFix).toBeDefined();
      expect(refactorFix?.effort).toBe('high');
    });

    it('should explain dynamic linking approach', () => {
      const fixes = engine.generateFixes('lgpl-component', 'LGPL-2.1', 'Apache-2.0');
      
      const refactorFix = fixes.find((f) => f.strategy === 'boundary-refactor');
      expect(refactorFix?.implementation).toContain('plugin');
    });
  });

  describe('Fix Prioritization', () => {
    it('should prioritize low-effort fixes first', () => {
      const fixes = engine.generateFixes('test-lib', 'GPL-3.0', 'UNLICENSED');
      
      expect(fixes[0].effort).toBe('low');
      expect(fixes[fixes.length - 1].effort).toBe('high');
    });

    it('should provide multiple fix options', () => {
      const fixes = engine.generateFixes('complex-lib', 'AGPL-3.0', 'MIT');
      
      expect(fixes.length).toBeGreaterThanOrEqual(3);
    });

    it('should include estimated time for each fix', () => {
      const fixes = engine.generateFixes('test-lib', 'GPL-3.0', 'Apache-2.0');
      
      fixes.forEach((fix) => {
        if (fix.effort === 'low') {
          expect(fix.estimatedTime).toContain('minutes');
        } else if (fix.effort === 'high') {
          expect(fix.estimatedTime).toContain('hours');
        }
      });
    });
  });

  describe('License-Specific Fixes', () => {
    it('should suggest upgrade for GPL-2.0 to GPL-3.0', () => {
      const fixes = engine.generateFixes('old-gpl', 'GPL-2.0', 'GPL-3.0');
      
      const upgradeFix = fixes.find((f) => f.strategy === 'upgrade');
      expect(upgradeFix).toBeDefined();
    });

    it('should handle MPL file-level copyleft', () => {
      const fixes = engine.generateFixes('mpl-lib', 'MPL-2.0', 'UNLICENSED');
      
      const isolateFix = fixes.find((f) => f.strategy === 'isolate');
      expect(isolateFix?.description).toContain('file');
    });

    it('should handle permissive license conflicts (rare)', () => {
      const fixes = engine.generateFixes('bsd-lib', 'BSD-4-Clause', 'GPL-3.0');
      
      expect(fixes.length).toBeGreaterThan(0);
      expect(fixes[0].strategy).toBe('replace');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown licenses', () => {
      const fixes = engine.generateFixes('unknown-lib', 'UNKNOWN', 'MIT');
      
      expect(fixes.length).toBeGreaterThan(0);
      expect(fixes[0].description).toBeDefined();
    });

    it('should handle identical licenses (no conflict)', () => {
      const fixes = engine.generateFixes('mit-lib', 'MIT', 'MIT');
      
      expect(fixes.length).toBeGreaterThan(0);
    });

    it('should handle missing project license', () => {
      const fixes = engine.generateFixes('test-lib', 'GPL-3.0', undefined);
      
      expect(fixes.length).toBeGreaterThan(0);
    });
  });

  describe('Implementation Details', () => {
    it('should provide npm install commands', () => {
      const fixes = engine.generateFixes('test-lib', 'GPL-3.0', 'MIT');
      
      const replaceFix = fixes.find((f) => f.strategy === 'replace');
      expect(replaceFix?.implementation).toMatch(/npm (uninstall|install)/);
    });

    it('should provide code examples for isolation', () => {
      const fixes = engine.generateFixes('service-lib', 'AGPL-3.0', 'UNLICENSED');
      
      const isolateFix = fixes.find((f) => f.strategy === 'isolate');
      expect(isolateFix?.implementation).toContain('API');
    });

    it('should provide tradeoffs for each strategy', () => {
      const fixes = engine.generateFixes('test-lib', 'GPL-3.0', 'Apache-2.0');
      
      fixes.forEach((fix) => {
        expect(fix.tradeoffs.length).toBeGreaterThan(0);
      });
    });
  });
});

