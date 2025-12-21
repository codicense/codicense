/**
 * LicenseFix Types
 * Deterministic, explainable recommendation primitives.
 */

export type AlternativeQuality = 'production' | 'stable' | 'experimental';
export type Ecosystem = 'js' | 'python' | 'go';

export interface LicenseAlternative {
  package: string;
  license: string;
  ecosystem: Ecosystem;
  quality: AlternativeQuality;
  weeklyDownloads: number;

  /**
   * Similarity of purpose / API / ecosystem role (0–1)
   */
  similarityScore: number;

  /**
   * Confidence this is a safe, accepted replacement (0–1)
   */
  confidenceScore: number;

  /**
   * Human-readable explanation for CLI output.
   */
  rationale: string;

  /**
   * API compatibility guidance.
   */
  apiCompatibility?: 'drop-in' | 'minor-changes' | 'rewrite';

  /**
   * Key trade-offs to surface in CLI.
   */
  tradeoffs?: string[];
}

export interface RankedAlternative extends LicenseAlternative {
  score: number;
  scoreBreakdown: {
    similarity: number;
    confidence: number;
    adoption: number;
    quality: number;
  };
}

export interface AlternativeResult {
  query: string;
  originalLicense: string;
  alternatives: RankedAlternative[];
  totalMatches: number;
  searchTimeMs: number;
}

export interface AlternativeSearchOptions {
  ecosystem?: Ecosystem;
  limit?: number;
  minConfidence?: number;
}
