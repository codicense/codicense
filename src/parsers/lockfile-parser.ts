/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';
import type { DependencyNode } from '../types';

/**
 * Parses package-lock.json (npm v2/v3 lockfile format)
 */
export class NpmLockfileParser {
  parse(lockfilePath: string): DependencyNode {
    const content = fs.readFileSync(lockfilePath, 'utf-8');
    const lockData = JSON.parse(content);

    // Handle both lockfileVersion 1 and 2/3
    if (lockData.lockfileVersion === 1) {
      return this.parseV1(lockData);
    } else {
      return this.parseV2(lockData);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseV1(lockData: any): DependencyNode {
    const rootName = lockData.name || 'root';
    const rootVersion = lockData.version || '0.0.0';
    
    const root: DependencyNode = {
      name: rootName,
      version: rootVersion,
      license: this.extractLicense(lockData),
      depth: 0,
      path: [rootName],
      children: [],
    };

    // In v1, dependencies is a flat map
    const deps = lockData.dependencies || {};
    const directDeps = Object.keys(deps);

    for (const depName of directDeps) {
      if (deps[depName]) {
        const childNode = this.buildNodeFromV1(depName, deps[depName], 1, [rootName, depName]);
        root.children.push(childNode);
      }
    }

    return root;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseV2(lockData: any): DependencyNode {
    const rootName = lockData.name || 'root';
    const rootVersion = lockData.version || '0.0.0';

    const root: DependencyNode = {
      name: rootName,
      version: rootVersion,
      license: this.extractLicense(lockData),
      depth: 0,
      path: [rootName],
      children: [],
    };

    // In v2/v3, dependencies are nested under 'packages'
    const packages = lockData.packages || {};
    const rootPackage = packages[''] || {};
    const directDeps = Object.keys(rootPackage.dependencies || {});

    for (const depName of directDeps) {
      // Find the package entry (usually 'node_modules/package-name')
      const packageKey = `node_modules/${depName}`;
      if (packages[packageKey]) {
        const childNode = this.buildNodeFromV2(
          depName, 
          packages[packageKey], 
          packages,
          1, 
          [rootName, depName]
        );
        root.children.push(childNode);
      }
    }

    return root;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private buildNodeFromV1(
    name: string, 
    data: any,
    depth: number, 
    currentPath: string[]
  ): DependencyNode {
    const node: DependencyNode = {
      name,
      version: (data.version as string) || 'unknown',
      license: this.extractLicense(data),
      depth,
      path: currentPath,
      children: [],
      resolved: (data.resolved as string | undefined),
      dev: (data.dev as boolean | undefined) || false,
    };

    // Recursively build children
    const deps = data.dependencies || {};
    for (const [childName, childData] of Object.entries(deps)) {
      const childPath = [...currentPath, childName];
      const childNode = this.buildNodeFromV1(childName, childData, depth + 1, childPath);
      node.children.push(childNode);
    }

    return node;
  }

  private buildNodeFromV2(
    name: string,
    data: Record<string, unknown>,
    allPackages: Record<string, unknown>,
    depth: number,
    currentPath: string[]
  ): DependencyNode {
    const node: DependencyNode = {
      name,
      version: (data.version as string) || 'unknown',
      license: this.extractLicense(data),
      depth,
      path: currentPath,
      children: [],
      resolved: (data.resolved as string | undefined),
      dev: (data.dev as boolean | undefined) || false,
    };

    // Build children from dependencies
    const deps = data.dependencies || {};
    for (const childName of Object.keys(deps)) {
      // Construct the likely package key
      const packageKey = this.findPackageKey(name, childName, allPackages);
      if (packageKey && (allPackages as any)[packageKey]) {
        const childPath = [...currentPath, childName];
        const childNode = this.buildNodeFromV2(
          childName,
          (allPackages as any)[packageKey],
          allPackages,
          depth + 1,
          childPath
        );
        node.children.push(childNode);
      }
    }

    return node;
  }

  private findPackageKey(parentName: string, childName: string, packages: Record<string, unknown>): string | null {
    // Try direct node_modules path first
    const directKey = `node_modules/${childName}`;
    if (packages[directKey]) return directKey;

    // Try nested path (for hoisting edge cases)
    const nestedKey = `node_modules/${parentName}/node_modules/${childName}`;
    if (packages[nestedKey]) return nestedKey;

    // Fallback: search all keys
    for (const key of Object.keys(packages)) {
      if (key.endsWith(`/${childName}`)) {
        return key;
      }
    }

    return null;
  }

  private extractLicense(data: any): string {
    // Try multiple fields where license might be
    if (data.license) {
      if (typeof data.license === 'string') {
        return data.license;
      }
      if ((data.license as any).type) {
        return (data.license as any).type;
      }
    }

    // Check in nested package info
    if (data.licenses && Array.isArray(data.licenses) && data.licenses.length > 0) {
      return (data.licenses as Array<Record<string, unknown>>).map((l) => (l.type as string) || l).join(' OR ');
    }

    return 'UNKNOWN';
  }
}

/**
 * Parses yarn.lock (Yarn Classic v1 lockfile format)
 */
export class YarnLockfileParser {
  parse(lockfilePath: string): DependencyNode {
    const content = fs.readFileSync(lockfilePath, 'utf-8');
    const entries = this.parseYarnLock(content);

    const rootName = this.getRootName(lockfilePath);
    const root: DependencyNode = {
      name: rootName,
      version: '0.0.0',
      license: 'UNKNOWN',
      depth: 0,
      path: [rootName],
      children: [],
    };

    // Get direct dependencies
    const directDeps = this.getDirectDependencies(lockfilePath);
    
    for (const depName of directDeps) {
      const entry = this.findEntry(depName, entries);
      if (entry) {
        const childNode = this.buildNode(depName, entry, entries, 1, [rootName, depName]);
        root.children.push(childNode);
      }
    }

    return root;
  }

  private parseYarnLock(content: string): Map<string, Record<string, string>> {
    const entries = new Map<string, Record<string, string>>();
    const lines = content.split('\n');
    
    let currentEntry: Record<string, string> | null = null;
    let currentKey = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip comments and empty lines
      if (line.startsWith('#') || line.trim() === '') {
        continue;
      }

      const indent = line.search(/\S/);
      
      // New entry (starts at column 0, ends with colon)
      if (indent === 0 && line.includes(':')) {
        if (currentEntry && currentKey) {
          entries.set(currentKey, currentEntry);
        }
        
        currentKey = line.substring(0, line.lastIndexOf(':')).trim().replace(/"/g, '');
        currentEntry = {};
      } else if (currentEntry && indent > 0) {
        // Parse key-value pairs
        const match = line.trim().match(/^(\w+)\s+"?([^"]+)"?$/);
        if (match) {
          const [, key, value] = match;
          currentEntry[key] = value.replace(/"/g, '');
        }
      }
    }

    // Save last entry
    if (currentEntry && currentKey) {
      entries.set(currentKey, currentEntry);
    }

    return entries;
  }

  private buildNode(
    name: string,
    entry: Record<string, string>,
    allEntries: Map<string, Record<string, string>>,
    depth: number,
    currentPath: string[]
  ): DependencyNode {
    const node: DependencyNode = {
      name,
      version: entry.version || 'unknown',
      license: entry.license || 'UNKNOWN',
      depth,
      path: currentPath,
      children: [],
      resolved: entry.resolved,
    };

    // Parse dependencies
    const deps = this.parseDependencies(entry.dependencies || '');
    for (const depName of deps) {
      const depEntry = this.findEntry(depName, allEntries);
      if (depEntry) {
        const childPath = [...currentPath, depName];
        const childNode = this.buildNode(depName, depEntry, allEntries, depth + 1, childPath);
        node.children.push(childNode);
      }
    }

    return node;
  }

  private findEntry(packageName: string, entries: Map<string, Record<string, string>>): Record<string, string> | null {
    // Try exact match first
    for (const [key, value] of entries.entries()) {
      const name = this.extractPackageName(key);
      if (name === packageName) {
        return value;
      }
    }
    return null;
  }

  private extractPackageName(key: string): string {
    // Yarn lock keys look like: "package-name@^1.0.0" or "package-name@npm:^1.0.0"
    const atIndex = key.indexOf('@', 1); // Skip first @ for scoped packages
    if (atIndex > 0) {
      return key.substring(0, atIndex);
    }
    return key;
  }

  private parseDependencies(depsString: string): string[] {
    // Dependencies in yarn.lock are comma-separated
    if (!depsString) return [];
    return depsString.split(',').map((d) => d.trim().replace(/"/g, ''));
  }

  private getRootName(lockfilePath: string): string {
    const pkgPath = path.join(path.dirname(lockfilePath), 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.name || 'root';
    }
    return 'root';
  }

  private getDirectDependencies(lockfilePath: string): string[] {
    const pkgPath = path.join(path.dirname(lockfilePath), 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return [];
    }
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return Object.keys(pkg.dependencies || {});
  }
}

/**
 * Factory to detect and parse appropriate lockfile
 */
export class LockfileParser {
  static async parse(projectPath: string): Promise<DependencyNode> {
    const npmLock = path.join(projectPath, 'package-lock.json');
    const yarnLock = path.join(projectPath, 'yarn.lock');
    const pnpmLock = path.join(projectPath, 'pnpm-lock.yaml');

    if (fs.existsSync(npmLock)) {
      const parser = new NpmLockfileParser();
      return parser.parse(npmLock);
    }

    if (fs.existsSync(yarnLock)) {
      const parser = new YarnLockfileParser();
      return parser.parse(yarnLock);
    }

    if (fs.existsSync(pnpmLock)) {
      const { PnpmLockfileParser } = await import('./pnpm-parser');
      const parser = new PnpmLockfileParser();
      return parser.parse(pnpmLock);
    }

    throw new Error('No supported lockfile found. Please run npm install, yarn install, or pnpm install first.');
  }
}

