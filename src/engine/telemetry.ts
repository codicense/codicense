/**
 * Scan Telemetry Engine
 * 
 * Provides timing breakdown for scan operations.
 * All data is local-only, no external transmission.
 */

export interface ScanTelemetry {
  totalTime: number;
  breakdown: TelemetryBreakdown;
  timestamp: string;
}

export interface TelemetryBreakdown {
  parsing: number;
  licenseResolution: number;
  riskEngine: number;
  fixGeneration: number;
  visualization: number;
  other: number;
}

export interface TelemetryStep {
  name: keyof TelemetryBreakdown;
  startTime: number;
  endTime?: number;
}

/**
 * Scan Telemetry Tracker
 */
export class ScanTelemetryTracker {
  private startTime: number = 0;
  private steps: TelemetryStep[] = [];
  private currentStep: TelemetryStep | null = null;
  
  /**
   * Start tracking a scan
   */
  start(): void {
    this.startTime = performance.now();
    this.steps = [];
    this.currentStep = null;
  }
  
  /**
   * Start a specific step
   */
  startStep(name: keyof TelemetryBreakdown): void {
    // End previous step if exists
    if (this.currentStep) {
      this.currentStep.endTime = performance.now();
    }
    
    this.currentStep = {
      name,
      startTime: performance.now(),
    };
    this.steps.push(this.currentStep);
  }
  
  /**
   * End the current step
   */
  endStep(): void {
    if (this.currentStep) {
      this.currentStep.endTime = performance.now();
      this.currentStep = null;
    }
  }
  
  /**
   * Finish tracking and get results
   */
  finish(): ScanTelemetry {
    // End any open step
    this.endStep();
    
    const totalTime = performance.now() - this.startTime;
    
    // Calculate breakdown
    const breakdown: TelemetryBreakdown = {
      parsing: 0,
      licenseResolution: 0,
      riskEngine: 0,
      fixGeneration: 0,
      visualization: 0,
      other: 0,
    };
    
    let accounted = 0;
    
    for (const step of this.steps) {
      const duration = (step.endTime || performance.now()) - step.startTime;
      breakdown[step.name] += duration;
      accounted += duration;
    }
    
    // Attribute remaining time to "other"
    breakdown.other = Math.max(0, totalTime - accounted);
    
    return {
      totalTime: Math.round(totalTime),
      breakdown: {
        parsing: Math.round(breakdown.parsing),
        licenseResolution: Math.round(breakdown.licenseResolution),
        riskEngine: Math.round(breakdown.riskEngine),
        fixGeneration: Math.round(breakdown.fixGeneration),
        visualization: Math.round(breakdown.visualization),
        other: Math.round(breakdown.other),
      },
      timestamp: new Date().toISOString(),
    };
  }
  
  /**
   * Format telemetry for display
   */
  static format(telemetry: ScanTelemetry): string {
    const lines: string[] = [];
    const total = telemetry.totalTime;
    
    lines.push(`Scan completed in ${(total / 1000).toFixed(2)}s`);
    
    // Only show breakdown if scan took more than 100ms
    if (total > 100) {
      const b = telemetry.breakdown;
      const items: Array<{ name: string; time: number }> = [
        { name: 'Parsing', time: b.parsing },
        { name: 'License resolution', time: b.licenseResolution },
        { name: 'Risk engine', time: b.riskEngine },
        { name: 'Fix generation', time: b.fixGeneration },
        { name: 'Visualization', time: b.visualization },
      ].filter(i => i.time > 10); // Only show steps > 10ms
      
      if (items.length > 0) {
        lines.push('');
        for (const item of items) {
          const pct = Math.round((item.time / total) * 100);
          const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
          lines.push(`  ${bar} ${item.name}: ${(item.time / 1000).toFixed(2)}s (${pct}%)`);
        }
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * Format telemetry as compact string
   */
  static formatCompact(telemetry: ScanTelemetry): string {
    const b = telemetry.breakdown;
    const parts: string[] = [];
    
    if (b.parsing > 10) parts.push(`Parsing: ${(b.parsing / 1000).toFixed(1)}s`);
    if (b.licenseResolution > 10) parts.push(`License resolution: ${(b.licenseResolution / 1000).toFixed(1)}s`);
    if (b.riskEngine > 10) parts.push(`Risk engine: ${(b.riskEngine / 1000).toFixed(1)}s`);
    
    return `Scan completed in ${(telemetry.totalTime / 1000).toFixed(1)}s` +
           (parts.length > 0 ? `\n• ${parts.join('\n• ')}` : '');
  }
}

// Global telemetry instance
let globalTelemetry: ScanTelemetryTracker | null = null;

/**
 * Get or create global telemetry tracker
 */
export function getTelemetryTracker(): ScanTelemetryTracker {
  if (!globalTelemetry) {
    globalTelemetry = new ScanTelemetryTracker();
  }
  return globalTelemetry;
}

/**
 * Reset global telemetry tracker
 */
export function resetTelemetry(): void {
  globalTelemetry = new ScanTelemetryTracker();
}
