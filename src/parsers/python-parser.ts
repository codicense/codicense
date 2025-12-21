/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import type { DependencyNode } from '../types';

interface PyPIPackageInfo {
  info: {
    name: string;
    version: string;
    license?: string;
    classifiers?: string[];
  };
  releases: Record<string, any[]>;
}

/**
 * Parses Python requirements.txt, Pipfile.lock, and poetry.lock files
 * Fetches license information from PyPI API
 */
export class PythonParser {
  private licenseCache: Map<string, string> = new Map();
  
  /**
   * Parse any Python dependency file (auto-detect format)
   */
  async parse(filePath: string): Promise<DependencyNode> {
    const fileName = path.basename(filePath);
    
    if (fileName === 'Pipfile.lock') {
      return this.parsePipfileLock(filePath);
    } else if (fileName === 'poetry.lock') {
      return this.parsePoetryLock(filePath);
    } else if (fileName === 'requirements.txt') {
      return this.parseRequirements(filePath);
    }
    
    throw new Error(`Unsupported Python dependency file: ${fileName}`);
  }

  /**
   * Parse Pipfile.lock (Pipenv format)
   */
  private async parsePipfileLock(filePath: string): Promise<DependencyNode> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lockData = JSON.parse(content);

    const rootName = this.extractProjectName(path.dirname(filePath));
    const root: DependencyNode = {
      name: rootName,
      version: '0.0.0',
      license: 'UNKNOWN',
      depth: 0,
      path: [rootName],
      children: [],
    };

    const packages = { ...lockData.default, ...lockData.develop };
    
    for (const [name, info] of Object.entries(packages)) {
      const pkgInfo = info as any;
      const version = pkgInfo.version?.replace(/^==/, '') || '0.0.0';
      const license = await this.fetchLicenseFromPyPI(name, version);
      
      root.children.push({
        name,
        version,
        license,
        depth: 1,
        path: [rootName, name],
        children: [],
        resolved: pkgInfo.index || 'https://pypi.org/simple',
      });
    }

    return root;
  }

  /**
   * Parse poetry.lock (Poetry format)
   */
  private async parsePoetryLock(filePath: string): Promise<DependencyNode> {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Simple TOML parser for poetry.lock [[package]] sections
    const packages = this.parsePoetryToml(content);

    const rootName = this.extractProjectName(path.dirname(filePath));
    const root: DependencyNode = {
      name: rootName,
      version: '0.0.0',
      license: 'UNKNOWN',
      depth: 0,
      path: [rootName],
      children: [],
    };

    for (const pkg of packages) {
      const license = await this.fetchLicenseFromPyPI(pkg.name, pkg.version);
      
      root.children.push({
        name: pkg.name,
        version: pkg.version,
        license,
        depth: 1,
        path: [rootName, pkg.name],
        children: [],
      });
    }

    return root;
  }

  /**
   * Parse requirements.txt file
   */
  private async parseRequirements(filePath: string): Promise<DependencyNode> {
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
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Skip environment markers
        const cleanLine = trimmed.split(';')[0].trim();
        const dep = await this.parseDependencyLine(cleanLine);
        if (dep) {
          root.children.push(dep);
        }
      }
    } catch (error) {
      // Silently ignore parsing errors
    }

    return root;
  }

  /**
   * Parse a single dependency line from requirements.txt
   */
  private async parseDependencyLine(line: string): Promise<DependencyNode | null> {
    try {
      // Remove extras syntax: package[extra1,extra2]
      const cleanLine = line.replace(/\[.*?\]/g, '');

      // Extract name and version
      const match = cleanLine.match(/^([a-zA-Z0-9\-_.]+)(.*)?$/);
      if (!match) {
        return null;
      }

      const name = match[1];
      const versionSpec = match[2] || '';

      // Extract version (simplified: take first version mentioned)
      const versionMatch = versionSpec.match(/([0-9]+(?:\.[0-9]+)*)/);
      const version = versionMatch ? versionMatch[1] : 'latest';

      const license = await this.fetchLicenseFromPyPI(name, version);

      return {
        name,
        version,
        license,
        depth: 1,
        path: ['root', name],
        children: [],
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch license information from PyPI API
   */
  private async fetchLicenseFromPyPI(packageName: string, version: string): Promise<string> {
    const cacheKey = `${packageName}@${version}`;
    
    if (this.licenseCache.has(cacheKey)) {
      return this.licenseCache.get(cacheKey)!;
    }

    try {
      const url = version === 'latest' 
        ? `https://pypi.org/pypi/${packageName}/json`
        : `https://pypi.org/pypi/${packageName}/${version}/json`;

      const data = await this.httpsGet(url);
      const pkgInfo = JSON.parse(data) as PyPIPackageInfo;

      let license = pkgInfo.info.license || 'UNKNOWN';

      // Fallback to classifiers if license field is empty
      if (license === 'UNKNOWN' || license === '' || license === 'UNKNOWN') {
        const classifiers = pkgInfo.info.classifiers || [];
        const licenseClassifier = classifiers.find((c: string) => 
          c.startsWith('License ::')
        );
        if (licenseClassifier) {
          license = licenseClassifier.split('::').pop()?.trim() || 'UNKNOWN';
        }
      }

      this.licenseCache.set(cacheKey, license);
      return license;
    } catch {
      return 'UNKNOWN';
    }
  }

  /**
   * Simple HTTPS GET helper
   */
  private httpsGet(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      https.get(url, { timeout: 5000 }, (res) => {
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
   * Simple parser for poetry.lock TOML [[package]] sections
   */
  private parsePoetryToml(content: string): Array<{ name: string; version: string }> {
    const packages: Array<{ name: string; version: string }> = [];
    const lines = content.split('\n');
    
    let currentPackage: any = null;
    
    for (const line of lines) {
      if (line.trim() === '[[package]]') {
        if (currentPackage) {
          packages.push(currentPackage);
        }
        currentPackage = {};
      } else if (currentPackage) {
        const nameMatch = line.match(/^name\s*=\s*"(.+)"$/);
        const versionMatch = line.match(/^version\s*=\s*"(.+)"$/);
        
        if (nameMatch) currentPackage.name = nameMatch[1];
        if (versionMatch) currentPackage.version = versionMatch[1];
      }
    }
    
    if (currentPackage) {
      packages.push(currentPackage);
    }
    
    return packages;
  }

  /**
   * Extract project name from directory
   */
  private extractProjectName(dir: string): string {
    const basename = path.basename(dir);
    return basename === '.' ? 'python-project' : basename;
  }
}

