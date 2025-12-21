import { describe, it, expect } from 'vitest';
import { ConflictDetector } from '../src/engine/conflict-detector';
import { compatibilityMatrix } from '../src/engine/compatibility-matrix';
import type { DependencyNode, ProjectConfig } from '../src/types';

describe('Edge Cases', () => {
  describe('Empty and minimal projects', () => {
    it('should handle empty dependency tree', () => {
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
        children: [],
      };

      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      expect(result.summary.totalDependencies).toBe(0);
      expect(result.summary.conflicts).toBe(0);
      expect(result.riskScore).toBe(100);
    });

    it('should handle single dependency', () => {
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
          name: 'lodash',
          version: '4.17.21',
          license: 'MIT',
          depth: 1,
          path: ['my-project', 'lodash'],
          children: [],
        }],
      };

      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      expect(result.summary.totalDependencies).toBe(1);
      expect(result.summary.conflicts).toBe(0);
    });
  });

  describe('Unknown and missing licenses', () => {
    it('should handle UNKNOWN license gracefully', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'UNKNOWN',
        'static',
        'proprietary'
      );

      // Unknown should be compatible with warning
      expect(result.compatible).toBe(true);
      expect(result.isHeuristic).toBe(true);
    });

    it('should handle empty string license', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        '',
        'static',
        'proprietary'
      );

      expect(result.isHeuristic).toBe(true);
    });

    it('should handle custom/non-SPDX license', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'CUSTOM-LICENSE-1.0',
        'static',
        'proprietary'
      );

      expect(result.isHeuristic).toBe(true);
      expect(result.reason).toContain('not in the database');
    });
  });

  describe('Dual licensing', () => {
    it('should handle dual license with OR', () => {
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
          name: 'dual-pkg',
          version: '1.0.0',
          license: 'MIT OR GPL-3.0',
          depth: 1,
          path: ['my-project', 'dual-pkg'],
          children: [],
        }],
      };

      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      // Should pick MIT (compatible) over GPL-3.0
      expect(result.summary.conflicts).toBe(0);
    });

    it('should handle license array format', () => {
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
          name: 'multi-pkg',
          version: '1.0.0',
          license: ['MIT', 'Apache-2.0'],
          depth: 1,
          path: ['my-project', 'multi-pkg'],
          children: [],
        }],
      };

      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      expect(result.summary.conflicts).toBe(0);
    });
  });

  describe('Deep dependency trees', () => {
    it('should handle deeply nested dependencies', () => {
      const config: ProjectConfig = {
        projectLicense: 'MIT',
        distributionModel: 'proprietary',
        linkingModel: 'static',
      };

      // Create a tree 10 levels deep
      const buildDeepTree = (depth: number, maxDepth: number): DependencyNode => ({
        name: `pkg-level-${depth}`,
        version: '1.0.0',
        license: 'MIT',
        depth,
        path: Array.from({ length: depth + 1 }, (_, i) => `pkg-level-${i}`),
        children: depth < maxDepth ? [buildDeepTree(depth + 1, maxDepth)] : [],
      });

      const root = buildDeepTree(0, 10);
      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      expect(result.summary.totalDependencies).toBe(10);
      expect(result.summary.conflicts).toBe(0);
    });

    it('should handle wide dependency tree (many siblings)', () => {
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
        children: Array.from({ length: 50 }, (_, i) => ({
          name: `dep-${i}`,
          version: '1.0.0',
          license: 'MIT',
          depth: 1,
          path: ['my-project', `dep-${i}`],
          children: [],
        })),
      };

      const detector = new ConflictDetector(config);
      const result = detector.scan(root);

      expect(result.summary.totalDependencies).toBe(50);
      expect(result.summary.conflicts).toBe(0);
    });
  });

  describe('Strict mode', () => {
    it('should reject unknown license combination in strict mode', () => {
      const result = compatibilityMatrix.isCompatible(
        'BSD-2-Clause',
        'MPL-1.1',
        'runtime',
        'internal-only',
        true // strict mode
      );

      // No explicit rule exists for this combination
      expect(result.compatible).toBe(false);
      expect(result.ruleId).toBe('STRICT_MODE_VIOLATION');
    });

    it('should allow explicit rules in strict mode', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'MIT',
        'static',
        'proprietary',
        true // strict mode
      );

      // Explicit rule exists
      expect(result.compatible).toBe(true);
      expect(result.isHeuristic).toBe(false);
    });
  });

  describe('Distribution model variations', () => {
    it('should handle SaaS distribution model', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'GPL-3.0',
        'static',
        'saas'
      );

      // GPL-3.0 doesn't require disclosure for SaaS (no distribution)
      expect(result.compatible).toBe(true);
    });

    it('should handle internal-only distribution', () => {
      const config: ProjectConfig = {
        projectLicense: 'MIT',
        distributionModel: 'internal-only',
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

      // Internal-only might have different rules - testing current behavior
      expect(result.summary.totalDependencies).toBe(1);
    });
  });

  describe('Linking model variations', () => {
    it('should allow LGPL with dynamic linking', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'LGPL-2.1',
        'dynamic',
        'proprietary'
      );

      expect(result.compatible).toBe(true);
    });

    it('should block LGPL with static linking for proprietary', () => {
      const result = compatibilityMatrix.isCompatible(
        'MIT',
        'LGPL-2.1',
        'static',
        'proprietary'
      );

      expect(result.compatible).toBe(false);
      expect(result.severity).toBe('HIGH');
    });

    it('should handle microservice architecture', () => {
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

