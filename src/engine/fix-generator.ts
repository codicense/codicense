import { Conflict, ScanResult } from '../types.js';
import { licenseFixEngine } from '../licensefix/index.js';

export interface FixStrategy {
  type: 'replace' | 'isolate' | 'dual-license' | 'remove' | 'negotiate';
  targetPackage: string;
  alternatives?: string[];
  reasoning: string;
  effort: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface FixPR {
  title: string;
  description: string;
  changes: FixChange[];
  strategies: FixStrategy[];
  estimatedRiskReduction: number;
}

export interface FixChange {
  file: string;
  type: 'dependency-update' | 'config-change' | 'code-refactor' | 'documentation';
  before: string;
  after: string;
  explanation: string;
}

export class FixGenerator {
  generateFixes(scanResult: ScanResult): FixPR[] {
    if (scanResult.conflicts.length === 0) {
      return [];
    }

    const fixesByConflict = scanResult.conflicts.map((conflict) =>
      this.generateFixForConflict(conflict, scanResult)
    );

    return this.mergeFixes(fixesByConflict);
  }

  private generateFixForConflict(conflict: Conflict, scanResult: ScanResult): FixPR {
    const strategies = this.selectStrategies(conflict, scanResult);

    const changes = strategies.flatMap((strategy) =>
      this.generateChangesForStrategy(strategy, conflict)
    );

    return {
      title: this.generatePRTitle(conflict),
      description: this.generatePRDescription(conflict, strategies),
      changes,
      strategies,
      estimatedRiskReduction: this.estimateRiskReduction(strategies),
    };
  }

  private selectStrategies(conflict: Conflict, _scanResult: ScanResult): FixStrategy[] {
    const strategies: FixStrategy[] = [];

    // Strategy 1: Replace with permissive alternative
    const alternatives = this.findAlternatives(
      conflict.dependency.license,
      conflict.dependency.name
    );
    if (alternatives.length > 0) {
      strategies.push({
        type: 'replace',
        targetPackage: conflict.dependency.name,
        alternatives,
        reasoning: `Replace ${conflict.dependency.name} with a permissive-licensed alternative`,
        effort: 'medium',
        riskLevel: 'low',
      });
    }

    // Strategy 2: Isolate GPL/AGPL into microservice
    if (
      conflict.dependency.license === 'GPL-2.0' ||
      conflict.dependency.license === 'GPL-3.0' ||
      conflict.dependency.license === 'AGPL-3.0'
    ) {
      strategies.push({
        type: 'isolate',
        targetPackage: conflict.dependency.name,
        reasoning: `Isolate ${conflict.dependency.name} into a separate microservice to avoid contamination`,
        effort: 'high',
        riskLevel: 'medium',
      });
    }

    // Strategy 3: Negotiate dual licensing
    if (conflict.severity === 'HIGH' || conflict.severity === 'CRITICAL') {
      strategies.push({
        type: 'negotiate',
        targetPackage: conflict.dependency.name,
        reasoning: `Contact maintainers of ${conflict.dependency.name} to negotiate dual licensing (GPL/MIT)`,
        effort: 'high',
        riskLevel: 'high',
      });
    }

    // Strategy 4: Remove unused dependency
    if (this.isOptionalDependency(conflict.dependency.name)) {
      strategies.push({
        type: 'remove',
        targetPackage: conflict.dependency.name,
        reasoning: `Remove unused optional dependency ${conflict.dependency.name}`,
        effort: 'low',
        riskLevel: 'low',
      });
    }

    return strategies;
  }

  private generateChangesForStrategy(
    strategy: FixStrategy,
    conflict: Conflict
  ): FixChange[] {
    const changes: FixChange[] = [];

    switch (strategy.type) {
      case 'replace':
        if (strategy.alternatives && strategy.alternatives.length > 0) {
          const alternative = strategy.alternatives[0];
          changes.push({
            file: 'package.json',
            type: 'dependency-update',
            before: `"${strategy.targetPackage}": "^2.0.0"`,
            after: `"${alternative}": "^1.0.0"`,
            explanation: `Replace GPL-licensed ${strategy.targetPackage} with permissive-licensed ${alternative}`,
          });
        }
        break;

      case 'isolate':
        changes.push(
          {
            file: '.codicense.yml',
            type: 'config-change',
            before: `distribution_model: proprietary`,
            after: `distribution_model: proprietary\nisolated_services:\n  - package: ${strategy.targetPackage}\n    reason: "GPL containment"`,
            explanation: 'Mark package as isolated to prevent contamination',
          },
          {
            file: 'README.md',
            type: 'documentation',
            before: '## Architecture',
            after: `## Architecture\n\n### Isolated Services\n- **${strategy.targetPackage}**: Runs in separate process (GPL-${conflict.dependency.license.split('-')[1]})`,
            explanation: 'Document architectural change for legal compliance',
          }
        );
        break;

      case 'remove':
        changes.push({
          file: 'package.json',
          type: 'dependency-update',
          before: `"${strategy.targetPackage}": "^2.0.0",`,
          after: '',
          explanation: `Remove unused dependency ${strategy.targetPackage}`,
        });
        break;

      case 'negotiate':
      case 'dual-license':
        changes.push({
          file: 'LEGAL.md',
          type: 'documentation',
          before: '# License Exceptions',
          after: `# License Exceptions\n\n## ${strategy.targetPackage}\n- Status: Pending dual license negotiation\n- Target: GPL-${conflict.dependency.license.split('-')[1]} → MIT/Apache-2.0\n- Contact: [maintainer email]\n- Deadline: [date]`,
          explanation: 'Track licensing negotiation with maintainers',
        });
        break;
    }

    return changes;
  }

  private findAlternatives(licenseId: string, packageName: string): string[] {
    const result = licenseFixEngine.searchAlternatives(packageName, licenseId, {
      limit: 3,
      minConfidence: 0.6,
    });

    return result.alternatives.map((alt) => alt.package);
  }

  private isOptionalDependency(_packageName: string): boolean {
    return false;
  }

  private generatePRTitle(conflict: Conflict): string {
    return `fix: Resolve ${conflict.dependency.license} license conflict in ${conflict.dependency.name}`;
  }

  private generatePRDescription(conflict: Conflict, strategies: FixStrategy[]): string {
    const strategiesText = strategies
      .map(
        (s) =>
          `### ${s.type.charAt(0).toUpperCase() + s.type.slice(1)}\n` +
          `- Effort: ${s.effort}\n` +
          `- Risk: ${s.riskLevel}\n` +
          `- Reasoning: ${s.reasoning}`
      )
      .join('\n\n');

    return (
      `## Automated License Conflict Fix\n\n` +
      `This PR resolves a **${conflict.severity}** license conflict detected by CODICENSE.\n\n` +
      `**Conflict Details:**\n` +
      `- Package: ${conflict.dependency.name}\n` +
      `- License: ${conflict.dependency.license}\n` +
      `- Issue: ${conflict.reason}\n` +
      `- Path: ${conflict.contaminationPath.join(' → ')}\n\n` +
      `## Proposed Solutions\n\n${strategiesText}\n\n` +
      `## Recommended Action\n` +
      `Start with: **${strategies[0]?.type || 'manual review'}** (lowest effort)\n\n` +
      `---\n` +
      `*Generated by CODICENSE License Compliance Engine*`
    );
  }

  private estimateRiskReduction(strategies: FixStrategy[]): number {
    // Calculate percentage risk reduction from applying these fixes
    let reduction = 0;

    for (const strategy of strategies) {
      if (strategy.type === 'replace' && strategy.riskLevel === 'low') {
        reduction += 80;
      } else if (strategy.type === 'isolate') {
        reduction += 60;
      } else if (strategy.type === 'remove') {
        reduction += 100;
      } else if (strategy.type === 'negotiate') {
        reduction += 50;
      }
    }

    return Math.min(100, reduction);
  }

  private mergeFixes(fixesByConflict: FixPR[]): FixPR[] {
    if (fixesByConflict.length === 0) {
      return [];
    }

    if (fixesByConflict.length === 1) {
      return fixesByConflict;
    }

    // Merge multiple fixes into a single comprehensive PR
    const mergedPR: FixPR = {
      title: 'fix: Resolve multiple license conflicts',
      description: this.mergePRDescriptions(fixesByConflict),
      changes: fixesByConflict.flatMap((fix) => fix.changes),
      strategies: fixesByConflict.flatMap((fix) => fix.strategies),
      estimatedRiskReduction: Math.min(
        100,
        Math.max(...fixesByConflict.map((f) => f.estimatedRiskReduction))
      ),
    };

    return [mergedPR];
  }

  private mergePRDescriptions(fixes: FixPR[]): string {
    const conflicts = fixes.map((fix) => `- ${fix.title}`).join('\n');
    return (
      `## Automated License Conflict Fixes\n\n` +
      `This PR resolves **${fixes.length}** license conflicts detected by CODICENSE.\n\n` +
      `**Issues Fixed:**\n${conflicts}\n\n` +
      `See individual sections below for details on each fix.\n\n` +
      `---\n` +
      `*Generated by CODICENSE License Compliance Engine*`
    );
  }
}

export const fixGenerator = new FixGenerator();

