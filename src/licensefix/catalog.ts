/**
 * Curated offline catalog for LicenseFix.
 * Each entry captures similarity, confidence, rationale, and adoption signals.
 */
import type { LicenseAlternative, Ecosystem } from './types.js';

interface CatalogEntry extends LicenseAlternative {
  source: 'curated' | 'community' | 'vendor';
  tags?: string[];
}

const mk = (
  license: string,
  pkg: string,
  ecosystem: Ecosystem,
  weeklyDownloads: number,
  similarityScore: number,
  confidenceScore: number,
  rationale: string,
  quality: CatalogEntry['quality'],
  apiCompatibility: CatalogEntry['apiCompatibility'],
  tradeoffs: string[],
  tags: string[] = [],
  source: CatalogEntry['source'] = 'curated'
): CatalogEntry => ({
  license,
  package: pkg,
  ecosystem,
  weeklyDownloads,
  similarityScore,
  confidenceScore,
  rationale,
  quality,
  apiCompatibility,
  tradeoffs,
  tags,
  source,
});

export const catalog: CatalogEntry[] = [
  // GPL-2.0 replacements
  mk(
    'GPL-2.0',
    'mysql2',
    'js',
    50_000_000,
    0.62,
    0.78,
    'Drop-in MySQL driver with MIT license and robust maintenance cadence.',
    'production',
    'drop-in',
    ['Requires native bindings on Alpine'],
    ['database', 'sql']
  ),
  mk(
    'GPL-2.0',
    'pg',
    'js',
    40_000_000,
    0.55,
    0.75,
    'PostgreSQL client with strong ecosystem support and permissive license.',
    'production',
    'minor-changes',
    ['Switching database engine requires migration'],
    ['database', 'sql']
  ),
  mk(
    'GPL-2.0',
    'better-sqlite3',
    'js',
    5_000_000,
    0.48,
    0.65,
    'SQLite bindings with MIT license; great for embedded/desktop workloads.',
    'production',
    'minor-changes',
    ['Node.js-only; not browser compatible'],
    ['database', 'sql', 'embedded']
  ),

  // GPL-3.0 replacements
  mk(
    'GPL-3.0',
    'axios',
    'js',
    200_000_000,
    0.82,
    0.86,
    'HTTP client with mature ecosystem and MIT license; supports interceptors.',
    'production',
    'drop-in',
    ['Bundle size larger than fetch'],
    ['http', 'client']
  ),
  mk(
    'GPL-3.0',
    'undici',
    'js',
    30_000_000,
    0.74,
    0.78,
    'Modern HTTP/1.1 client from Node core team; strong performance.',
    'production',
    'minor-changes',
    ['Node 18+ recommended'],
    ['http', 'client']
  ),
  mk(
    'GPL-3.0',
    'node-fetch',
    'js',
    80_000_000,
    0.70,
    0.72,
    'Lightweight fetch-compatible client; MIT license.',
    'stable',
    'drop-in',
    ['CommonJS/ESM interop considerations'],
    ['http', 'client']
  ),

  // AGPL-3.0 replacements
  mk(
    'AGPL-3.0',
    'express',
    'js',
    500_000_000,
    0.68,
    0.82,
    'MIT-licensed web server; massive community validation and middleware.',
    'production',
    'minor-changes',
    ['Less opinionated than AGPL frameworks'],
    ['web', 'server']
  ),
  mk(
    'AGPL-3.0',
    'fastify',
    'js',
    30_000_000,
    0.72,
    0.80,
    'High-performance MIT alternative with solid plugin model.',
    'production',
    'minor-changes',
    ['Migration needed if source used framework-specific helpers'],
    ['web', 'server']
  ),
  mk(
    'AGPL-3.0',
    'hapi',
    'js',
    5_000_000,
    0.55,
    0.70,
    'BSD-licensed framework with batteries-included config approach.',
    'stable',
    'rewrite',
    ['Routing/config style differs materially'],
    ['web', 'server']
  ),

  // LGPL-2.1 replacements
  mk(
    'LGPL-2.1',
    'lodash',
    'js',
    600_000_000,
    0.77,
    0.82,
    'Utility toolkit under MIT; broad surface area coverage.',
    'production',
    'minor-changes',
    ['Tree-shaking recommended'],
    ['utilities']
  ),
  mk(
    'LGPL-2.1',
    'underscore',
    'js',
    20_000_000,
    0.60,
    0.70,
    'Mature alternative with MIT license; API similar to lodash.',
    'stable',
    'minor-changes',
    ['Older codebase; slower release cadence'],
    ['utilities']
  ),

  // LGPL-3.0 replacements
  mk(
    'LGPL-3.0',
    'date-fns',
    'js',
    40_000_000,
    0.70,
    0.80,
    'Modern FP-style date library; tree-shakeable; MIT license.',
    'production',
    'minor-changes',
    ['APIs differ from moment'],
    ['datetime']
  ),
  mk(
    'LGPL-3.0',
    'dayjs',
    'js',
    20_000_000,
    0.68,
    0.75,
    'Lightweight immutable date library; close to moment API; MIT.',
    'production',
    'minor-changes',
    ['Plugin model required for some features'],
    ['datetime']
  ),
  mk(
    'LGPL-3.0',
    'luxon',
    'js',
    6_000_000,
    0.66,
    0.72,
    'Moment successor with better timezone support; MIT.',
    'stable',
    'minor-changes',
    ['Different API surface than moment'],
    ['datetime']
  ),

  // MPL-2.0 replacements
  mk(
    'MPL-2.0',
    'typescript',
    'js',
    100_000_000,
    0.60,
    0.78,
    'Apache-2.0 licensed compiler/transpiler with strong governance.',
    'production',
    'minor-changes',
    ['Compiler toolchain impacts build pipeline'],
    ['language', 'tooling']
  ),

  // GPL-3.0 replacements in Python
  mk(
    'GPL-3.0',
    'httpx',
    'python',
    4_500_000,
    0.70,
    0.76,
    'Modern async-first HTTP client; permissive license.',
    'production',
    'minor-changes',
    ['Requires Python 3.8+ for best experience'],
    ['http', 'client']
  ),
  mk(
    'GPL-3.0',
    'requests',
    'python',
    120_000_000,
    0.72,
    0.80,
    'De facto HTTP client for Python; Apache-2.0 license.',
    'production',
    'drop-in',
    ['Synchronous only'],
    ['http', 'client']
  ),

  // AGPL-3.0 replacements in Go
  mk(
    'AGPL-3.0',
    'fasthttp',
    'go',
    10_000,
    0.60,
    0.70,
    'High-performance HTTP server/client; BSD license.',
    'stable',
    'minor-changes',
    ['Not fully net/http compatible; consider migration effort'],
    ['web', 'server']
  ),
  mk(
    'AGPL-3.0',
    'fiber',
    'go',
    250_000,
    0.66,
    0.74,
    'Express-inspired web framework on fasthttp; MIT license.',
    'stable',
    'minor-changes',
    ['Middleware ecosystem smaller than gin'],
    ['web', 'server']
  ),
];

export type { CatalogEntry };
