/**
 * Diff Mode Engine
 * 
 * Compares scans between commits to show what changed.
 * Enables "codicense scan --diff HEAD~1" for PR reviews.
 */

// Types imported for documentation purposes
import type { EnhancedConflict, ILIScanResult } from './ili-scanner';

export interface DiffChange {
  type: 'added' | 'removed' | 'changed' | 'severity-changed' | 'license-changed';
  dependency: string;
  version?: string;
  previousVersion?: string;
  previousLicense?: string;
  currentLicense?: string;
  previousSeverity?: string;
  currentSeverity?: string;
  impact: 'positive' | 'negative' | 'neutral';
  description: string;
}

export interface DiffResult {
  hasChanges: boolean;
  summary: {
    added: number;
    removed: number;
    licenseChanges: number;
    severityChanges: number;
    riskDelta: number;
    previousRiskScore: number;
    currentRiskScore: number;
  };
  changes: DiffChange[];
  newConflicts: EnhancedConflict[];
  resolvedConflicts: EnhancedConflict[];
}

export interface StoredScan {
  scanId: string;
  timestamp: string;
  commitSha?: string;
  riskScore: number;
  dependencies: Map<string, StoredDependency>;
  conflicts: EnhancedConflict[];
}

export interface StoredDependency {
  name: string;
  version: string;
  license: string;
  depth: number;
}

/**
 * Diff Mode Engine - Compare scans to identify changes
 */
export class DiffEngine {
  /**
   * Compare two scan results and generate diff
   */
  static compare(
    previousScan: ILIScanResult | StoredScan,
    currentScan: ILIScanResult
  ): DiffResult {
    const changes: DiffChange[] = [];
    
    // Extract dependencies
    const prevDeps = this.extractDependencies(previousScan);
    const currDeps = this.extractDependencies(currentScan);
    
    // Find added dependencies
    for (const [name, curr] of currDeps) {
      if (!prevDeps.has(name)) {
        changes.push({
          type: 'added',
          dependency: name,
          version: curr.version,
          currentLicense: curr.license,
          impact: this.assessAdditionImpact(curr.license),
          description: `New dependency: ${name}@${curr.version} (${curr.license})`,
        });
      }
    }
    
    // Find removed dependencies
    for (const [name, prev] of prevDeps) {
      if (!currDeps.has(name)) {
        changes.push({
          type: 'removed',
          dependency: name,
          previousVersion: prev.version,
          previousLicense: prev.license,
          impact: 'positive',
          description: `Removed dependency: ${name}@${prev.version}`,
        });
      }
    }
    
    // Find changed dependencies
    for (const [name, curr] of currDeps) {
      const prev = prevDeps.get(name);
      if (prev) {
        // Version change
        if (prev.version !== curr.version) {
          changes.push({
            type: 'changed',
            dependency: name,
            previousVersion: prev.version,
            version: curr.version,
            impact: 'neutral',
            description: `Version change: ${name} ${prev.version} → ${curr.version}`,
          });
        }
        
        // License change
        if (prev.license !== curr.license) {
          const impact = this.assessLicenseChangeImpact(prev.license, curr.license);
          changes.push({
            type: 'license-changed',
            dependency: name,
            previousLicense: prev.license,
            currentLicense: curr.license,
            impact,
            description: `License changed: ${name} ${prev.license} → ${curr.license}`,
          });
        }
      }
    }
    
    // Compare conflicts
    const prevConflicts = this.extractConflicts(previousScan);
    const currConflicts = currentScan.enhancedConflicts || [];
    
    const newConflicts = currConflicts.filter(
      (c) => !prevConflicts.find((p) => p.dependency.name === c.dependency.name)
    );
    
    const resolvedConflicts = prevConflicts.filter(
      (p) => !currConflicts.find((c) => c.dependency.name === p.dependency.name)
    );
    
    // Severity changes
    for (const curr of currConflicts) {
      const prev = prevConflicts.find((p) => p.dependency.name === curr.dependency.name);
      if (prev && prev.dynamicSeverity?.level !== curr.dynamicSeverity?.level) {
        changes.push({
          type: 'severity-changed',
          dependency: curr.dependency.name,
          previousSeverity: prev.dynamicSeverity?.level,
          currentSeverity: curr.dynamicSeverity?.level,
          impact: this.assessSeverityChangeImpact(
            prev.dynamicSeverity?.level,
            curr.dynamicSeverity?.level
          ),
          description: `Severity changed: ${curr.dependency.name} ${prev.dynamicSeverity?.level} → ${curr.dynamicSeverity?.level}`,
        });
      }
    }
    
    // Calculate risk delta
    const previousRiskScore = 'riskScore' in previousScan ? previousScan.riskScore : 0;
    const currentRiskScore = currentScan.riskScore;
    const riskDelta = currentRiskScore - previousRiskScore;
    
    return {
      hasChanges: changes.length > 0 || newConflicts.length > 0 || resolvedConflicts.length > 0,
      summary: {
        added: changes.filter((c) => c.type === 'added').length,
        removed: changes.filter((c) => c.type === 'removed').length,
        licenseChanges: changes.filter((c) => c.type === 'license-changed').length,
        severityChanges: changes.filter((c) => c.type === 'severity-changed').length,
        riskDelta,
        previousRiskScore,
        currentRiskScore,
      },
      changes,
      newConflicts: newConflicts as EnhancedConflict[],
      resolvedConflicts: resolvedConflicts as EnhancedConflict[],
    };
  }
  
  /**
   * Extract dependencies from a scan result
   */
  private static extractDependencies(
    scan: ILIScanResult | StoredScan
  ): Map<string, StoredDependency> {
    // If it's already a StoredScan with a Map
    if ('dependencies' in scan && scan.dependencies instanceof Map) {
      return scan.dependencies;
    }
    
    const deps = new Map<string, StoredDependency>();
    
    // Handle ILIScanResult with conflicts array
    if ('conflicts' in scan && Array.isArray(scan.conflicts)) {
      for (const conflict of scan.conflicts) {
        const dep = conflict.dependency;
        if (dep && dep.name) {
          deps.set(dep.name, {
            name: dep.name,
            version: dep.version || '0.0.0',
            license: typeof dep.license === 'string' ? dep.license : (dep.license?.[0] || 'UNKNOWN'),
            depth: dep.path?.length || 0,
          });
        }
      }
    }
    
    return deps;
  }
  
  /**
   * Extract conflicts from scan result
   */
  private static extractConflicts(
    scan: ILIScanResult | StoredScan
  ): EnhancedConflict[] {
    if ('enhancedConflicts' in scan) {
      return scan.enhancedConflicts || [];
    }
    if ('conflicts' in scan && Array.isArray(scan.conflicts)) {
      return scan.conflicts as EnhancedConflict[];
    }
    return [];
  }
  
  /**
   * Assess the impact of adding a new dependency based on license
   */
  private static assessAdditionImpact(license: string): 'positive' | 'negative' | 'neutral' {
    if (!license) return 'neutral';
    
    const upperLicense = license.toUpperCase();
    
    if (upperLicense.includes('GPL') || upperLicense.includes('AGPL')) {
      return 'negative';
    }
    if (upperLicense === 'UNKNOWN' || upperLicense === 'UNLICENSED') {
      return 'negative';
    }
    
    return 'neutral';
  }
  
  /**
   * Assess the impact of a license change
   */
  private static assessLicenseChangeImpact(
    previousLicense: string,
    currentLicense: string
  ): 'positive' | 'negative' | 'neutral' {
    const riskLevel = (license: string): number => {
      if (!license) return 5;
      const upper = license.toUpperCase();
      if (upper.includes('AGPL')) return 10;
      if (upper.includes('GPL') && !upper.includes('LGPL')) return 8;
      if (upper.includes('LGPL') || upper.includes('MPL')) return 5;
      if (upper === 'UNKNOWN' || upper === 'UNLICENSED') return 7;
      return 2; // Permissive
    };
    
    const prevRisk = riskLevel(previousLicense);
    const currRisk = riskLevel(currentLicense);
    
    if (currRisk < prevRisk) return 'positive';
    if (currRisk > prevRisk) return 'negative';
    return 'neutral';
  }
  
  /**
   * Assess the impact of severity change
   */
  private static assessSeverityChangeImpact(
    previousSeverity?: string,
    currentSeverity?: string
  ): 'positive' | 'negative' | 'neutral' {
    const severityRank: Record<string, number> = {
      safe: 0,
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };
    
    const prev = severityRank[previousSeverity?.toLowerCase() || 'safe'] ?? 2;
    const curr = severityRank[currentSeverity?.toLowerCase() || 'safe'] ?? 2;
    
    if (curr < prev) return 'positive';
    if (curr > prev) return 'negative';
    return 'neutral';
  }

  /**
   * Format diff result for display
   */
  static formatDiff(diff: DiffResult): string {
    const lines: string[] = [];
    
    if (!diff.hasChanges) {
      lines.push('✅ No license-related changes detected');
      return lines.join('\n');
    }
    
    lines.push('📊 License Diff Summary');
    lines.push('');
    
    // Risk delta
    const riskEmoji = diff.summary.riskDelta > 0 ? '📈' : 
                      diff.summary.riskDelta < 0 ? '📉' : '➡️';
    const riskSign = diff.summary.riskDelta > 0 ? '+' : '';
    lines.push(`${riskEmoji} Risk Score: ${diff.summary.previousRiskScore} → ${diff.summary.currentRiskScore} (${riskSign}${diff.summary.riskDelta})`);
    lines.push('');
    
    // Summary counts
    if (diff.summary.added > 0) {
      lines.push(`➕ New dependencies: ${diff.summary.added}`);
    }
    if (diff.summary.removed > 0) {
      lines.push(`➖ Removed dependencies: ${diff.summary.removed}`);
    }
    if (diff.summary.licenseChanges > 0) {
      lines.push(`🔄 License changes: ${diff.summary.licenseChanges}`);
    }
    if (diff.summary.severityChanges > 0) {
      lines.push(`⚠️  Severity changes: ${diff.summary.severityChanges}`);
    }
    
    // New conflicts
    if (diff.newConflicts.length > 0) {
      lines.push('');
      lines.push('🚨 New Conflicts:');
      for (const conflict of diff.newConflicts) {
        const severity = conflict.dynamicSeverity?.level || 'unknown';
        lines.push(`  • ${conflict.dependency.name} (${conflict.dependency.license}) - ${severity.toUpperCase()}`);
      }
    }
    
    // Resolved conflicts
    if (diff.resolvedConflicts.length > 0) {
      lines.push('');
      lines.push('✅ Resolved Conflicts:');
      for (const conflict of diff.resolvedConflicts) {
        lines.push(`  • ${conflict.dependency.name} - No longer flagged`);
      }
    }
    
    // Detailed changes
    if (diff.changes.length > 0) {
      lines.push('');
      lines.push('📝 Detailed Changes:');
      
      for (const change of diff.changes) {
        const impactIcon = change.impact === 'positive' ? '✅' :
                          change.impact === 'negative' ? '⚠️' : '•';
        lines.push(`  ${impactIcon} ${change.description}`);
      }
    }
    
    return lines.join('\n');
  }
}
