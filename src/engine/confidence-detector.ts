/**
 * License Confidence Detection Engine
 * 
 * Provides confidence scores for license detection, reducing "UNKNOWN" anxiety.
 */

export interface LicenseConfidence {
  license: string;
  confidence: number; // 0.0 - 1.0
  sources: LicenseSource[];
  suggestion?: string;
}

export interface LicenseSource {
  type: 'lockfile' | 'license-file' | 'package-json' | 'registry-classifier' | 'spdx-expression' | 'readme-scan' | 'github-api';
  value: string;
  weight: number;
}

export interface ConfidenceResult {
  license: string;
  confidence: number;
  sources: LicenseSource[];
  isUnknown: boolean;
  suggestion: string;
}

/**
 * Detects license with confidence scoring
 */
export class ConfidenceDetector {
  private static readonly SOURCE_WEIGHTS: Record<LicenseSource['type'], number> = {
    'license-file': 0.95,
    'spdx-expression': 0.90,
    'package-json': 0.85,
    'registry-classifier': 0.80,
    'lockfile': 0.70,
    'github-api': 0.75,
    'readme-scan': 0.40,
  };

  /**
   * Calculate confidence for a license detection
   */
  static calculateConfidence(
    detectedLicense: string,
    sources: LicenseSource[]
  ): ConfidenceResult {
    if (!sources || sources.length === 0) {
      return {
        license: detectedLicense || 'UNKNOWN',
        confidence: 0,
        sources: [],
        isUnknown: true,
        suggestion: 'No license information found. Check package documentation or contact maintainer.',
      };
    }

    // Calculate weighted confidence
    let maxConfidence = 0;
    const validSources: LicenseSource[] = [];

    for (const source of sources) {
      const weight = this.SOURCE_WEIGHTS[source.type] || 0.5;
      source.weight = weight;
      maxConfidence = Math.max(maxConfidence, weight);
      validSources.push(source);
    }

    // Multiple sources increase confidence
    const sourceBonus = Math.min(0.1, (validSources.length - 1) * 0.03);
    
    // Agreement between sources increases confidence
    const agreementBonus = this.calculateAgreementBonus(validSources);
    
    let confidence = Math.min(1.0, maxConfidence + sourceBonus + agreementBonus);

    // Unknown license detection
    const isUnknown = detectedLicense === 'UNKNOWN' || 
                      detectedLicense === 'UNLICENSED' || 
                      !detectedLicense;

    if (isUnknown) {
      confidence = Math.min(confidence, 0.3);
    }

    const suggestion = this.generateSuggestion(detectedLicense, confidence, validSources);

    return {
      license: detectedLicense || 'UNKNOWN',
      confidence: Math.round(confidence * 100) / 100,
      sources: validSources,
      isUnknown,
      suggestion,
    };
  }

  /**
   * Calculate bonus for sources agreeing on the same license
   */
  private static calculateAgreementBonus(sources: LicenseSource[]): number {
    if (sources.length < 2) return 0;

    const licenseValues = sources.map(s => this.normalizeLicense(s.value));
    const uniqueLicenses = new Set(licenseValues);

    if (uniqueLicenses.size === 1) {
      // All sources agree
      return 0.1;
    } else if (uniqueLicenses.size <= sources.length / 2) {
      // Most sources agree
      return 0.05;
    }
    return 0;
  }

  /**
   * Normalize license identifier for comparison
   */
  private static normalizeLicense(license: string): string {
    if (!license) return 'UNKNOWN';
    
    // Normalize common variations
    const normalized = license
      .toUpperCase()
      .replace(/-ONLY$/, '')
      .replace(/-OR-LATER$/, '')
      .replace(/\s+/g, '-');

    return normalized;
  }

  /**
   * Generate actionable suggestion based on confidence
   */
  private static generateSuggestion(
    license: string,
    confidence: number,
    sources: LicenseSource[]
  ): string {
    if (!license || license === 'UNKNOWN') {
      return 'License unknown. Add a LICENSE file or specify in package.json.';
    }

    if (confidence >= 0.9) {
      return `High confidence: License verified from ${sources.length} source(s).`;
    }

    if (confidence >= 0.7) {
      return `Good confidence. Consider adding a LICENSE file for explicit declaration.`;
    }

    if (confidence >= 0.5) {
      const sourcesStr = sources.map(s => s.type).join(', ');
      return `Moderate confidence (from ${sourcesStr}). Verify license with maintainer.`;
    }

    return `Low confidence detection. Manually verify the license before distribution.`;
  }

  /**
   * Create source from detected license info
   */
  static createSource(
    type: LicenseSource['type'],
    value: string
  ): LicenseSource {
    return {
      type,
      value,
      weight: this.SOURCE_WEIGHTS[type] || 0.5,
    };
  }

  /**
   * Format confidence for display
   */
  static formatConfidence(confidence: number): string {
    if (confidence >= 0.9) return `${(confidence * 100).toFixed(0)}% (High)`;
    if (confidence >= 0.7) return `${(confidence * 100).toFixed(0)}% (Good)`;
    if (confidence >= 0.5) return `${(confidence * 100).toFixed(0)}% (Moderate)`;
    return `${(confidence * 100).toFixed(0)}% (Low)`;
  }
}
