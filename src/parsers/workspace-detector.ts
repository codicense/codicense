/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import * as path from 'path';

/**
 * Detects workspace/monorepo configuration
 */
export class WorkspaceDetector {
  /**
   * Detect if project is a workspace/monorepo
   */
  static detectWorkspaces(projectPath: string): {
    isWorkspace: boolean;
    type: 'npm' | 'yarn' | 'pnpm' | 'none';
    workspaces: string[];
  } {
    const pkgPath = path.join(projectPath, 'package.json');
    
    if (!fs.existsSync(pkgPath)) {
      return { isWorkspace: false, type: 'none', workspaces: [] };
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    // Check for npm/yarn workspaces
    if (pkg.workspaces) {
      const workspaces = Array.isArray(pkg.workspaces) 
        ? pkg.workspaces 
        : pkg.workspaces.packages || [];
      
      const type = fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))
        ? 'pnpm'
        : fs.existsSync(path.join(projectPath, 'yarn.lock'))
        ? 'yarn'
        : 'npm';

      return {
        isWorkspace: true,
        type,
        workspaces,
      };
    }

    // Check for pnpm workspaces
    const pnpmWorkspacePath = path.join(projectPath, 'pnpm-workspace.yaml');
    if (fs.existsSync(pnpmWorkspacePath)) {
      const yaml = require('js-yaml');
      const workspaceConfig = yaml.load(fs.readFileSync(pnpmWorkspacePath, 'utf-8'));
      return {
        isWorkspace: true,
        type: 'pnpm',
        workspaces: workspaceConfig.packages || [],
      };
    }

    return { isWorkspace: false, type: 'none', workspaces: [] };
  }

  /**
   * Resolve workspace packages from glob patterns
   */
  static resolveWorkspacePackages(projectPath: string, patterns: string[]): string[] {
    const packages: string[] = [];

    for (const pattern of patterns) {
      // Simple glob expansion (supports packages/*, apps/*)
      if (pattern.endsWith('/*')) {
        const baseDir = pattern.slice(0, -2);
        const fullPath = path.join(projectPath, baseDir);
        
        if (fs.existsSync(fullPath)) {
          const dirs = fs.readdirSync(fullPath, { withFileTypes: true });
          for (const dir of dirs) {
            if (dir.isDirectory()) {
              const pkgJsonPath = path.join(fullPath, dir.name, 'package.json');
              if (fs.existsSync(pkgJsonPath)) {
                packages.push(path.join(baseDir, dir.name));
              }
            }
          }
        }
      } else {
        // Direct path
        const fullPath = path.join(projectPath, pattern);
        const pkgJsonPath = path.join(fullPath, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
          packages.push(pattern);
        }
      }
    }

    return packages;
  }
}
