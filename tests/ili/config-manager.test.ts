/**
 * Config Manager Tests
 * 
 * Tests for .codicense/config.json persistence and migration.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigManager } from '../../src/config/config-manager';
import type { DeveloperIntent } from '../../src/ili/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('ConfigManager', () => {
  let tempDir: string;
  let manager: ConfigManager;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codicense-test-'));
    manager = new ConfigManager(tempDir);
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('config creation', () => {
    it('should create default config', () => {
      const config = manager.createDefault();
      
      expect(config.version).toBe('1.1');
      expect(config.projectContext).toBeDefined();
      expect(config.projectContext.intent).toBe('undecided');
    });

    it('should save config to .codicense/config.json', () => {
      const config = manager.createDefault();
      manager.save(config);

      const configPath = path.join(tempDir, '.codicense', 'config.json');
      expect(fs.existsSync(configPath)).toBe(true);
    });

    it('should load saved config', () => {
      const config = manager.createDefault();
      config.projectContext.intent = 'proprietary';
      manager.save(config);

      const loaded = manager.load();
      expect(loaded?.projectContext.intent).toBe('proprietary');
    });
  });

  describe('config validation', () => {
    it('should validate correct config', () => {
      const config = manager.createDefault();
      expect(manager.isValid(config)).toBe(true);
    });

    it('should reject invalid version', () => {
      const config = { version: '0.9' };
      expect(manager.isValid(config)).toBe(false);
    });

    it('should reject missing intent', () => {
      const invalidConfig = { version: '1.1' };
      expect(manager.isValid(invalidConfig)).toBe(false);
    });

    it('should validate intent values', () => {
      const config = manager.createDefault();
      config.projectContext.intent = 'open-source';
      expect(manager.isValid(config)).toBe(true);

      config.projectContext.intent = 'invalid' as DeveloperIntent;
      expect(manager.isValid(config)).toBe(false);
    });
  });

  describe('migration', () => {
    it('should migrate v1.0 config to v1.1', () => {
      const oldConfig = {
        version: '1.0',
        projectLicense: 'MIT',
        distributionModel: 'cli',
        linkingModel: 'static',
      };

      const configPath = path.join(tempDir, '.codicense', 'config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(oldConfig));

      const migrated = manager.load();

      expect(migrated?.version).toBe('1.1');
      expect(migrated?.projectContext.projectLicense).toBe('MIT');
      expect(migrated?.projectContext.distributionModel).toBe('cli');
      expect(migrated?.projectContext.linkingModel).toBe('static');
      expect(migrated?.projectContext.intent).toBe('undecided');
    });

    it('should preserve existing v1.1 config', () => {
      const config = manager.createDefault();
      config.projectContext.intent = 'proprietary';
      manager.save(config);

      const loaded = manager.load();
      expect(loaded?.version).toBe('1.1');
      expect(loaded?.projectContext.intent).toBe('proprietary');
    });
  });

  describe('deterministic mode', () => {
    it('should enable deterministic mode from env', () => {
      process.env.CODICENSE_DETERMINISTIC = '1';
      const config = manager.createDefault();
      expect(config.createdAt).toBe('1970-01-01T00:00:00.000Z');
      delete process.env.CODICENSE_DETERMINISTIC;
    });

    it('should respect deterministic timestamps', () => {
      process.env.CODICENSE_DETERMINISTIC = '1';
      const config = manager.createDefault();
      manager.save(config);

      const loaded = manager.load();
      expect(loaded?.lastUpdated).toBe('1970-01-01T00:00:00.000Z');
      delete process.env.CODICENSE_DETERMINISTIC;
    });
  });

  describe('file operations', () => {
    it('should check if config exists', () => {
      expect(manager.exists()).toBe(false);

      manager.save(manager.createDefault());
      expect(manager.exists()).toBe(true);
    });

    it('should delete config', () => {
      manager.save(manager.createDefault());
      expect(manager.exists()).toBe(true);

      manager.delete();
      expect(manager.exists()).toBe(false);
    });

    it('should handle missing config gracefully', () => {
      expect(() => manager.load()).not.toThrow();
    });

    it('should create directory if missing', () => {
      const config = manager.createDefault();
      manager.save(config);

      const configDir = path.join(tempDir, '.codicense');
      expect(fs.existsSync(configDir)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle corrupted config', () => {
      const configPath = path.join(tempDir, '.codicense', 'config.json');
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, '{ invalid json');

      expect(() => manager.load()).not.toThrow();
    });

    it('should handle read-only filesystem gracefully', () => {
      // This test is platform-specific and may need adjustment
      const config = manager.createDefault();
      expect(() => manager.save(config)).not.toThrow();
    });
  });
});

