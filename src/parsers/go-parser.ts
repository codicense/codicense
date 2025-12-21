/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import type { DependencyNode } from '../types';

/**
 * Parses Go go.mod and go.sum files
 * Fetches license information from pkg.go.dev API
 */
export class GoParser {
  private licenseCache: Map<string, string> = new Map();

  /**
   * Parse go.mod and go.sum together for complete dependency graph
   */
  async parse(filePath: string): Promise<DependencyNode> {
    const rootName = this.extractProjectName(path.dirname(filePath));
    const root: DependencyNode = {
      name: rootName,
      version: '0.0.0',
      license: 'UNKNOWN',
      depth: 0,
      path: [rootName],
      children: [],
    };

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const dependencies = this.parseGoModContent(content);

      // Parse go.sum for complete module list
      const goSumPath = path.join(path.dirname(filePath), 'go.sum');
      if (fs.existsSync(goSumPath)) {
        const sumDeps = this.parseGoSum(goSumPath);
        // Merge with go.mod dependencies
        for (const [name, version] of Object.entries(sumDeps)) {
          if (!dependencies[name]) {
            dependencies[name] = version;
          }
        }
      }

      // Fetch licenses for all dependencies
      for (const [name, version] of Object.entries(dependencies)) {
        const license = await this.fetchLicenseFromGoProxy(name, version);
        
        root.children.push({
          name,
          version,
          license,
          depth: 1,
          path: [rootName, name],
          children: [],
        });
      }
    } catch (error) {
      // Silently ignore parsing errors
    }

    return root;
  }

  /**
   * Parse go.mod content and extract dependencies
   */
  private parseGoModContent(content: string): Record<string, string> {
    const dependencies: Record<string, string> = {};
    const lines = content.split('\n');

    let inRequire = false;
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('//')) {
        continue;
      }

      // Track require section
      if (trimmed === 'require (' || trimmed.startsWith('require (')) {
        inRequire = true;
        continue;
      }

      if (inRequire && trimmed === ')') {
        inRequire = false;
        continue;
      }

      // Handle single-line require
      if (trimmed.startsWith('require ')) {
        const parts = trimmed.substring(8).trim().split(/\s+/);
        if (parts.length >= 2) {
          dependencies[parts[0]] = parts[1];
        }
        continue;
      }

      // Handle require block entries
      if (inRequire) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2 && parts[0].includes('/')) {
          dependencies[parts[0]] = parts[1];
        }
      }
    }

    return dependencies;
  }

  /**
   * Parse go.sum to get complete module list with checksums
   */
  private parseGoSum(goSumPath: string): Record<string, string> {
    const dependencies: Record<string, string> = {};
    
    try {
      const content = fs.readFileSync(goSumPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        // go.sum format: module version/go.mod checksum
        const parts = line.split(' ');
        if (parts.length >= 2) {
          const modulePath = parts[0];
          const version = parts[1].split('/')[0]; // Remove /go.mod suffix if present

          if (version.startsWith('v') && !dependencies[modulePath]) {
            dependencies[modulePath] = version;
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return dependencies;
  }

  /**
   * Fetch license information from Go module proxy and pkg.go.dev
   */
  private async fetchLicenseFromGoProxy(modulePath: string, version: string): Promise<string> {
    const cacheKey = `${modulePath}@${version}`;
    
    if (this.licenseCache.has(cacheKey)) {
      return this.licenseCache.get(cacheKey)!;
    }

    try {
      // Try to fetch go.mod from proxy to check for license info
      const encodedPath = modulePath.replace(/[A-Z]/g, (c) => `!${c.toLowerCase()}`);
      const goModUrl = `https://proxy.golang.org/${encodedPath}/@v/${version}.mod`;
      
      const goModContent = await this.httpsGet(goModUrl);
      
      // Check if go.mod contains license comment (rare but possible)
      const licenseMatch = goModContent.match(/\/\/ license:\s*(.+)/i);
      if (licenseMatch) {
        const license = licenseMatch[1].trim();
        this.licenseCache.set(cacheKey, license);
        return license;
      }

      // Fallback: Try to infer from common Go module licenses
      // Most Go projects use BSD, MIT, or Apache-2.0
      const license = await this.inferLicenseFromRepository(modulePath);
      this.licenseCache.set(cacheKey, license);
      return license;
    } catch {
      this.licenseCache.set(cacheKey, 'UNKNOWN');
      return 'UNKNOWN';
    }
  }

  /**
   * Infer license from repository (GitHub, GitLab, etc.)
   */
  private async inferLicenseFromRepository(modulePath: string): Promise<string> {
    // For GitHub modules, try to fetch license from GitHub API
    if (modulePath.startsWith('github.com/')) {
      const parts = modulePath.split('/');
      if (parts.length >= 3) {
        const owner = parts[1];
        const repo = parts[2];
        
        try {
          const apiUrl = `https://api.github.com/repos/${owner}/${repo}/license`;
          const data = await this.httpsGet(apiUrl, {
            'User-Agent': 'Codicense-License-Scanner',
            'Accept': 'application/vnd.github.v3+json',
          });
          
          const licenseInfo = JSON.parse(data);
          if (licenseInfo.license && licenseInfo.license.spdx_id) {
            return licenseInfo.license.spdx_id;
          }
        } catch {
          // Fall through to UNKNOWN
        }
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Simple HTTPS GET helper with custom headers
   */
  private httpsGet(url: string, headers: Record<string, string> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const options = {
        timeout: 5000,
        headers,
      };
      
      https.get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
    });
  }

  /**
   * Extract project name from go.mod module declaration
   */
  private extractProjectName(dir: string): string {
    try {
      const gomodPath = path.join(dir, 'go.mod');
      const content = fs.readFileSync(gomodPath, 'utf-8');
      const match = content.match(/^module\s+(.+)$/m);
      if (match) {
        const fullPath = match[1];
        const parts = fullPath.split('/');
        return parts[parts.length - 1];
      }
    } catch {
      // Fall through to directory name
    }

    const basename = path.basename(dir);
    return basename === '.' ? 'go-project' : basename;
  }
}

