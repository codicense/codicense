/**
 * Path Visualizer - Dependency conflict path analysis
 * 
 * Builds and visualizes license conflict propagation paths.
 */

import type { ConflictPath } from '../ili/types';
import type { DependencyNode, Conflict } from '../types';

export class PathVisualizer {
  /**
   * Build conflict path from root to conflicting dependency
   */
  static buildConflictPath(
    root: DependencyNode,
    conflict: Conflict,
    projectLicense: string
  ): ConflictPath {
    const targetNode = this.findNode(root, conflict.dependency.name);
    
    if (!targetNode) {
      // Direct conflict (shouldn't happen but handle gracefully)
      return {
        path: [root.name, conflict.dependency.name],
        licenses: [projectLicense, conflict.dependency.license],
        ruleTriggered: conflict.triggeredRule?.id || 'unknown',
        humanExplanation: conflict.reason,
        obligationsInConflict: this.extractObligations(conflict.dependency.license),
      };
    }

    const path = this.tracePath(root, targetNode);
    const pathNames = path.map((n) => n.name);
    const pathLicenses = path.map((n) => Array.isArray(n.license) ? n.license[0] : n.license);

    return {
      path: pathNames,
      licenses: pathLicenses,
      ruleTriggered: conflict.triggeredRule?.id || this.inferRule(projectLicense, conflict.dependency.license),
      humanExplanation: this.buildExplanation(pathNames, pathLicenses, projectLicense, conflict.dependency.license),
      obligationsInConflict: this.extractObligations(conflict.dependency.license),
    };
  }

  /**
   * Find a node in the dependency tree
   */
  private static findNode(root: DependencyNode, targetName: string): DependencyNode | null {
    if (root.name === targetName) return root;

    for (const child of root.children) {
      const found = this.findNode(child, targetName);
      if (found) return found;
    }

    return null;
  }

  /**
   * Trace path from root to target
   */
  private static tracePath(root: DependencyNode, target: DependencyNode): DependencyNode[] {
    const path = this.findPathRecursive(root, target, []);
    return path || [root, target];
  }

  private static findPathRecursive(
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
      const path = this.findPathRecursive(child, target, visited);
      if (path) {
        return [current, ...path];
      }
    }

    return null;
  }

  /**
   * Infer rule from licenses
   */
  private static inferRule(projectLicense: string, depLicense: string): string {
    if (depLicense.includes('GPL') && !projectLicense.includes('GPL')) {
      return 'copyleft-contamination';
    }
    if (depLicense.includes('AGPL')) {
      return 'network-copyleft';
    }
    if (depLicense.includes('LGPL')) {
      return 'weak-copyleft';
    }
    if (depLicense.includes('MPL')) {
      return 'file-level-copyleft';
    }
    return 'license-incompatibility';
  }

  /**
   * Build human explanation of the conflict path
   */
  private static buildExplanation(
    pathNames: string[],
    pathLicenses: string[],
    projectLicense: string,
    conflictLicense: string
  ): string {
    const chain = pathNames
      .map((name, i) => `${name} (${pathLicenses[i]})`)
      .join(' → ');

    const lastPkg = pathNames[pathNames.length - 1];

    return `Your project uses ${projectLicense}, but includes ${lastPkg} licensed under ${conflictLicense}. The dependency chain is: ${chain}. ${this.explainObligation(conflictLicense, projectLicense)}`;
  }

  /**
   * Explain the specific obligation conflict
   */
  private static explainObligation(depLicense: string, projectLicense: string): string {
    if (depLicense.includes('GPL') || depLicense.includes('AGPL')) {
      return `${depLicense} requires that derivative works be distributed under the same license, which creates an incompatibility with ${projectLicense}.`;
    }
    if (depLicense.includes('LGPL')) {
      return `${depLicense} requires allowing users to relink with modified versions, which may conflict with ${projectLicense} distribution terms.`;
    }
    if (depLicense.includes('MPL')) {
      return `${depLicense} requires disclosing source code for any modified files, which may affect ${projectLicense} compliance.`;
    }
    return `${depLicense} has licensing requirements that may be incompatible with ${projectLicense}.`;
  }

  /**
   * Extract obligations from a license
   */
  private static extractObligations(license: string): string[] {
    const obligations: string[] = [];

    if (license.includes('GPL') || license.includes('AGPL')) {
      obligations.push('Distribute derivative works under the same license');
      obligations.push('Provide source code to users');
      obligations.push('Preserve copyright and license notices');
      if (license.includes('AGPL')) {
        obligations.push('Provide source code to network users (AGPL only)');
      }
    } else if (license.includes('LGPL')) {
      obligations.push('Allow relinking with modified library versions');
      obligations.push('Disclose modifications to the library itself');
    } else if (license.includes('MPL')) {
      obligations.push('Disclose source code of modified files only');
      obligations.push('Preserve license notices in modified files');
    } else if (['MIT', 'Apache', 'BSD', 'ISC'].some((l) => license.includes(l))) {
      obligations.push('Include copyright and license notices');
      if (license.includes('Apache')) {
        obligations.push('State significant changes made');
      }
    }

    return obligations;
  }
}

