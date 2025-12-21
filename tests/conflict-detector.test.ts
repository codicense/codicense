import { describe, it, expect } from 'vitest';
import { ConflictDetector } from '../src/engine/conflict-detector';
import type { DependencyNode, ProjectConfig } from '../src/types';

describe('Conflict Detector (End-to-End)', () => {
  const createMockDependencyTree = (): DependencyNode => {
    return {
      name: 'my-app',
      version: '1.0.0',
      license: 'MIT',
      depth: 0,
      path: ['my-app'],
      children: [
        {
          name: 'express',
          version: '4.18.0',
          license: 'MIT',
          depth: 1,
          path: ['my-app', 'express'],
          children: [
            {
              name: 'body-parser',
              version: '1.20.0',
              license: 'MIT',
              depth: 2,
              path: ['my-app', 'express', 'body-parser'],
              children: [],
            },
          ],
        },
        {
          name: 'lodash',
          version: '4.17.21',
          license: 'MIT',
          depth: 1,
          path: ['my-app', 'lodash'],
          children: [],
        },
      ],
    };
  };

  const createGPLContaminatedTree = (): DependencyNode => {
    return {
      name: 'my-app',
      version: '1.0.0',
      license: 'MIT',
      depth: 0,
      path: ['my-app'],
      children: [
        {
          name: 'express',
          version: '4.18.0',
          license: 'MIT',
          depth: 1,
          path: ['my-app', 'express'],
          children: [
            {
              name: 'some-gpl-lib',
              version: '2.1.0',
              license: 'GPL-3.0',
              depth: 2,
              path: ['my-app', 'express', 'some-gpl-lib'],
              children: [],
            },
          ],
        },
      ],
    };
  };

  it('should detect no conflicts in clean project', () => {
    const config: ProjectConfig = {
      projectLicense: 'MIT',
      distributionModel: 'proprietary',
      linkingModel: 'static',
    };

    const detector = new ConflictDetector(config);
    const tree = createMockDependencyTree();
    const result = detector.scan(tree);

    expect(result.summary.conflicts).toBe(0);
    expect(result.riskScore).toBe(100);
    expect(result.conflicts).toHaveLength(0);
  });

  it('should detect GPL contamination', () => {
    const config: ProjectConfig = {
      projectLicense: 'MIT',
      distributionModel: 'proprietary',
      linkingModel: 'static',
    };

    const detector = new ConflictDetector(config);
    const tree = createGPLContaminatedTree();
    const result = detector.scan(tree);

    expect(result.summary.conflicts).toBeGreaterThan(0);
    expect(result.summary.critical).toBe(1);
    expect(result.riskScore).toBeLessThan(100);

    const conflict = result.conflicts[0];
    expect(conflict.severity).toBe('CRITICAL');
    expect(conflict.dependency.name).toBe('some-gpl-lib');
    expect(conflict.dependency.license).toBe('GPL-3.0');
    expect(conflict.reason).toContain('GPL-3.0');
    expect(conflict.contaminationPath).toContain('some-gpl-lib (GPL-3.0) ← CONFLICT');
  });

  it('should provide fix suggestions for GPL conflicts', () => {
    const config: ProjectConfig = {
      projectLicense: 'MIT',
      distributionModel: 'proprietary',
      linkingModel: 'static',
    };

    const detector = new ConflictDetector(config);
    const tree = createGPLContaminatedTree();
    const result = detector.scan(tree);

    const conflict = result.conflicts[0];
    expect(conflict.fixes).toBeDefined();
    expect(conflict.fixes.length).toBeGreaterThan(0);

    const hasSuggestion = conflict.fixes.some(
      (fix) => fix.type === 'replace' || fix.type === 'architectural'
    );
    expect(hasSuggestion).toBe(true);
  });

  it('should handle dual-licensed dependencies correctly', () => {
    const config: ProjectConfig = {
      projectLicense: 'MIT',
      distributionModel: 'proprietary',
      linkingModel: 'static',
    };

    const tree: DependencyNode = {
      name: 'my-app',
      version: '1.0.0',
      license: 'MIT',
      depth: 0,
      path: ['my-app'],
      children: [
        {
          name: 'dual-licensed-lib',
          version: '1.0.0',
          license: 'MIT OR Apache-2.0', // Both are permissive
          depth: 1,
          path: ['my-app', 'dual-licensed-lib'],
          children: [],
        },
      ],
    };

    const detector = new ConflictDetector(config);
    const result = detector.scan(tree);

    // Should not conflict because MIT is compatible
    expect(result.summary.conflicts).toBe(0);
  });

  it('should calculate risk score correctly', () => {
    const config: ProjectConfig = {
      projectLicense: 'MIT',
      distributionModel: 'proprietary',
      linkingModel: 'static',
    };

    const detector = new ConflictDetector(config);
    const cleanTree = createMockDependencyTree();
    const dirtyTree = createGPLContaminatedTree();

    const cleanResult = detector.scan(cleanTree);
    const dirtyResult = detector.scan(dirtyTree);

    expect(cleanResult.riskScore).toBe(100);
    expect(dirtyResult.riskScore).toBeLessThan(cleanResult.riskScore);
    expect(dirtyResult.riskScore).toBeGreaterThanOrEqual(0);
  });

  it('should include scan metadata', () => {
    const config: ProjectConfig = {
      projectLicense: 'MIT',
      distributionModel: 'proprietary',
      linkingModel: 'static',
    };

    const detector = new ConflictDetector(config);
    const tree = createMockDependencyTree();
    const result = detector.scan(tree);

    expect(result.scanId).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.projectLicense).toBe('MIT');
    expect(result.summary.totalDependencies).toBe(3); // express, body-parser, lodash
  });
});

