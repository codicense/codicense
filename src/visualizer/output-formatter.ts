/**
 * Output Formatters for Different Modes
 * Supports: markdown, table, sbom (CycloneDX), github-summary
 */

import type { DependencyNode, Conflict } from '../types';

export interface ScanResult {
  projectContext: {
    intent: string;
    license: string;
    distribution: string;
  };
  summary: {
    totalDependencies: number;
    conflicts: number;
    riskScore: number;
  };
  conflicts: Conflict[];
  dependencies: DependencyNode[];
}

export class OutputFormatter {
  /**
   * Format scan results as Markdown
   */
  static toMarkdown(result: ScanResult): string {
    const lines: string[] = [];
    
    lines.push('# License Compliance Report');
    lines.push('');
    lines.push('## Project Context');
    lines.push(`- **Intent**: ${result.projectContext.intent}`);
    lines.push(`- **License**: ${result.projectContext.license}`);
    lines.push(`- **Distribution**: ${result.projectContext.distribution}`);
    lines.push('');
    
    lines.push('## Summary');
    lines.push(`- **Total Dependencies**: ${result.summary.totalDependencies}`);
    lines.push(`- **Conflicts**: ${result.summary.conflicts}`);
    lines.push(`- **Risk Score**: ${result.summary.riskScore}/100`);
    lines.push('');
    
    if (result.conflicts.length > 0) {
      lines.push('## License Conflicts');
      lines.push('');
      lines.push('| Package | Version | License | Severity | Reason |');
      lines.push('|---------|---------|---------|----------|--------|');
      
      for (const conflict of result.conflicts) {
        lines.push(`| ${conflict.dependency.name} | ${conflict.dependency.version} | ${conflict.dependency.license} | ${conflict.severity} | ${conflict.reason} |`);
      }
      lines.push('');
    } else {
      lines.push('✅ No license conflicts detected');
      lines.push('');
    }
    
    return lines.join('\n');
  }

  /**
   * Format scan results as ASCII table
   */
  static toTable(result: ScanResult): string {
    const lines: string[] = [];
    
    lines.push('╔════════════════════════════════════════════════════════════╗');
    lines.push('║         LICENSE COMPLIANCE SCAN RESULTS                    ║');
    lines.push('╚════════════════════════════════════════════════════════════╝');
    lines.push('');
    lines.push(`Intent:        ${result.projectContext.intent}`);
    lines.push(`License:       ${result.projectContext.license}`);
    lines.push(`Distribution:  ${result.projectContext.distribution}`);
    lines.push('');
    lines.push(`Dependencies:  ${result.summary.totalDependencies}`);
    lines.push(`Conflicts:     ${result.summary.conflicts}`);
    lines.push(`Risk Score:    ${result.summary.riskScore}/100`);
    lines.push('');
    
    if (result.conflicts.length > 0) {
      lines.push('CONFLICTS:');
      lines.push('┌────────────────────────┬─────────┬──────────┬──────────┐');
      lines.push('│ Package                │ Version │ License  │ Severity │');
      lines.push('├────────────────────────┼─────────┼──────────┼──────────┤');
      
      for (const conflict of result.conflicts) {
        const pkg = conflict.dependency.name.padEnd(22).substring(0, 22);
        const ver = conflict.dependency.version.padEnd(7).substring(0, 7);
        const lic = conflict.dependency.license.padEnd(8).substring(0, 8);
        const sev = conflict.severity.padEnd(8).substring(0, 8);
        lines.push(`│ ${pkg} │ ${ver} │ ${lic} │ ${sev} │`);
      }
      
      lines.push('└────────────────────────┴─────────┴──────────┴──────────┘');
    } else {
      lines.push('✅ No conflicts detected');
    }
    
    lines.push('');
    return lines.join('\n');
  }

  /**
   * Format scan results as CycloneDX SBOM (JSON)
   */
  static toSBOM(result: ScanResult, projectName: string = 'project'): string {
    const components = result.dependencies.map(dep => ({
      'bom-ref': `pkg:npm/${dep.name}@${dep.version}`,
      type: 'library',
      name: dep.name,
      version: dep.version,
      licenses: dep.license && dep.license !== 'UNKNOWN' ? [
        {
          license: {
            id: dep.license
          }
        }
      ] : undefined,
      purl: `pkg:npm/${dep.name}@${dep.version}`
    }));

    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.4',
      version: 1,
      metadata: {
        timestamp: new Date().toISOString(),
        tools: [
          {
            vendor: 'Codicense',
            name: 'codicense',
            version: '2.0.3'
          }
        ],
        component: {
          type: 'application',
          name: projectName,
          licenses: result.projectContext.license ? [
            {
              license: {
                id: result.projectContext.license
              }
            }
          ] : undefined
        }
      },
      components
    };

    return JSON.stringify(sbom, null, 2);
  }

  /**
   * Format scan results as GitHub Actions Summary (Markdown for GITHUB_STEP_SUMMARY)
   */
  static toGitHubSummary(result: ScanResult): string {
    const lines: string[] = [];
    
    lines.push('## 🔍 License Compliance Scan');
    lines.push('');
    
    const status = result.conflicts.length === 0 ? '✅ PASS' : '❌ FAIL';
    const emoji = result.conflicts.length === 0 ? '✅' : '⚠️';
    
    lines.push(`### ${status}`);
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Dependencies | ${result.summary.totalDependencies} |`);
    lines.push(`| License Conflicts | ${emoji} ${result.summary.conflicts} |`);
    lines.push(`| Risk Score | ${result.summary.riskScore}/100 |`);
    lines.push('');
    
    if (result.conflicts.length > 0) {
      lines.push('### ⚠️ Conflicts Detected');
      lines.push('');
      lines.push('| Package | Version | License | Severity | Reason |');
      lines.push('|---------|---------|---------|----------|--------|');
      
      for (const conflict of result.conflicts) {
        const severityEmoji = conflict.severity === 'CRITICAL' ? '🔴' : 
                             conflict.severity === 'HIGH' ? '🟠' : '🟡';
        lines.push(`| ${conflict.dependency.name} | ${conflict.dependency.version} | ${conflict.dependency.license} | ${severityEmoji} ${conflict.severity} | ${conflict.reason} |`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }
}
