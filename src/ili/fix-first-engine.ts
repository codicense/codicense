import type { FixSuggestion, ConflictPath } from './types';
import type { DependencyNode } from '../types';

/**
 * Fix-First Engine - Never warn without suggesting a solution
 */
export class FixFirstEngine {
  constructor(_projectLicense?: string) {}

  /**
   * Public API expected by tests: generateFixes(depName, depLicense, projectLicense)
   */
  generateFixes(depName: string, depLicense: string, projectLicense?: string): FixSuggestion[] {
    const fixes: FixSuggestion[] = [];

    fixes.push(this.replacement(depName, depLicense));
    fixes.push(this.isolation(depName, depLicense));
    fixes.push(this.removal(depName));
    fixes.push(this.boundaryRefactor(depName));

    // License specific helpers
    if (depLicense.includes('GPL-2.0')) {
      fixes.push(this.upgrade(depName));
    }

    if (depLicense.includes('GPL') && projectLicense && !projectLicense.includes('GPL')) {
      fixes.push(this.dualLicense(depName));
    }

    return (fixes.filter(Boolean) as FixSuggestion[]).sort((a, b) => {
      const rank = { low: 1, medium: 2, high: 3 } as const;
      return rank[a.effort] - rank[b.effort];
    });
  }

  private replacement(depName: string, depLicense: string): FixSuggestion {
    const target = depLicense.includes('GPL') || depLicense.includes('AGPL')
      ? 'a permissive alternative'
      : 'a compatible alternative';

    return {
      effort: 'low',
      strategy: 'replace',
      description: `Replace ${depName} with ${target}`,
      implementation: `npm uninstall ${depName}\nnpm install ${depName}-alternative`,
      tradeoffs: ['Requires API migration', 'May need regression tests'],
      estimatedTime: '30 minutes',
    };
  }

  private isolation(depName: string, depLicense: string): FixSuggestion {
    const fileNote = depLicense.includes('MPL') ? 'file-level copyleft' : 'license boundary';
    return {
      effort: 'medium',
      strategy: 'isolate',
      description: `Isolate ${depName} behind a microservice or plugin boundary (${fileNote})`,
      implementation: 'Expose the functionality via an API / plugin; run the dependency out-of-process for isolation.',
      tradeoffs: ['Adds deployment complexity', 'Introduces latency'],
      estimatedTime: '1-2 days',
    };
  }

  private removal(depName: string): FixSuggestion {
    return {
      effort: 'high',
      strategy: 'remove',
      description: `Remove ${depName} and replace the functionality`,
      implementation: `Evaluate usages of ${depName} and strip or replace the feature.`,
      tradeoffs: ['Lose functionality', 'Requires refactoring'],
      estimatedTime: '6 hours',
    };
  }

  private boundaryRefactor(depName: string): FixSuggestion {
    return {
      effort: 'high',
      strategy: 'boundary-refactor',
      description: `Refactor the boundary that pulls in ${depName}`,
      implementation: 'Consider a plugin architecture, dynamic linking, or reimplement the needed portion.',
      tradeoffs: ['Higher engineering effort', 'Possible functionality loss'],
      estimatedTime: '5-8 hours',
    };
  }

  private upgrade(depName: string): FixSuggestion {
    return {
      effort: 'low',
      strategy: 'upgrade',
      description: `Upgrade ${depName} to a later compatible license (e.g., GPL-3.0)`,
      implementation: 'Upgrade to a compatible license version.',
      tradeoffs: ['Requires testing'],
      estimatedTime: '30 minutes',
    };
  }

  private dualLicense(depName: string): FixSuggestion {
    return {
      effort: 'low',
      strategy: 'dual-license',
      description: `Request or negotiate a dual-license for ${depName}`,
      implementation: 'Contact maintainers for dual-license agreement.',
      tradeoffs: ['May incur cost', 'Requires maintainer cooperation'],
      estimatedTime: '30 minutes',
    };
  }
}

/**
 * Conflict Path Visualizer - Show exact dependency path
 */
export class ConflictPathVisualizer {
  /**
   * Build visual dependency path for a conflict
   */
  static buildPath(
    rootNode: DependencyNode,
    conflictNode: DependencyNode,
    projectLicense: string
  ): ConflictPath {
    const path = this.findPath(rootNode, conflictNode, []);
    
    if (!path) {
      const conflictLicenses = Array.isArray(conflictNode.license) ? conflictNode.license : [conflictNode.license];
      return {
        path: [conflictNode.name],
        licenses: conflictLicenses,
        ruleTriggered: 'direct-conflict',
        humanExplanation: `${conflictNode.name} conflicts with your project license`,
        obligationsInConflict: [],
      };
    }

    const pathNames = path.map((n) => n.name);
    const pathLicenses = path.map((n) => Array.isArray(n.license) ? n.license[0] : n.license);

    const conflictLicense = Array.isArray(conflictNode.license) ? conflictNode.license[0] : conflictNode.license;

    return {
      path: pathNames,
      licenses: pathLicenses,
      ruleTriggered: this.identifyRule(projectLicense, conflictLicense),
      humanExplanation: this.explainPath(pathNames, pathLicenses, projectLicense),
      obligationsInConflict: this.identifyObligations(projectLicense, conflictLicense),
    };
  }

  private static findPath(
    current: DependencyNode,
    target: DependencyNode,
    visited: string[]
  ): DependencyNode[] | null {
    if (current.name === target.name) {
      return [current];
    }

    if (visited.includes(current.name)) {
      return null;
    }

    visited.push(current.name);

    for (const child of current.children) {
      const path = this.findPath(child, target, visited);
      if (path) {
        return [current, ...path];
      }
    }

    return null;
  }

  private static identifyRule(projectLicense: string, depLicense: string): string {
    if (depLicense.includes('GPL') && !projectLicense.includes('GPL')) {
      return 'copyleft-contamination';
    }
    if (depLicense.includes('AGPL')) {
      return 'network-copyleft';
    }
    if (depLicense.includes('LGPL')) {
      return 'weak-copyleft-static-link';
    }
    return 'license-mismatch';
  }

  private static explainPath(
    pathNames: string[],
    pathLicenses: string[],
    projectLicense: string
  ): string {
    const chain = pathNames.map((name, i) => `${name} (${pathLicenses[i]})`).join(' → ');
    const conflictLicense = pathLicenses[pathLicenses.length - 1];
    
    return `Your project uses ${projectLicense}, but depends on ${conflictLicense} through: ${chain}. The ${conflictLicense} license requires derivative works to also be ${conflictLicense}, which conflicts with ${projectLicense}.`;
  }

  private static identifyObligations(_projectLicense: string, depLicense: string): string[] {
    const obligations: string[] = [];

    if (depLicense.includes('GPL') || depLicense.includes('AGPL')) {
      obligations.push('Source code disclosure required');
      obligations.push('Derivative works must use same license');
      obligations.push('License and copyright notices must be preserved');
    }

    if (depLicense.includes('LGPL')) {
      obligations.push('Allow relinking with modified library versions');
      obligations.push('Disclose modifications to the library');
    }

    if (depLicense.includes('MPL')) {
      obligations.push('Disclose source of modified files only');
    }

    return obligations;
  }

  /**
   * Render ASCII tree visualization
   */
  static renderTree(path: ConflictPath, projectName: string, projectLicense: string): string {
    const lines: string[] = [];
    lines.push(`${projectName} (${projectLicense})`);

    for (let i = 1; i < path.path.length; i++) {
      const indent = '  '.repeat(i);
      const connector = i === path.path.length - 1 ? '└─' : '├─';
      lines.push(`${indent}${connector} ${path.path[i]} (${path.licenses[i]})`);
    }

    return lines.join('\n');
  }
}

