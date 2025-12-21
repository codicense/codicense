/**
 * Deterministic scoring and ranking for LicenseFix alternatives.
 */
import type { LicenseAlternative, RankedAlternative } from './types.js';

const QUALITY_WEIGHT: Record<LicenseAlternative['quality'], number> = {
  production: 1.0,
  stable: 0.8,
  experimental: 0.5,
};

interface ScoreWeights {
  similarity: number;
  confidence: number;
  adoption: number;
  quality: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  similarity: 0.35,
  confidence: 0.30,
  adoption: 0.20,
  quality: 0.15,
};

const clamp = (value: number, min = 0, max = 1): number =>
  Math.min(max, Math.max(min, value));

const normalizeAdoption = (weeklyDownloads: number): number => {
  // Use log scale to avoid runaway dominance from mega packages
  const normalized = Math.log10(weeklyDownloads + 1) / 8; // 10^8 ~ 100M
  return clamp(normalized);
};

export function scoreAlternative(
  alt: LicenseAlternative,
  weights: ScoreWeights = DEFAULT_WEIGHTS
): RankedAlternative {
  const similarity = clamp(alt.similarityScore);
  const confidence = clamp(alt.confidenceScore);
  const adoption = normalizeAdoption(alt.weeklyDownloads);
  const quality = QUALITY_WEIGHT[alt.quality];

  const score =
    similarity * weights.similarity +
    confidence * weights.confidence +
    adoption * weights.adoption +
    quality * weights.quality;

  return {
    ...alt,
    score,
    scoreBreakdown: {
      similarity,
      confidence,
      adoption,
      quality,
    },
  };
}

export function rankAlternatives(
  alternatives: LicenseAlternative[],
  weights: ScoreWeights = DEFAULT_WEIGHTS
): RankedAlternative[] {
  return alternatives
    .map((alt) => scoreAlternative(alt, weights))
    .sort((a, b) => b.score - a.score);
}
