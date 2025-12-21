/**
 * LicenseFix.org Database Client
 *
 * Offline cache of community-curated license alternatives.
 */

export interface LicenseAlternative {
  package: string;
  license: string;
  downloads: number;
  quality: 'production' | 'stable' | 'experimental';
  maintainerResponse?: string;
}

export interface AlternativeResult {
  query: string;
  originalLicense: string;
  alternatives: LicenseAlternative[];
  totalMatches: number;
  searchTime: number;
}

export class LicenseFixDatabase {
  private cache: Map<string, LicenseAlternative[]>;

  constructor() {
    this.cache = this.initializeLocalCache();
  }

  async findAlternatives(packageName: string, fromLicense: string): Promise<AlternativeResult> {
    const startTime = performance.now();

    try {
      const cacheKey = `${fromLicense}`;
      const cached = this.cache.get(cacheKey);

      if (cached && cached.length > 0) {
        const searchTime = performance.now() - startTime;
        return {
          query: packageName,
          originalLicense: fromLicense,
          alternatives: cached,
          totalMatches: cached.length,
          searchTime,
        };
      }

      const searchTime = performance.now() - startTime;
      return {
        query: packageName,
        originalLicense: fromLicense,
        alternatives: cached || [],
        totalMatches: 0,
        searchTime,
      };
    } catch (error) {
      const searchTime = performance.now() - startTime;
      return {
        query: packageName,
        originalLicense: fromLicense,
        alternatives: [],
        totalMatches: 0,
        searchTime,
      };
    }
  }

  private initializeLocalCache(): Map<string, LicenseAlternative[]> {
    const cache = new Map<string, LicenseAlternative[]>();

    // GPL-2.0 alternatives
    cache.set('GPL-2.0', [
      {
        package: 'mysql2',
        license: 'MIT',
        downloads: 50000000,
        quality: 'production',
        maintainerResponse: 'active',
      },
      {
        package: 'pg',
        license: 'MIT',
        downloads: 40000000,
        quality: 'production',
      },
      {
        package: 'better-sqlite3',
        license: 'MIT',
        downloads: 5000000,
        quality: 'production',
      },
    ]);

    // GPL-3.0 alternatives
    cache.set('GPL-3.0', [
      {
        package: 'axios',
        license: 'MIT',
        downloads: 200000000,
        quality: 'production',
      },
      {
        package: 'node-fetch',
        license: 'MIT',
        downloads: 80000000,
        quality: 'production',
      },
      {
        package: 'undici',
        license: 'MIT',
        downloads: 30000000,
        quality: 'production',
      },
    ]);

    // AGPL-3.0 alternatives
    cache.set('AGPL-3.0', [
      {
        package: 'express',
        license: 'MIT',
        downloads: 500000000,
        quality: 'production',
      },
      {
        package: 'fastify',
        license: 'MIT',
        downloads: 30000000,
        quality: 'production',
      },
      {
        package: 'hapi',
        license: 'BSD-3-Clause',
        downloads: 5000000,
        quality: 'stable',
      },
    ]);

    // LGPL-2.1 alternatives
    cache.set('LGPL-2.1', [
      {
        package: 'lodash',
        license: 'MIT',
        downloads: 600000000,
        quality: 'production',
      },
      {
        package: 'underscore',
        license: 'MIT',
        downloads: 20000000,
        quality: 'stable',
      },
    ]);

    // LGPL-3.0 alternatives
    cache.set('LGPL-3.0', [
      {
        package: 'moment',
        license: 'MIT',
        downloads: 100000000,
        quality: 'stable',
      },
      {
        package: 'date-fns',
        license: 'MIT',
        downloads: 40000000,
        quality: 'production',
      },
      {
        package: 'dayjs',
        license: 'MIT',
        downloads: 20000000,
        quality: 'production',
      },
    ]);

    // MPL-2.0 alternatives
    cache.set('MPL-2.0', [
      {
        package: 'typescript',
        license: 'Apache-2.0',
        downloads: 100000000,
        quality: 'production',
      },
    ]);

    return cache;
  }
}

export const licenseFixDb = new LicenseFixDatabase();

