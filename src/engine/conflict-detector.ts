import type { 
  Conflict, 
  ConflictFix,
  DependencyNode, 
  ProjectConfig, 
  ScanResult,
  Severity 
} from '../types';
import { compatibilityMatrix } from './compatibility-matrix';
import { v4 as uuidv4 } from 'uuid';
import { licenseFixEngine } from '../licensefix/index.js';

/**
 * Core conflict detection engine
 */
export class ConflictDetector {
  private config: ProjectConfig;
  private strictMode: boolean;

  constructor(config: ProjectConfig) {
    this.config = config;
    this.strictMode = config.policy?.strictMode ?? false;
  }

  /**
   * Scan dependency tree for license conflicts
   */
  scan(root: DependencyNode): ScanResult {
    const conflicts: Conflict[] = [];
    const allNodes: DependencyNode[] = [];

    // Collect all nodes
    this.collectNodes(root, allNodes);

    // Check each dependency against project license
    for (const node of allNodes) {
      if (node.depth === 0) continue; // Skip root
      if (node.dev) continue; // Skip dev dependencies (not shipped to users)

      const conflict = this.checkNode(node);
      if (conflict) {
        conflicts.push(conflict);
      }
    }

    // Calculate risk score
    const riskScore = this.calculateRiskScore(conflicts, allNodes.length);

    // Build summary
    const summary = {
      totalDependencies: allNodes.length - 1, // Exclude root
      conflicts: conflicts.length,
      critical: conflicts.filter((c) => c.severity === 'CRITICAL').length,
      high: conflicts.filter((c) => c.severity === 'HIGH').length,
      medium: conflicts.filter((c) => c.severity === 'MEDIUM').length,
      low: conflicts.filter((c) => c.severity === 'LOW').length,
    };

    return {
      scanId: uuidv4(),
      timestamp: new Date().toISOString(),
      projectLicense: this.config.projectLicense,
      riskScore,
      summary,
      conflicts,
    };
  }

  private collectNodes(node: DependencyNode, collection: DependencyNode[]) {
    collection.push(node);
    for (const child of node.children) {
      this.collectNodes(child, collection);
    }
  }

  private checkNode(node: DependencyNode): Conflict | null {
    // Handle dual licenses (e.g., "MIT OR Apache-2.0")
    const licenses = Array.isArray(node.license) 
      ? node.license 
      : node.license.split(/\s+OR\s+/i);

    // If any license option is compatible, no conflict
    let bestResult: { 
      compatible: boolean; 
      reason: string; 
      severity: Severity;
      ruleId?: string;
      spdxRef?: string;
      legalBasis?: string;
      isHeuristic: boolean;
    } | null = null;
    
    for (const license of licenses) {
      const result = compatibilityMatrix.isCompatible(
        this.config.projectLicense,
        license.trim(),
        this.config.linkingModel,
        this.config.distributionModel,
        this.strictMode
      );

      if (result.compatible) {
        return null; // At least one license works
      }

      // Track worst case
      if (!bestResult || this.severityWeight(result.severity) > this.severityWeight(bestResult.severity)) {
        bestResult = result;
      }
    }

    // All licenses are incompatible
    if (bestResult && !bestResult.compatible) {
      return this.createConflict(node, bestResult.reason, bestResult.severity, {
        id: bestResult.ruleId || 'UNKNOWN',
        spdxRef: bestResult.spdxRef,
        legalBasis: bestResult.legalBasis,
        isHeuristic: bestResult.isHeuristic,
      });
    }

    return null;
  }

  private createConflict(
    node: DependencyNode, 
    reason: string, 
    severity: Severity,
    triggeredRule?: {
      id: string;
      spdxRef?: string;
      legalBasis?: string;
      isHeuristic: boolean;
    }
  ): Conflict {
    const license = Array.isArray(node.license) ? node.license[0] : node.license;

    return {
      id: `conflict-${uuidv4().substring(0, 8)}`,
      severity,
      dependency: {
        name: node.name,
        version: node.version,
        license,
        path: node.path,
      },
      reason,
      legalContext: this.getLegalContext(license, severity),
      contaminationPath: this.buildContaminationPath(node),
      fixes: this.suggestFixes(node, license),
      triggeredRule,
    };
  }

  private getLegalContext(license: string, severity: Severity): string {
    if (severity === 'CRITICAL' && license.includes('GPL')) {
      return `${license} Section 5 requires derivative works to be licensed under ${license}. Linking (static or dynamic) creates a derivative work under copyright law.`;
    }

    if (severity === 'CRITICAL' && license.includes('AGPL')) {
      return `${license} Section 13 extends copyleft requirements to software provided over a network. Even SaaS use triggers disclosure obligations.`;
    }

    return '';
  }

  private buildContaminationPath(node: DependencyNode): string[] {
    const path: string[] = [];
    
    for (let i = 0; i < node.path.length; i++) {
      const segment = node.path[i];
      if (i === node.path.length - 1) {
        path.push(`${segment} (${node.license}) ← CONFLICT`);
      } else if (i === 0) {
        path.push(`${segment} (${this.config.projectLicense})`);
      } else {
        path.push(segment);
      }
    }

    return path;
  }

  private suggestFixes(node: DependencyNode, license: string): ConflictFix[] {
    const fixes: ConflictFix[] = [];
    const altResult = licenseFixEngine.searchAlternatives(node.name, license, {
      limit: 2,
      minConfidence: 0.55,
    });

    if (license.includes('GPL') || license.includes('AGPL')) {
      if (altResult.alternatives.length > 0) {
        const names = altResult.alternatives.map((a) => a.package).join(', ');
        fixes.push({
          type: 'replace',
          description: `Replace with permissive alternatives: ${names}`,
          action: {
            add: altResult.alternatives[0].package,
            compatibility: `Confidence ${Math.round(
              altResult.alternatives[0].confidenceScore * 100
            )}% • Similarity ${Math.round(altResult.alternatives[0].similarityScore * 100)}%`,
          },
          automated: false,
          prAvailable: false,
        });
      }

      fixes.push({
        type: 'replace',
        description: `Replace with a permissive-licensed alternative`,
        automated: false,
        prAvailable: false,
      });

      // Architectural fix
      if (this.config.linkingModel === 'static') {
        fixes.push({
          type: 'architectural',
          description: 'Isolate GPL component into separate microservice',
          steps: [
            `Create new service: ${node.name}-service`,
            `Move ${node.name} dependency to new service`,
            `License new service as ${license}`,
            'Main app communicates via REST API',
          ],
          automated: false,
        });
      }

      // Relicense option
      if (this.config.distributionModel === 'open-source') {
        fixes.push({
          type: 'relicense',
          description: `Change project license to ${license}`,
          steps: [
            `Update LICENSE file to ${license}`,
            'Ensure all contributors agree to license change',
            'Update package.json license field',
          ],
          automated: false,
        });
      }
    }

    return fixes;
  }

  private calculateRiskScore(conflicts: Conflict[], totalDeps: number): number {
    if (totalDeps === 0) return 100;

    let score = 100;

    // Deduct based on conflicts
    for (const conflict of conflicts) {
      switch (conflict.severity) {
        case 'CRITICAL':
          score -= 30;
          break;
        case 'HIGH':
          score -= 15;
          break;
        case 'MEDIUM':
          score -= 5;
          break;
        case 'LOW':
          score -= 2;
          break;
      }
    }

    // Ensure score stays in 0-100 range
    return Math.max(0, Math.min(100, score));
  }

  private severityWeight(severity: Severity): number {
    const weights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return weights[severity];
  }
}

