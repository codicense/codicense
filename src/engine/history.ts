/**
 * Anonymous Local History & Trends
 * 
 * Stores scan history locally for trend analysis.
 * No cloud. No login. Completely local.
 */

import fs from 'fs';
import path from 'path';

export interface HistoryEntry {
  scanId: string;
  timestamp: string;
  commitSha?: string;
  branch?: string;
  riskScore: number;
  conflictCount: number;
  totalDependencies: number;
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface TrendAnalysis {
  direction: 'improving' | 'worsening' | 'stable';
  riskTrend: number; // positive = getting worse
  conflictTrend: number;
  recentScans: number;
  averageRiskScore: number;
  bestScore: number;
  worstScore: number;
  lastImprovement?: string;
  summary: string;
}

const HISTORY_DIR = '.codicense';
const HISTORY_FILE = 'history.json';
const MAX_HISTORY_ENTRIES = 100;

/**
 * Local Scan History Manager
 */
export class ScanHistory {
  private historyPath: string;
  private entries: HistoryEntry[] = [];
  
  constructor(projectPath: string) {
    this.historyPath = path.join(projectPath, HISTORY_DIR, HISTORY_FILE);
    this.load();
  }
  
  /**
   * Load history from disk
   */
  private load(): void {
    try {
      if (fs.existsSync(this.historyPath)) {
        const content = fs.readFileSync(this.historyPath, 'utf8');
        const data = JSON.parse(content);
        this.entries = Array.isArray(data.entries) ? data.entries : [];
      }
    } catch {
      this.entries = [];
    }
  }
  
  /**
   * Save history to disk
   */
  private save(): void {
    try {
      const dir = path.dirname(this.historyPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const data = {
        version: '1.0',
        entries: this.entries,
      };
      
      fs.writeFileSync(this.historyPath, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Silently fail - history is not critical
    }
  }
  
  /**
   * Add a scan to history
   */
  addEntry(entry: HistoryEntry): void {
    this.entries.unshift(entry);
    
    // Trim old entries
    if (this.entries.length > MAX_HISTORY_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_HISTORY_ENTRIES);
    }
    
    this.save();
  }
  
  /**
   * Get all entries
   */
  getEntries(): HistoryEntry[] {
    return [...this.entries];
  }
  
  /**
   * Get recent entries
   */
  getRecent(count: number = 10): HistoryEntry[] {
    return this.entries.slice(0, count);
  }
  
  /**
   * Get entry by scan ID
   */
  getEntry(scanId: string): HistoryEntry | undefined {
    return this.entries.find(e => e.scanId === scanId);
  }
  
  /**
  * Get most recent prior scan
   */
  getPreviousScan(): HistoryEntry | undefined {
    return this.entries[0]; // Most recent is the previous
  }
  
  /**
   * Analyze trends
   */
  analyzeTrends(): TrendAnalysis {
    if (this.entries.length === 0) {
      return {
        direction: 'stable',
        riskTrend: 0,
        conflictTrend: 0,
        recentScans: 0,
        averageRiskScore: 0,
        bestScore: 0,
        worstScore: 0,
        summary: 'No scan history available. Run more scans to see trends.',
      };
    }
    
    const recent = this.entries.slice(0, 10);
    const riskScores = recent.map(e => e.riskScore);
    const conflictCounts = recent.map(e => e.conflictCount);
    
    // Calculate averages
    const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;
    const avgConflicts = conflictCounts.reduce((a, b) => a + b, 0) / conflictCounts.length;
    
    // Calculate trends (positive = getting worse)
    const riskTrend = recent.length >= 2 
      ? recent[0].riskScore - recent[recent.length - 1].riskScore
      : 0;
    
    const conflictTrend = recent.length >= 2
      ? recent[0].conflictCount - recent[recent.length - 1].conflictCount
      : 0;
    
    // Determine direction
    let direction: 'improving' | 'worsening' | 'stable' = 'stable';
    if (riskTrend < -5 || conflictTrend < -1) {
      direction = 'improving';
    } else if (riskTrend > 5 || conflictTrend > 1) {
      direction = 'worsening';
    }
    
    // Find best/worst
    const bestScore = Math.min(...riskScores);
    const worstScore = Math.max(...riskScores);
    
    // Find last improvement
    let lastImprovement: string | undefined;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i - 1].riskScore < recent[i].riskScore) {
        lastImprovement = recent[i - 1].timestamp;
        break;
      }
    }
    
    // Generate summary
    let summary: string;
    if (direction === 'improving') {
      summary = `Risk score improving! Down ${Math.abs(riskTrend)} points over last ${recent.length} scans.`;
    } else if (direction === 'worsening') {
      summary = `⚠️ Risk score increasing. Up ${riskTrend} points. Review recent dependency changes.`;
    } else {
      summary = `Risk score stable at ~${Math.round(avgRisk)}. ${avgConflicts > 0 ? `${Math.round(avgConflicts)} average conflicts.` : 'No conflicts.'}`;
    }
    
    return {
      direction,
      riskTrend,
      conflictTrend,
      recentScans: recent.length,
      averageRiskScore: Math.round(avgRisk),
      bestScore,
      worstScore,
      lastImprovement,
      summary,
    };
  }
  
  /**
   * Format trends for display
   */
  static formatTrends(trends: TrendAnalysis): string {
    const lines: string[] = [];
    
    const icon = trends.direction === 'improving' ? '📉' :
                 trends.direction === 'worsening' ? '📈' : '➡️';
    
    lines.push(`${icon} Risk Trend: ${trends.direction.toUpperCase()}`);
    lines.push('');
    lines.push(trends.summary);
    lines.push('');
    
    if (trends.recentScans > 0) {
      lines.push(`📊 Statistics (last ${trends.recentScans} scans):`);
      lines.push(`   Average Risk Score: ${trends.averageRiskScore}`);
      lines.push(`   Best Score: ${trends.bestScore}`);
      lines.push(`   Worst Score: ${trends.worstScore}`);
      
      if (trends.riskTrend !== 0) {
        const sign = trends.riskTrend > 0 ? '+' : '';
        lines.push(`   Risk Delta: ${sign}${trends.riskTrend}`);
      }
      
      if (trends.lastImprovement) {
        lines.push(`   Last Improvement: ${trends.lastImprovement}`);
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Format history entries for display
   */
  static formatHistory(entries: HistoryEntry[]): string {
    if (entries.length === 0) {
      return 'No scan history available.';
    }
    
    const lines: string[] = [];
    lines.push('📜 Scan History');
    lines.push('');
    
    for (const entry of entries.slice(0, 10)) {
      const date = new Date(entry.timestamp).toLocaleString();
      const riskIcon = entry.riskScore > 50 ? '🔴' :
                       entry.riskScore > 20 ? '🟡' : '🟢';
      
      let line = `${riskIcon} ${date} - Risk: ${entry.riskScore}`;
      if (entry.conflictCount > 0) {
        line += ` (${entry.conflictCount} conflicts)`;
      }
      if (entry.commitSha) {
        line += ` [${entry.commitSha.substring(0, 7)}]`;
      }
      
      lines.push(line);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Clear history
   */
  clear(): void {
    this.entries = [];
    this.save();
  }
}
