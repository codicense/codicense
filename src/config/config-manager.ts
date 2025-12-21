/**
 * Configuration manager for Codicense
 * Handles .codicense/config.json with schema validation and migration.
 */

import fs from 'fs';
import path from 'path';
import type { IntentConfig, ProjectContext, DeveloperIntent, DistributionModel, LinkingModel } from '../ili/types';

const CONFIG_DIR = '.codicense';
const CONFIG_FILE = 'config.json';
const CURRENT_VERSION = '1.1';

export interface ConfigSchema {
  version: string;
  projectContext: ProjectContext;
  guidedMode: boolean;
  educationalMode: boolean;
  createdAt: string;
  lastUpdated: string;
  deterministicMode?: boolean;
}

export class ConfigManager {
  private configPath: string;

  constructor(projectPath: string) {
    this.configPath = path.join(projectPath, CONFIG_DIR, CONFIG_FILE);
  }

  /**
   * Load existing config or return null
   */
  load(): IntentConfig | null {
    if (!fs.existsSync(this.configPath)) {
      return null;
    }

    try {
      const raw = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(raw) as ConfigSchema;

      // Allow existing configs to migrate before strict validation
      if (config.version && config.version.startsWith('1.0')) {
        return this.migrate(config);
      }

      // Validate schema
      if (!this.isValid(config)) {
        throw new Error('Invalid config schema');
      }

      // Migrate if needed
      if (config.version !== CURRENT_VERSION) {
        return this.migrate(config);
      }

      return config as IntentConfig;
    } catch (err) {
      return null;
    }
  }

  /**
   * Save config to disk
   */
  save(config: IntentConfig): void {
    const configDir = path.dirname(this.configPath);
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    config.version = CURRENT_VERSION;
    config.lastUpdated = this.isDeterministic() 
      ? '1970-01-01T00:00:00.000Z' 
      : new Date().toISOString();

    const json = JSON.stringify(config, null, 2);
    fs.writeFileSync(this.configPath, json, 'utf8');
  }

  /**
   * Create default config with auto-detected values
   */
  createDefault(context?: ProjectContext): IntentConfig {
    const detected: ProjectContext = context ?? {
      projectLicense: 'UNLICENSED',
      intent: 'undecided',
      distributionModel: 'cli',
      linkingModel: 'runtime',
      futureFlexibility: true,
      detectedFrom: 'auto-detect',
    };

    const now = this.isDeterministic() 
      ? '1970-01-01T00:00:00.000Z' 
      : new Date().toISOString();

    return {
      version: CURRENT_VERSION,
      projectContext: detected,
      // Preserve historical shape for tests expecting `intent`
      // @ts-expect-error backward compat
      intent: detected,
      guidedMode: detected.intent === 'undecided',
      educationalMode: detected.intent === 'undecided',
      // Preserve deterministic flag for tests
      deterministic: this.isDeterministic(),
      createdAt: now,
      lastUpdated: now,
    };
  }

  /**
   * Migrate old config to current version
   */
  private migrate(oldConfig: ConfigSchema): IntentConfig {
    // Configuration schema migration
    if (oldConfig.version.startsWith('1.0')) {
      const priorConfig = oldConfig as unknown as Record<string, unknown>;
      const priorContext: ProjectContext = priorConfig.intent && typeof priorConfig.intent === 'object'
        ? (priorConfig.intent as ProjectContext)
        : {
            projectLicense: priorConfig.projectLicense as string,
            intent: (priorConfig.intent as DeveloperIntent) || 'undecided',
            distributionModel: (priorConfig.distributionModel as DistributionModel) || 'cli',
            linkingModel: (priorConfig.linkingModel as LinkingModel) || 'runtime',
            futureFlexibility: true,
            detectedFrom: 'auto-detect',
          };

      const migrated: IntentConfig = {
        version: CURRENT_VERSION,
        projectContext: oldConfig.projectContext || priorContext,
        guidedMode: oldConfig.guidedMode ?? true,
        educationalMode: oldConfig.educationalMode ?? true,
        createdAt: oldConfig.createdAt || new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      };

      // Save migrated config
      this.save(migrated);
      return migrated;
    }

    return oldConfig as IntentConfig;
  }

  /**
   * Validate config schema
   */
  isValid(config: unknown): boolean {
    if (!config || typeof config !== 'object') return false;
    
    const c = config as Record<string, unknown>;
    
    if (typeof c.version !== 'string') return false;
    if (typeof c.guidedMode !== 'boolean') return false;
    if (typeof c.educationalMode !== 'boolean') return false;
    if (typeof c.createdAt !== 'string') return false;
    if (typeof c.lastUpdated !== 'string') return false;
    
    const ctx = (c.projectContext || c.intent) as Record<string, unknown>;
    if (!ctx || typeof ctx !== 'object') return false;
    if (!['open-source', 'proprietary', 'undecided'].includes(ctx.intent as string)) {
      return false;
    }
    if (c.version !== '1.1' && c.version !== '1.1.0') return false;

    return true;
  }

  /**
   * Check if deterministic mode is enabled
   */
  private isDeterministic(): boolean {
    return process.env.CODICENSE_DETERMINISTIC === '1';
  }

  /**
   * Check if config exists
   */
  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  /**
   * Delete config file
   */
  delete(): void {
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
  }
}

