import { describe, expect, it } from 'vitest';
import { licenseFixEngine } from '../src/licensefix/index.js';

describe('LicenseFixEngine', () => {
  it('ranks GPL-3.0 alternatives deterministically', () => {
    const result = licenseFixEngine.searchAlternatives('demo', 'GPL-3.0', {
      limit: 3,
    });

    expect(result.alternatives.length).toBeGreaterThan(0);
    const scores = result.alternatives.map((a) => a.score);
    const sorted = [...scores].sort((a, b) => b - a);
    expect(scores).toEqual(sorted);
  });

  it('respects minConfidence and limit', () => {
    const result = licenseFixEngine.searchAlternatives('demo', 'AGPL-3.0', {
      limit: 1,
      minConfidence: 0.8,
    });

    expect(result.alternatives.length).toBe(1);
    expect(result.alternatives[0].confidenceScore).toBeGreaterThanOrEqual(0.8);
  });
});
