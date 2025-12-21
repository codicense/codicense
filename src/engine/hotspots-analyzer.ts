/**
 * Risk Hotspots Analyzer
 * 
 * Identifies and ranks dependencies by risk amplification potential.
 * Considers depth, fan-out, license type, and transitive impact.
 */

import type { DependencyNode } from '../types';
import type { EnhancedConflict } from './ili-scanner';

export interface RiskHotspot {
  name: string;
  version: string;
  license: string;
  score: number;
  factors: RiskFactor[];
  recommendation: string;
}

export interface RiskFactor {
  type: 'depth' | 'fan-out' | 'license-risk' | 'transitive-impact' | 'linking-model';
  score: number;
  description: string;
}

export interface HotspotsResult {
  hotspots: RiskHotspot[];
  totalDependencies: number;
  highRiskCount: number;
  summary: string;
}

export interface DependencyMetrics {
  name: string;
  version: string;
  license: string;
  depth: number;
  childCount: number;
  transitiveCount: number;
  dependentCount: number;
}

/**
 * Analyzes dependencies to identify risk amplification hotspots
 */
export class HotspotsAnalyzer {
  /**
   * Analyze dependency tree and identify risk hotspots
   */
  static analyze(
    root: DependencyNode,
    conflicts: EnhancedConflict[] = [],
    linkingModel: string = 'static'
  ): HotspotsResult {
    // Build metrics for all dependencies
    const metrics = this.buildMetrics(root);
    const conflictNames = new Set(conflicts.map(c => c.dependency.name));
    
    // Calculate hotspot scores
    const hotspots: RiskHotspot[] = [];
    
    for (const metric of metrics.values()) {
      const factors = this.calculateRiskFactors(metric, conflictNames, linkingModel);
      const totalScore = factors.reduce((sum, f) => sum + f.score, 0);
      
      if (totalScore > 10) { // Only include significant hotspots
        hotspots.push({
          name: metric.name,
          version: metric.version,
          license: metric.license,
          score: Math.round(totalScore),
          factors,
          recommendation: this.generateRecommendation(metric, factors),
        });
      }
    }
    
    // Sort by score descending
    hotspots.sort((a, b) => b.score - a.score);
    
    // Take top 10
    const topHotspots = hotspots.slice(0, 10);
    
    return {
      hotspots: topHotspots,
      totalDependencies: metrics.size,
      highRiskCount: hotspots.filter(h => h.score >= 30).length,
      summary: this.generateSummary(topHotspots),
    };
  }
  
  /**
   * Build metrics for all dependencies in tree
   */
  private static buildMetrics(root: DependencyNode): Map<string, DependencyMetrics> {
    const metrics = new Map<string, DependencyMetrics>();
    const dependentCounts = new Map<string, number>();
    
    // First pass: count how many packages depend on each package
    const countDependents = (node: DependencyNode) => {
      for (const child of node.children) {
        const current = dependentCounts.get(child.name) || 0;
        dependentCounts.set(child.name, current + 1);
        countDependents(child);
      }
    };
    countDependents(root);
    
    // Second pass: build full metrics
    const traverse = (node: DependencyNode, depth: number) => {
      const transitiveCount = this.countTransitive(node);
      const license = Array.isArray(node.license) ? node.license[0] : node.license;
      
      metrics.set(node.name, {
        name: node.name,
        version: node.version,
        license: license || 'UNKNOWN',
        depth,
        childCount: node.children.length,
        transitiveCount,
        dependentCount: dependentCounts.get(node.name) || 0,
      });
      
      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    };
    
    traverse(root, 0);
    return metrics;
  }
  
  /**
   * Count transitive dependencies
   */
  private static countTransitive(node: DependencyNode): number {
    let count = 0;
    const traverse = (n: DependencyNode) => {
      count += n.children.length;
      for (const child of n.children) {
        traverse(child);
      }
    };
    traverse(node);
    return count;
  }
  
  /**
   * Calculate risk factors for a dependency
   */
  private static calculateRiskFactors(
    metric: DependencyMetrics,
    conflictNames: Set<string>,
    linkingModel: string
  ): RiskFactor[] {
    const factors: RiskFactor[] = [];
    
    // Depth risk (deeper = harder to fix)
    if (metric.depth > 2) {
      const depthScore = Math.min(20, metric.depth * 4);
      factors.push({
        type: 'depth',
        score: depthScore,
        description: `Depth ${metric.depth}: Deep transitive dependency`,
      });
    }
    
    // Fan-out risk (many children = amplification)
    if (metric.transitiveCount > 5) {
      const fanOutScore = Math.min(25, Math.log2(metric.transitiveCount) * 5);
      factors.push({
        type: 'fan-out',
        score: Math.round(fanOutScore),
        description: `Fan-out ${metric.transitiveCount}: Many transitive dependencies`,
      });
    }
    
    // License risk
    const licenseRisk = this.calculateLicenseRisk(metric.license);
    if (licenseRisk > 0) {
      factors.push({
        type: 'license-risk',
        score: licenseRisk,
        description: this.getLicenseRiskDescription(metric.license),
      });
    }
    
    // Transitive impact (many packages depend on this)
    if (metric.dependentCount > 3) {
      const impactScore = Math.min(20, metric.dependentCount * 3);
      factors.push({
        type: 'transitive-impact',
        score: impactScore,
        description: `${metric.dependentCount} packages depend on this`,
      });
    }
    
    // Linking model amplification
    if (linkingModel === 'static' && this.isStaticLinkingRisky(metric.license)) {
      factors.push({
        type: 'linking-model',
        score: 15,
        description: `Static linking increases ${metric.license} copyleft risk`,
      });
    }
    
    // Bonus for existing conflicts
    if (conflictNames.has(metric.name)) {
      factors.push({
        type: 'license-risk',
        score: 20,
        description: 'Already flagged as license conflict',
      });
    }
    
    return factors;
  }
  
  /**
   * Calculate license-based risk score
   */
  private static calculateLicenseRisk(license: string): number {
    if (!license) return 10;
    
    const upper = license.toUpperCase();
    
    if (upper.includes('AGPL')) return 30;
    if (upper.includes('GPL') && !upper.includes('LGPL')) return 25;
    if (upper.includes('LGPL')) return 12;
    if (upper.includes('MPL')) return 8;
    if (upper === 'UNKNOWN' || upper === 'UNLICENSED') return 15;
    
    return 0; // Permissive
  }
  
  /**
   * Get description for license risk
   */
  private static getLicenseRiskDescription(license: string): string {
    if (!license) return 'Unknown license';
    
    const upper = license.toUpperCase();
    
    if (upper.includes('AGPL')) return `AGPL: Network copyleft risk`;
    if (upper.includes('GPL') && !upper.includes('LGPL')) return `GPL: Strong copyleft contamination risk`;
    if (upper.includes('LGPL')) return `LGPL: Weak copyleft with linking considerations`;
    if (upper.includes('MPL')) return `MPL: File-level copyleft requirements`;
    if (upper === 'UNKNOWN') return 'Unknown license requires investigation';
    
    return license;
  }
  
  /**
   * Check if static linking is risky for this license
   */
  private static isStaticLinkingRisky(license: string): boolean {
    if (!license) return false;
    const upper = license.toUpperCase();
    return upper.includes('LGPL') || upper.includes('GPL');
  }
  
  /**
   * Generate recommendation for hotspot
   */
  private static generateRecommendation(
    metric: DependencyMetrics,
    factors: RiskFactor[]
  ): string {
    const hasLicenseRisk = factors.some(f => f.type === 'license-risk' && f.score >= 20);
    const hasFanOut = factors.some(f => f.type === 'fan-out');
    const hasDepth = factors.some(f => f.type === 'depth');
    
    if (hasLicenseRisk && hasFanOut) {
      return `Consider replacing ${metric.name} to eliminate ${metric.transitiveCount} transitive risks`;
    }
    if (hasLicenseRisk) {
      return `Evaluate ${metric.name} for license compliance or replacement`;
    }
    if (hasFanOut) {
      return `${metric.name} has high fan-out; monitor for upstream license changes`;
    }
    if (hasDepth) {
      return `Deep dependency ${metric.name}; consider flattening if possible`;
    }
    
    return `Monitor ${metric.name} for risk changes`;
  }
  
  /**
   * Generate summary text
   */
  private static generateSummary(hotspots: RiskHotspot[]): string {
    if (hotspots.length === 0) {
      return 'No significant risk hotspots detected.';
    }
    
    const top = hotspots[0];
    const criticalCount = hotspots.filter(h => h.score >= 50).length;
    
    if (criticalCount > 0) {
      return `${criticalCount} critical hotspot(s). Top: ${top.name} (score: ${top.score})`;
    }
    
    return `${hotspots.length} hotspot(s) identified. Top: ${top.name} (score: ${top.score})`;
  }
  
  /**
   * Format hotspots for CLI display
   */
  static formatHotspots(result: HotspotsResult): string {
    const lines: string[] = [];
    
    lines.push('🔥 Risk Hotspots Analysis');
    lines.push('');
    lines.push(`Total Dependencies: ${result.totalDependencies}`);
    lines.push(`High-Risk Hotspots: ${result.highRiskCount}`);
    lines.push('');
    
    if (result.hotspots.length === 0) {
      lines.push('✅ No significant risk hotspots detected');
      return lines.join('\n');
    }
    
    lines.push('Top Risk Contributors:');
    lines.push('');
    
    for (let i = 0; i < result.hotspots.length; i++) {
      const hotspot = result.hotspots[i];
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      
      lines.push(`${medal} ${hotspot.name} (score: ${hotspot.score})`);
      lines.push(`   License: ${hotspot.license}`);
      
      for (const factor of hotspot.factors) {
        lines.push(`   • ${factor.description}`);
      }
      
      lines.push(`   💡 ${hotspot.recommendation}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
}
