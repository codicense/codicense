/**
 * ASCII Dependency Tree Visualizer
 * 
 * Renders dependency conflict paths as ASCII trees.
 */

import type { ConflictPath } from '../ili/types';
import type { DependencyNode } from '../types';

export class ASCIIVisualizer {
  /**
   * Render a conflict path as an ASCII tree
   */
  static renderConflictTree(
    path: ConflictPath,
    projectName: string,
    projectLicense: string
  ): string {
    const lines: string[] = [];
    
    // Root
    lines.push(`${projectName} (${projectLicense})`);
    
    // Path nodes
    for (let i = 1; i < path.path.length; i++) {
      const indent = '  '.repeat(i);
      const isLast = i === path.path.length - 1;
      const connector = isLast ? '└─' : '├─';
      const marker = isLast ? '❌ ← ENTRY POINT' : '  ';
      
      lines.push(`${indent}${connector} ${marker} ${path.path[i]} (${path.licenses[i]})`);
    }

    return lines.join('\n');
  }

  /**
   * Render full dependency tree (for visualization)
   */
  static renderFullTree(root: DependencyNode, maxDepth = 5): string {
    const lines: string[] = [];
    this.renderNode(root, '', true, 0, maxDepth, lines);
    return lines.join('\n');
  }

  private static renderNode(
    node: DependencyNode,
    prefix: string,
    isLast: boolean,
    depth: number,
    maxDepth: number,
    lines: string[]
  ): void {
    if (depth > maxDepth) return;

    const connector = isLast ? '└─' : '├─';
    const line = depth === 0 
      ? `${node.name} (${node.license})`
      : `${prefix}${connector} ${node.name} (${node.license})`;
    
    lines.push(line);

    if (node.children.length === 0) return;

    const childPrefix = depth === 0 ? '' : prefix + (isLast ? '  ' : '│ ');
    
    for (let i = 0; i < node.children.length; i++) {
      const isLastChild = i === node.children.length - 1;
      this.renderNode(node.children[i], childPrefix, isLastChild, depth + 1, maxDepth, lines);
    }
  }

  /**
   * Render conflict summary box
   */
  static renderConflictBox(
    depName: string,
    depLicense: string,
    severity: string,
    obligation: string | undefined,
    fixSummary: string | undefined
  ): string {
    const width = 70;
    const border = '━'.repeat(width);
    
    const lines: string[] = [];
    const topLine = `${this.severityIcon(severity)} ${severity.toUpperCase()}: ${depName}`;
    const obligationLines = this.wrap(obligation || '', width - 14);
    const fixLines = this.wrap(fixSummary || '', width - 2);
    
    lines.push(`┏${border}┓`);
    lines.push(`┃ ${this.pad(topLine, width)} ┃`);
    lines.push(`┣${border}┫`);
    lines.push(`┃ License: ${this.pad(depLicense, width - 10)} ┃`);
    lines.push(`┃ Obligation: ${this.pad(obligationLines[0] || '', width - 14)} ┃`);
    for (let i = 1; i < obligationLines.length; i++) {
      lines.push(`┃             ${this.pad(obligationLines[i], width - 14)} ┃`);
    }
    lines.push(`┣${border}┫`);
    lines.push(`┃ ${this.pad('Quick Fix:', width)} ┃`);
    for (const fixLine of fixLines) {
      lines.push(`┃ ${this.pad(fixLine, width)} ┃`);
    }
    lines.push(`┗${border}┛`);
    
    return lines.join('\n');
  }

  private static severityIcon(severity: string): string {
    const icons: Record<string, string> = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      safe: '✅',
    };
    return icons[severity.toLowerCase()] || '⚪';
  }

  private static pad(text: string, width: number): string {
    return text.padEnd(width).substring(0, width);
  }

  private static wrap(text: string, width: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
      if ((current + ' ' + word).length <= width) {
        current = current ? `${current} ${word}` : word;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
    return lines;
  }
}

