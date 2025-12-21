/**
 * README Badge Generator
 * 
 * Generates shields.io badges for README files.
 * Supports markdown, HTML, and RST formats.
 */

export interface BadgeOptions {
  format: 'markdown' | 'html' | 'rst' | 'url';
  style?: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge' | 'social';
  label?: string;
}

export interface BadgeResult {
  badge: string;
  url: string;
  risk: string;
  color: string;
}

/**
 * Badge Generator for Codicense scan results
 */
export class BadgeGenerator {
  /**
   * Generate a badge based on scan results
   */
  static generate(
    riskScore: number,
    conflictCount: number,
    options: BadgeOptions = { format: 'markdown' }
  ): BadgeResult {
    const risk = this.getRiskLevel(riskScore, conflictCount);
    const color = this.getColor(risk);
    const label = options.label || 'License Risk';
    const style = options.style || 'flat';
    
    // Build shields.io URL
    const encodedLabel = encodeURIComponent(label);
    const encodedRisk = encodeURIComponent(risk);
    const url = `https://img.shields.io/badge/${encodedLabel}-${encodedRisk}-${color}?style=${style}`;
    
    // Format output based on requested format
    let badge: string;
    
    switch (options.format) {
      case 'html':
        badge = `<img alt="${label}: ${risk}" src="${url}">`;
        break;
      
      case 'rst':
        badge = `.. image:: ${url}\n   :alt: ${label}: ${risk}`;
        break;
      
      case 'url':
        badge = url;
        break;
      
      case 'markdown':
      default:
        badge = `![${label}: ${risk}](${url})`;
        break;
    }
    
    return { badge, url, risk, color };
  }
  
  /**
   * Generate multiple badges (risk + conflicts)
   */
  static generateAll(
    riskScore: number,
    conflictCount: number,
    options: BadgeOptions = { format: 'markdown' }
  ): string[] {
    const badges: string[] = [];
    
    // Risk badge
    badges.push(this.generate(riskScore, conflictCount, options).badge);
    
    // Conflicts badge
    const conflictBadge = this.generateConflictBadge(conflictCount, options);
    badges.push(conflictBadge.badge);
    
    // Scan badge
    const scanBadge = this.generateScanBadge(options);
    badges.push(scanBadge.badge);
    
    return badges;
  }
  
  /**
   * Generate conflict count badge
   */
  static generateConflictBadge(
    conflictCount: number,
    options: BadgeOptions = { format: 'markdown' }
  ): BadgeResult {
    const label = 'Conflicts';
    const value = conflictCount.toString();
    const color = conflictCount === 0 ? 'brightgreen' :
                  conflictCount <= 2 ? 'yellow' :
                  conflictCount <= 5 ? 'orange' : 'red';
    const style = options.style || 'flat';
    
    const url = `https://img.shields.io/badge/${label}-${value}-${color}?style=${style}`;
    
    let badge: string;
    switch (options.format) {
      case 'html':
        badge = `<img alt="${label}: ${value}" src="${url}">`;
        break;
      case 'rst':
        badge = `.. image:: ${url}\n   :alt: ${label}: ${value}`;
        break;
      case 'url':
        badge = url;
        break;
      default:
        badge = `![${label}: ${value}](${url})`;
    }
    
    return { badge, url, risk: value, color };
  }
  
  /**
   * Generate "Scanned by Codicense" badge
   */
  static generateScanBadge(
    options: BadgeOptions = { format: 'markdown' }
  ): BadgeResult {
    const label = 'license scan';
    const value = 'codicense';
    const color = 'blue';
    const style = options.style || 'flat';
    
    const url = `https://img.shields.io/badge/${encodeURIComponent(label)}-${value}-${color}?style=${style}`;
    
    let badge: string;
    switch (options.format) {
      case 'html':
        badge = `<img alt="License scan by Codicense" src="${url}">`;
        break;
      case 'rst':
        badge = `.. image:: ${url}\n   :alt: License scan by Codicense`;
        break;
      case 'url':
        badge = url;
        break;
      default:
        badge = `![license scan: codicense](${url})`;
    }
    
    return { badge, url, risk: value, color };
  }
  
  /**
   * Get risk level from score
   */
  private static getRiskLevel(riskScore: number, conflictCount: number): string {
    if (conflictCount === 0 && riskScore === 0) return 'CLEAR';
    if (riskScore <= 10) return 'LOW';
    if (riskScore <= 30) return 'MEDIUM';
    if (riskScore <= 60) return 'HIGH';
    return 'CRITICAL';
  }
  
  /**
   * Get badge color for risk level
   */
  private static getColor(risk: string): string {
    switch (risk) {
      case 'CLEAR': return 'brightgreen';
      case 'LOW': return 'green';
      case 'MEDIUM': return 'yellow';
      case 'HIGH': return 'orange';
      case 'CRITICAL': return 'red';
      default: return 'lightgrey';
    }
  }
  
  /**
   * Format badges for README output
   */
  static formatForReadme(
    riskScore: number,
    conflictCount: number,
    options: BadgeOptions = { format: 'markdown' }
  ): string {
    const badges = this.generateAll(riskScore, conflictCount, options);
    
    const lines: string[] = [];
    lines.push('## License Compliance');
    lines.push('');
    lines.push(badges.join(' '));
    lines.push('');
    lines.push('*Scanned by [Codicense](https://github.com/codicense/codicense)*');
    
    return lines.join('\n');
  }
  
  /**
   * Get CLI output for badge command
   */
  static formatForCLI(
    riskScore: number,
    conflictCount: number,
    format: 'markdown' | 'html' | 'rst' | 'url' = 'markdown'
  ): string {
    const result = this.generate(riskScore, conflictCount, { format });
    
    const lines: string[] = [];
    lines.push('📛 Badge Generated');
    lines.push('');
    lines.push(`Risk Level: ${result.risk}`);
    lines.push('');
    lines.push('Copy this to your README:');
    lines.push('');
    lines.push(result.badge);
    lines.push('');
    lines.push(`Direct URL: ${result.url}`);
    
    return lines.join('\n');
  }
}
