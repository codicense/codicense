/**
 * Integration Layer - Bridges ILI with existing conflict detection
 * 
 * Wraps conflict detection with intent-aware intelligence.
 */

import type { DependencyNode, ProjectConfig, ScanResult, Conflict } from '../types';
import type { ProjectContext, DynamicSeverity, FixSuggestion, ConflictPath } from '../ili/types';
import { IntentDetector } from '../ili/intent-detector';
import { DynamicRiskEngine } from '../ili/dynamic-risk-engine';
import { FixFirstEngine } from '../ili/fix-first-engine';
import { PathVisualizer } from '../visualizer/path-visualizer';
import { ConfigManager } from '../config/config-manager';
import { ConflictDetector } from './conflict-detector';
import { v4 as uuidv4 } from 'uuid';

export interface ILIScanResult extends ScanResult {
  projectContext: ProjectContext;
  conflictPaths: Map<string, ConflictPath>;
  enhancedConflicts: EnhancedConflict[];
}

export interface EnhancedConflict extends Conflict {
  dynamicSeverity: DynamicSeverity;
  fixSuggestions: FixSuggestion[];
  conflictPath: ConflictPath;
  visualization?: string;
}

/**
 * Intent-Aware License Intelligence Scanner
 */
export class ILIScanner {
  private configManager: ConfigManager;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.configManager = new ConfigManager(projectPath);
  }

  /**
   * Load or create project context
   */
  async loadContext(projectPath: string = this.projectPath): Promise<ProjectContext> {
    if (this.configManager.exists()) {
      const config = this.configManager.load();
      if (config && config.projectContext) {
        return { ...config.projectContext, detectedFrom: 'config' };
      }
    }

    const detector = new IntentDetector(projectPath);
    return detector.detectContext();
  }

  /**
   * Scan with Intent-Aware Intelligence
   */
  async scan(
    root: DependencyNode,
    projectPathOrContext?: string | ProjectContext,
    providedContext?: ProjectContext
  ): Promise<ILIScanResult> {
    const projectPath = typeof projectPathOrContext === 'string' ? projectPathOrContext : this.projectPath;
    const projectContext = (typeof projectPathOrContext === 'object' && projectPathOrContext)
      ? projectPathOrContext
      : providedContext || await this.loadContext(projectPath);

    const detectorConfig: ProjectConfig = {
      projectLicense: projectContext.projectLicense || 'UNKNOWN',
      linkingModel: projectContext.linkingModel,
      distributionModel: projectContext.distributionModel,
    };

    // Run conflict detection
    const detector = new ConflictDetector(detectorConfig);
    const baseScan = detector.scan(root);

    // Enhance each conflict with ILI
    const enhancedConflicts: EnhancedConflict[] = [];
    const conflictPaths = new Map<string, ConflictPath>();

    for (const conflict of baseScan.conflicts) {
      // Calculate dynamic severity
      const dynamicSeverity = new DynamicRiskEngine().calculateSeverity(
        projectContext.projectLicense,
        conflict.dependency.license,
        projectContext
      );

      // Create a minimal DependencyNode for fix generation
      const depNode: DependencyNode = {
        name: conflict.dependency.name,
        version: conflict.dependency.version,
        license: conflict.dependency.license,
        depth: conflict.dependency.path.length,
        path: conflict.dependency.path,
        children: [],
      };

      // Generate fixes
      const depLicenseStr = Array.isArray(depNode.license) ? depNode.license[0] : depNode.license;
      const fixSuggestions = new FixFirstEngine(projectContext.projectLicense).generateFixes(
        depNode.name,
        depLicenseStr,
        projectContext.projectLicense
      );

      // Build conflict path
      const basePath = PathVisualizer.buildConflictPath(
        root,
        conflict,
        projectContext.projectLicense || 'UNKNOWN'
      );
      const conflictPath: ConflictPath = {
        ...basePath,
        obligations: basePath.obligationsInConflict,
      };

      conflictPaths.set(conflict.id, conflictPath);

      enhancedConflicts.push({
        ...conflict,
        dynamicSeverity,
        fixSuggestions,
        conflictPath,
      });
    }

    // Recalculate risk score based on dynamic severity
    const riskScore = this.calculateDynamicRisk(enhancedConflicts);

    // Rebuild summary with dynamic severity levels
    const summary = {
      totalDependencies: baseScan.summary.totalDependencies,
      conflicts: enhancedConflicts.length,
      critical: enhancedConflicts.filter((c) => c.dynamicSeverity.level === 'critical').length,
      high: enhancedConflicts.filter((c) => c.dynamicSeverity.level === 'high').length,
      medium: enhancedConflicts.filter((c) => c.dynamicSeverity.level === 'medium').length,
      low: enhancedConflicts.filter((c) => c.dynamicSeverity.level === 'low').length,
    };

    return {
      scanId: this.isDeterministic() ? 'deterministic-scan-id' : uuidv4(),
      timestamp: this.isDeterministic() ? '2000-01-01T00:00:00.000Z' : new Date().toISOString(),
      projectLicense: projectContext.projectLicense || 'UNKNOWN',
      riskScore,
      summary,
      conflicts: enhancedConflicts,
      projectContext,
      conflictPaths,
      enhancedConflicts,
    };
  }

  /**
   * Calculate dynamic risk score
   */
  private calculateDynamicRisk(conflicts: EnhancedConflict[]): number {
    if (conflicts.length === 0) return 0;

    const severityWeights = {
      critical: 10,
      high: 5,
      medium: 2,
      low: 1,
      safe: 0,
    };

    const totalWeight = conflicts.reduce((sum, c) => {
      return sum + severityWeights[c.dynamicSeverity.level];
    }, 0);

    return Math.min(100, Math.round((totalWeight / conflicts.length) * 10));
  }

  /**
   * Check if deterministic mode is enabled
   */
  private isDeterministic(): boolean {
    return process.env.CODICENSE_DETERMINISTIC === '1';
  }

  /**
   * Save context to config
   */
  async saveContext(context: ProjectContext): Promise<void> {
    const config = this.configManager.exists() 
      ? this.configManager.load()! 
      : this.configManager.createDefault(context);

    config.projectContext = context;

    this.configManager.save(config);
  }
}

