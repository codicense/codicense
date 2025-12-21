/**
 * LicenseFix Engine - offline, deterministic ranking with explainable signals.
 */
import { catalog } from './catalog.js';
import { rankAlternatives } from './scorer.js';
import type {
  AlternativeResult,
  AlternativeSearchOptions,
  Ecosystem,
  LicenseAlternative,
  RankedAlternative,
} from './types.js';

export class LicenseFixEngine {
  private byLicense: Map<string, LicenseAlternative[]>;

  constructor() {
    this.byLicense = this.buildIndex();
  }

  searchAlternatives(
    packageName: string,
    fromLicense: string,
    options: AlternativeSearchOptions = {}
  ): AlternativeResult {
    const start = performance.now();
    const { ecosystem, limit = 5, minConfidence = 0.5 } = options;

    const entries = this.getCandidates(fromLicense, ecosystem).filter(
      (alt) => alt.confidenceScore >= minConfidence
    );

    const ranked: RankedAlternative[] = rankAlternatives(entries).slice(0, limit);

    const searchTimeMs = performance.now() - start;
    return {
      query: packageName,
      originalLicense: fromLicense,
      alternatives: ranked,
      totalMatches: ranked.length,
      searchTimeMs,
    };
  }

  private getCandidates(fromLicense: string, ecosystem?: Ecosystem): LicenseAlternative[] {
    const base = this.byLicense.get(fromLicense) || [];
    if (!ecosystem) return base;
    return base.filter((entry) => entry.ecosystem === ecosystem);
  }

  private buildIndex(): Map<string, LicenseAlternative[]> {
    const map = new Map<string, LicenseAlternative[]>();

    for (const entry of catalog) {
      if (!map.has(entry.license)) {
        map.set(entry.license, []);
      }
      map.get(entry.license)!.push(entry);
    }

    return map;
  }
}

export const licenseFixEngine = new LicenseFixEngine();
