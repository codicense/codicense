/**
 * Intent Detector Tests
 * 
 * Tests for auto-detection of developer intent from project files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IntentDetector } from '../../src/ili/intent-detector';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('IntentDetector', () => {
  let tempDir: string;
  let detector: IntentDetector;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codicense-test-'));
    detector = new IntentDetector(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('LICENSE file detection', () => {
    it('should detect MIT license', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'MIT License\n\nCopyright (c) 2024');

      const license = detector.detectLicense();
      expect(license).toBe('MIT');
    });

    it('should detect GPL-3.0 license', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'GNU GENERAL PUBLIC LICENSE\nVersion 3');

      const license = detector.detectLicense();
      expect(license).toBe('GPL-3.0');
    });

    it('should detect Apache-2.0 license', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'Apache License\nVersion 2.0');

      const license = detector.detectLicense();
      expect(license).toBe('Apache-2.0');
    });

    it('should return undefined if no LICENSE file', () => {
      const license = detector.detectLicense();
      expect(license).toBeUndefined();
    });
  });

  describe('package.json detection', () => {
    it('should extract license from package.json', async () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ license: 'BSD-3-Clause' }));

      const license = detector.detectLicense();
      expect(license).toBe('BSD-3-Clause');
    });

    it('should detect private package as proprietary intent', async () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ private: true }));

      const context = await detector.detectContext();
      expect(context.intent).toBe('proprietary');
    });

    it('should detect public package with no license as undecided', async () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ name: 'test-pkg' }));

      const context = await detector.detectContext();
      expect(context.intent).toBe('undecided');
    });
  });

  describe('intent inference', () => {
    it('should infer open-source intent from GPL license', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'GNU GENERAL PUBLIC LICENSE\nVersion 3');

      const context = await detector.detectContext();
      expect(context.intent).toBe('open-source');
      expect(context.projectLicense).toBe('GPL-3.0');
    });

    it('should infer open-source intent from MIT license', async () => {
      const licensePath = path.join(tempDir, 'LICENSE');
      fs.writeFileSync(licensePath, 'MIT License');

      const context = await detector.detectContext();
      expect(context.intent).toBe('open-source');
      expect(context.projectLicense).toBe('MIT');
    });

    it('should infer proprietary intent from private package', async () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ 
        private: true,
        license: 'UNLICENSED' 
      }));

      const context = await detector.detectContext();
      expect(context.intent).toBe('proprietary');
    });

    it('should default to undecided if no clear signals', async () => {
      const context = await detector.detectContext();
      expect(context.intent).toBe('undecided');
    });
  });

  describe('distribution model inference', () => {
    it('should infer library from package.json main field', async () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ 
        main: 'dist/index.js',
        types: 'dist/index.d.ts'
      }));

      const context = await detector.detectContext();
      expect(context.distributionModel).toBe('library');
    });

    it('should infer CLI from package.json bin field', async () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ 
        bin: { 'my-cli': 'bin/cli.js' }
      }));

      const context = await detector.detectContext();
      expect(context.distributionModel).toBe('cli');
    });

    it('should infer SaaS from server dependencies', async () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ 
        dependencies: { 
          'express': '^4.0.0',
          'fastify': '^4.0.0'
        }
      }));

      const context = await detector.detectContext();
      expect(context.distributionModel).toBe('saas');
    });

    it('should default to library if unclear', async () => {
      const context = await detector.detectContext();
      expect(context.distributionModel).toBe('library');
    });
  });

  describe('config persistence', () => {
    it('should save and load config', async () => {
      const context = await detector.detectContext();
      await detector.save(context);

      const loaded = await detector.loadOrCreate();
      expect(loaded.intent).toBe(context.intent);
      expect(loaded.distributionModel).toBe(context.distributionModel);
    });

    it('should create default config if not exists', async () => {
      const loaded = await detector.loadOrCreate();
      expect(loaded.intent).toBe('undecided');
      expect(loaded.distributionModel).toBe('library');
    });
  });

  describe('edge cases', () => {
    it('should handle malformed package.json', async () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, '{ invalid json');

      const context = await detector.detectContext();
      expect(context).toBeDefined();
    });

    it('should handle missing files gracefully', async () => {
      const context = await detector.detectContext();
      expect(context.intent).toBe('undecided');
      expect(context.detectedFrom).toBe('auto-detect');
    });

    it('should handle dual license (OR)', async () => {
      const pkgPath = path.join(tempDir, 'package.json');
      fs.writeFileSync(pkgPath, JSON.stringify({ 
        license: 'MIT OR Apache-2.0'
      }));

      const license = detector.detectLicense();
      expect(license).toMatch(/MIT|Apache-2\.0/);
    });
  });
});

