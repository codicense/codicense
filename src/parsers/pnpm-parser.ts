/* eslint-disable @typescript-eslint/no-explicit-any */
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { DependencyNode } from '../types';

/**
 * Parses pnpm-lock.yaml (pnpm v6+ lockfile format)
 * Supports workspace monorepos and virtual store
 */
export class PnpmLockfileParser {
  parse(lockfilePath: string): DependencyNode {
    const content = fs.readFileSync(lockfilePath, 'utf-8');
    const lockData = yaml.load(content) as any;

    const rootName = this.getRootName(lockfilePath);
    const root: DependencyNode = {
      name: rootName,
      version: '0.0.0',
      license: 'UNKNOWN',
      depth: 0,
      path: [rootName],
      children: [],
    };

    // pnpm lockfile format
    const packages = lockData.packages || {};
    const importers = lockData.importers || { '.': lockData };
    
    // Get root dependencies
    const rootImporter = importers['.'] || importers;
    const deps = {
      ...rootImporter.dependencies,
      ...rootImporter.devDependencies,
      ...rootImporter.optionalDependencies,
    };

    for (const [depName, specifier] of Object.entries(deps)) {
      const version = this.resolveVersion(specifier as any);
      const packageKey = this.findPackageKey(depName, version, packages);
      
      if (packageKey && packages[packageKey]) {
        const childNode = this.buildNode(
          depName,
          version,
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

  private buildNode(
    name: string,
    version: string,
    pkgData: any,
    allPackages: any,
    depth: number,
    currentPath: string[]
  ): DependencyNode {
    const node: DependencyNode = {
      name,
      version: version.replace(/^[\^~>=<]/, ''), // Clean version specifier
      license: pkgData.license || pkgData.engines?.license || 'UNKNOWN',
      depth,
      path: currentPath,
      children: [],
      resolved: pkgData.resolution?.tarball || pkgData.resolution?.integrity,
      dev: pkgData.dev || false,
    };

    // Build children from dependencies
    const deps = {
      ...pkgData.dependencies,
      ...pkgData.optionalDependencies,
    };

    for (const [childName, childVersion] of Object.entries(deps)) {
      const resolvedVersion = this.resolveVersion(childVersion as any);
      const packageKey = this.findPackageKey(childName, resolvedVersion, allPackages);

      if (packageKey && allPackages[packageKey]) {
        const childPath = [...currentPath, childName];
        const childNode = this.buildNode(
          childName,
          resolvedVersion,
          allPackages[packageKey],
          allPackages,
          depth + 1,
          childPath
        );
        node.children.push(childNode);
      }
    }

    return node;
  }

  private resolveVersion(specifier: any): string {
    if (typeof specifier === 'string') {
      return specifier;
    }
    if (specifier && specifier.version) {
      return specifier.version;
    }
    return '0.0.0';
  }

  private findPackageKey(name: string, version: string, packages: any): string | null {
    // pnpm uses format: /package-name/version or /package-name/version_peer-deps
    const cleanVersion = version.replace(/^[\^~>=<]/, '');
    
    // Try exact match
    const exactKey = `/${name}/${cleanVersion}`;
    if (packages[exactKey]) {
      return exactKey;
    }

    // Try with @ prefix for scoped packages
    if (name.startsWith('@')) {
      const scopedKey = `${name}/${cleanVersion}`;
      if (packages[scopedKey]) {
        return scopedKey;
      }
    }

    // Search for partial match
    for (const key of Object.keys(packages)) {
      if (key.includes(`/${name}/`) && key.includes(cleanVersion.split('.')[0])) {
        return key;
      }
    }

    return null;
  }

  private getRootName(lockfilePath: string): string {
    const pkgDir = path.dirname(lockfilePath);
    const pkgPath = path.join(pkgDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      return pkg.name || 'root';
    }
    return 'root';
  }
}
