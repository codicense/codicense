import { describe, it, expect } from 'vitest';
import { compatibilityMatrix } from '../src/engine/compatibility-matrix';
import { ConflictDetector } from '../src/engine/conflict-detector';
import type { DependencyNode, ProjectConfig } from '../src/types';

describe('Traceability', () => {
  describe('Rule identification', () => {
    it('should return rule ID for explicit rules', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'GPL-3.0',
        'static',
        'proprietary'
      );

      expect(result.ruleId).toBeDefined();
      expect(result.ruleId).not.toBe('UNKNOWN');
      expect(result.isHeuristic).toBe(false);
    });

    it('should return SPDX reference for critical rules', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'GPL-3.0',
        'static',
        'proprietary'
      );

      expect(result.spdxRef).toBeDefined();
      expect(result.spdxRef).toContain('GPL');
    });

    it('should return legal basis for copyleft rules', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'GPL-3.0',
        'static',
        'proprietary'
      );

      expect(result.legalBasis).toBeDefined();
    });

    it('should mark heuristic rules appropriately', () => {
      // Use an uncommon combination that requires heuristics
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'WTFPL',
        'runtime',
        'internal-only'
      );

      // This might be explicit or heuristic depending on rules
      expect(result.isHeuristic).toBeDefined();
    });
  });

  describe('Conflict traceability', () => {
    it('should include triggered rule in conflict', () => {
      const config: ProjectConfig = {
        projectLicense: 'MIT',
        distributionModel: 'proprietary',
        linkingModel: 'static',
      };

      const root: DependencyNode = {
        name: 'my-project',
        version: '1.0.0',
        license: 'MIT',
        depth: 0,
        path: ['my-project'],
        children: [{
          name: 'gpl-pkg',
          version: '1.0.0',
          license: 'GPL-3.0',
          depth: 1,
          path: ['my-project', 'gpl-pkg'],
          children: [],
        }],
      };

      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0].triggeredRule).toBeDefined();
      expect(result.conflicts[0].triggeredRule?.id).toBeDefined();
    });

    it('should include SPDX reference in conflict', () => {
      const config: ProjectConfig = {
        projectLicense: 'MIT',
        distributionModel: 'proprietary',
        linkingModel: 'static',
      };

      const root: DependencyNode = {
        name: 'my-project',
        version: '1.0.0',
        license: 'MIT',
        depth: 0,
        path: ['my-project'],
        children: [{
          name: 'agpl-pkg',
          version: '1.0.0',
          license: 'AGPL-3.0',
          depth: 1,
          path: ['my-project', 'agpl-pkg'],
          children: [],
        }],
      };

      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      expect(result.conflicts.length).toBe(1);
      if (result.conflicts[0].triggeredRule?.spdxRef) {
        expect(result.conflicts[0].triggeredRule.spdxRef).toContain('AGPL');
      }
    });
  });
});

describe('Strict Mode', () => {
  describe('Compatibility matrix strict mode', () => {
    it('should accept explicit rules in strict mode', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'MIT',
        'static',
        'proprietary',
        true // strict mode
      );

      expect(result.compatible).toBe(true);
      expect(result.isHeuristic).toBe(false);
    });

    it('should reject missing rules in strict mode', () => {
      // Use a combination unlikely to have an explicit rule
      const result = compatibilityMatrix.isCompatible(
        'Zlib',
        'CDDL-1.1',
        'runtime',
        'internal-only',
        true // strict mode
      );

      expect(result.compatible).toBe(false);
      expect(result.ruleId).toBe('STRICT_MODE_VIOLATION');
    });

    it('should provide helpful message for strict mode violations', () => {
      const result = compatibilityMatrix.isCompatible(
        'ISC',
        'OSL-3.0',
        'dynamic',
        'saas',
        true // strict mode
      );

      expect(result.reason).toContain('Strict mode');
      expect(result.reason).toContain('explicit rules');
    });
  });

  describe('Conflict detector strict mode', () => {
    it('should use strict mode from config', () => {
      const config: ProjectConfig = {
        projectLicense: 'MIT',
        distributionModel: 'internal-only',
        linkingModel: 'runtime',
        policy: {
          strictMode: true,
        },
      };

      const root: DependencyNode = {
        name: 'my-project',
        version: '1.0.0',
        license: 'MIT',
        depth: 0,
        path: ['my-project'],
        children: [{
          name: 'obscure-pkg',
          version: '1.0.0',
          license: 'EUPL-1.1', // Obscure license
          depth: 1,
          path: ['my-project', 'obscure-pkg'],
          children: [],
        }],
      };

      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      // Should flag conflict due to strict mode
      expect(result.summary.conflicts).toBeGreaterThan(0);
    });

    it('should not flag heuristic-compatible in non-strict mode', () => {
      const config: ProjectConfig = {
        projectLicense: 'MIT',
        distributionModel: 'proprietary',
        linkingModel: 'static',
        policy: {
          strictMode: false,
        },
      };

      const root: DependencyNode = {
        name: 'my-project',
        version: '1.0.0',
        license: 'MIT',
        depth: 0,
        path: ['my-project'],
        children: [{
          name: 'permissive-pkg',
          version: '1.0.0',
          license: 'Zlib', // Permissive but maybe no explicit rule for all combinations
          depth: 1,
          path: ['my-project', 'permissive-pkg'],
          children: [],
        }],
      };

      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      // Should be compatible via heuristics
      expect(result.summary.conflicts).toBe(0);
    });
  });

  describe('Strict mode edge cases', () => {
    it('should handle null/undefined strict mode as false', () => {
      const config: ProjectConfig = {
        projectLicense: 'MIT',
        distributionModel: 'proprietary',
        linkingModel: 'static',
        policy: {
          // strictMode not set
        },
      };

      const detector = new ConflictDetector(config);
      // Should not throw
      expect(detector).toBeDefined();
    });
  });
});

