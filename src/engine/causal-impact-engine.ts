/**
 * Causal Impact Engine
 * Quantifies how much risk each dependency contributes by simulating its removal.
 * Deterministic and offline: uses existing conflict data and severity weights.
 */

import type { Conflict, Severity } from '../types.js';

export interface CausalImpact {
  packageName: string;
  riskContribution: number; // percentage of current risk penalty explained by this node
  conflictsRemoved: number;
  severityBreakdown: Record<Severity, number>;
  riskScoreAfterRemoval: number; // hypothetical risk score if this node were removed
}

const SEVERITY_WEIGHT: Record<Severity, number> = {
  CRITICAL: 30,
  HIGH: 15,
  MEDIUM: 5,
  LOW: 2,
};

/**
 * Computes risk contribution per dependency by attributing each conflict's severity
 * weight to every package along its contamination path (including the conflicting leaf).
 */
export class CausalImpactEngine {
  analyze(conflicts: Conflict[], currentRiskScore: number): CausalImpact[] {
    const baselinePenalty = Math.max(0, 100 - currentRiskScore);
    if (conflicts.length === 0 || baselinePenalty === 0) {
      return [];
    }

    const byPackage = new Map<string, { weight: number; conflicts: number; severity: Record<Severity, number> }>();

    for (const conflict of conflicts) {
      const weight = SEVERITY_WEIGHT[conflict.severity];
      const pathNodes = this.extractPathNodes(conflict);

      for (const node of pathNodes) {
        if (!byPackage.has(node)) {
          byPackage.set(node, {
            weight: 0,
            conflicts: 0,
            severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
          });
        }
        const entry = byPackage.get(node)!;
        entry.weight += weight;
        entry.conflicts += 1;
        entry.severity[conflict.severity] += 1;
      }
    }

    const impacts: CausalImpact[] = [];

    for (const [pkg, data] of byPackage.entries()) {
      const contributionPct = baselinePenalty === 0 ? 0 : Math.min(100, (data.weight / baselinePenalty) * 100);
      const riskScoreAfterRemoval = Math.min(100, currentRiskScore + data.weight);

      impacts.push({
        packageName: pkg,
        riskContribution: Number(contributionPct.toFixed(2)),
        conflictsRemoved: data.conflicts,
        severityBreakdown: data.severity,
        riskScoreAfterRemoval,
      });
    }

    return impacts.sort((a, b) => b.riskContribution - a.riskContribution || b.conflictsRemoved - a.conflictsRemoved || a.packageName.localeCompare(b.packageName));
  }

  private extractPathNodes(conflict: Conflict): string[] {
    if (conflict.contaminationPath && conflict.contaminationPath.length > 0) {
      return conflict.contaminationPath
        .slice(1) // skip project root
        .map((segment) => this.stripLicense(segment))
        .filter(Boolean);
    }
    return [conflict.dependency.name];
  }

  private stripLicense(segment: string): string {
    // Segments are like "your-app (MIT)" or "tiny-lib (GPL-3.0) ← CONFLICT".
    const trimmed = segment.replace(' ← CONFLICT', '').trim();
    const parenIndex = trimmed.indexOf('(');
    if (parenIndex > 0) {
      return trimmed.slice(0, parenIndex).trim();
    }
    return trimmed;
  }
}

export const causalImpactEngine = new CausalImpactEngine();
