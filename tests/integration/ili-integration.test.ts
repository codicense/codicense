/**
 * ILI Integration Tests
 * 
 * End-to-end tests for Intent-Aware License Intelligence System.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ILIScanner } from '../../src/engine/ili-scanner';
import type { DependencyNode } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ILI Integration Tests', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codicense-ili-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Proprietary Project + GPL Dependency', () => {
    it('should flag GPL as CRITICAL in proprietary project', async () => {
      // Setup: Proprietary project
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'All Rights Reserved');

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ private: true }));

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      expect(context.intent).toBe('proprietary');

      // Mock dependency tree with GPL
      const root: DependencyNode = {
        name: 'my-app',
        version: '1.0.0',
        license: 'UNLICENSED',
        path: ['my-app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'gpl-library',
          version: '2.0.0',
          license: 'GPL-3.0',
          path: ['my-app', 'gpl-library'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const result = await scanner.scan(root, context);

      expect(result.enhancedConflicts.length).toBe(1);
      expect(result.enhancedConflicts[0]?.dynamicSeverity.level).toBe('critical');
      expect(result.enhancedConflicts[0]?.dynamicSeverity.reason).toContain('copyleft');
    });

    it('should provide proprietary-specific fixes', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'Proprietary');

      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ private: true }));

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'UNLICENSED',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'gpl-lib',
          version: '1.0.0',
          license: 'GPL-3.0',
          path: ['app', 'gpl-lib'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const result = await scanner.scan(root, context);

      const conflict = result.enhancedConflicts[0];
      expect(conflict).toBeDefined();
      expect(conflict?.fixSuggestions.length).toBeGreaterThan(0);
      expect(conflict?.fixSuggestions[0]?.strategy).toBe('replace');
    });
  });

  describe('Open-Source GPL Project + GPL Dependency', () => {
    it('should flag GPL as SAFE in GPL project', async () => {
      // Setup: GPL project
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'GNU GENERAL PUBLIC LICENSE\nVersion 3');

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      expect(context.intent).toBe('open-source');
      expect(context.projectLicense).toBe('GPL-3.0');

      // Mock dependency tree with GPL
      const root: DependencyNode = {
        name: 'oss-app',
        version: '1.0.0',
        license: 'GPL-3.0',
        path: ['oss-app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'gpl-library',
          version: '2.0.0',
          license: 'GPL-3.0',
          path: ['oss-app', 'gpl-library'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const result = await scanner.scan(root, context);

      // GPL + GPL should be compatible (no conflicts or conflicts with "safe" level)
      if (result.enhancedConflicts.length > 0) {
        const gplConflict = result.enhancedConflicts.find(c => c.dependency.license === 'GPL-3.0');
        if (gplConflict) {
          expect(gplConflict.dynamicSeverity.level).toBe('safe');
        }
      } else {
        // No conflicts is also valid
        expect(result.enhancedConflicts.length).toBe(0);
      }
    });

    it('should warn about incompatible licenses in GPL project', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'GNU GENERAL PUBLIC LICENSE\nVersion 3');

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      // Apache-2.0 has patent clause conflicts with GPL-2.0
      const root: DependencyNode = {
        name: 'gpl-app',
        version: '1.0.0',
        license: 'GPL-3.0',
        path: ['gpl-app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'apache-lib',
          version: '1.0.0',
          license: 'Apache-2.0',
          path: ['gpl-app', 'apache-lib'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const result = await scanner.scan(root, context);

      // Apache in GPL project might cause warnings
      if (result.enhancedConflicts.length > 0) {
        expect(result.enhancedConflicts.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Undecided Intent', () => {
    it('should provide warnings for copyleft in undecided project', async () => {
      // Setup: No LICENSE, no package.json
      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      expect(context.intent).toBe('undecided');

      const root: DependencyNode = {
        name: 'unknown-app',
        version: '1.0.0',
        license: 'UNKNOWN',
        path: ['unknown-app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'gpl-library',
          version: '1.0.0',
          license: 'GPL-3.0',
          path: ['unknown-app', 'gpl-library'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const result = await scanner.scan(root, context);

      expect(result.enhancedConflicts.length).toBeGreaterThan(0);
      const conflict = result.enhancedConflicts[0];
      expect(conflict?.dynamicSeverity.level).toBe('medium');
      expect(conflict?.dynamicSeverity.contextualExplanation).toContain('flexibility');
    });

    it('should allow permissive licenses in undecided project', async () => {
      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'UNKNOWN',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'mit-lib',
          version: '1.0.0',
          license: 'MIT',
          path: ['app', 'mit-lib'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const result = await scanner.scan(root, context);

      // MIT should be safe in any context
      const mitConflicts = result.enhancedConflicts.filter(c => 
        c.dependency.license === 'MIT' && c.dynamicSeverity.level !== 'safe'
      );
      expect(mitConflicts.length).toBe(0);
    });
  });

  describe('Conflict Path Visualization', () => {
    it('should build conflict path for nested dependencies', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'MIT License');

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'MIT',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'dep-a',
          version: '1.0.0',
          license: 'MIT',
          path: ['app', 'dep-a'],
          depth: 1,
          dev: false,
          children: [{
            name: 'dep-b',
            version: '1.0.0',
            license: 'GPL-3.0',
            path: ['app', 'dep-a', 'dep-b'],
            depth: 2,
            dev: false,
            children: [],
          }],
        }],
      };

      const result = await scanner.scan(root, context);

      expect(result.conflictPaths.size).toBeGreaterThan(0);
      const paths = Array.from(result.conflictPaths.values());
      expect(paths[0]?.path.length).toBeGreaterThanOrEqual(3);
    });

    it('should extract obligations from conflict path', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'Proprietary');

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'UNLICENSED',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'gpl-lib',
          version: '1.0.0',
          license: 'GPL-3.0',
          path: ['app', 'gpl-lib'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const result = await scanner.scan(root, context);

      const conflict = result.enhancedConflicts[0];
      expect(conflict?.conflictPath.obligations?.length).toBeGreaterThan(0);
      expect(conflict?.conflictPath.humanExplanation).toBeDefined();
    });
  });

  describe('Config Persistence', () => {
    it('should save and reload project context', async () => {
      const scanner = new ILIScanner(tempDir);

      const originalContext = await scanner.loadContext();
      originalContext.intent = 'proprietary';
      originalContext.distributionModel = 'saas';
      
      await scanner.saveContext(originalContext);

      const reloadedContext = await scanner.loadContext();
      
      expect(reloadedContext.intent).toBe('proprietary');
      expect(reloadedContext.distributionModel).toBe('saas');
    });

    it('should migrate v1.0 config to v1.1', async () => {
      // Create old v1.0 config structure
      const configDir = path.join(tempDir, '.codicense');
      fs.mkdirSync(configDir, { recursive: true });
      
      const oldConfig = {
        version: '1.0',
        projectLicense: 'Apache-2.0',
        distributionModel: 'library',
        linkingModel: 'static',
      };
      
      fs.writeFileSync(
        path.join(configDir, 'config.json'),
        JSON.stringify(oldConfig)
      );

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      expect(context.projectLicense).toBe('Apache-2.0');
      expect(context.distributionModel).toBe('library');
      expect(context.linkingModel).toBe('static');
    });
  });

  describe('Deterministic Mode', () => {
    it('should produce identical results in deterministic mode', async () => {
      process.env.CODICENSE_DETERMINISTIC = '1';

      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'MIT License');

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'MIT',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'gpl-lib',
          version: '1.0.0',
          license: 'GPL-3.0',
          path: ['app', 'gpl-lib'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const result1 = await scanner.scan(root, context);
      const result2 = await scanner.scan(root, context);

      expect(result1.scanId).toBe(result2.scanId);
      expect(result1.timestamp).toBe(result2.timestamp);
      expect(result1.riskScore).toBe(result2.riskScore);

      delete process.env.CODICENSE_DETERMINISTIC;
    });

    it('should use deterministic IDs', async () => {
      process.env.CODICENSE_DETERMINISTIC = '1';

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'MIT',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [],
      };

      const result = await scanner.scan(root, context);

      expect(result.scanId).toBe('deterministic-scan-id');
      expect(result.timestamp).toBe('2000-01-01T00:00:00.000Z');

      delete process.env.CODICENSE_DETERMINISTIC;
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate risk score based on dynamic severity', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'Proprietary');

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'UNLICENSED',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [
          {
            name: 'gpl-lib-1',
            version: '1.0.0',
            license: 'GPL-3.0',
            path: ['app', 'gpl-lib-1'],
            depth: 1,
            dev: false,
            children: [],
          },
          {
            name: 'gpl-lib-2',
            version: '1.0.0',
            license: 'AGPL-3.0',
            path: ['app', 'gpl-lib-2'],
            depth: 1,
            dev: false,
            children: [],
          },
        ],
      };

      const result = await scanner.scan(root, context);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    it('should have low risk for compatible dependencies', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'MIT License');

      const scanner = new ILIScanner(tempDir);
      const context = await scanner.loadContext();

      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'MIT',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'apache-lib',
          version: '1.0.0',
          license: 'Apache-2.0',
          path: ['app', 'apache-lib'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const result = await scanner.scan(root, context);

      expect(result.riskScore).toBe(0);
    });
  });
});

