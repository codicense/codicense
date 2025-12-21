/**
 * Codicenseignore Handler
 * 
 * Handles .codicenseignore file for excluding paths from scanning.
 * Auto-generates sensible defaults on first run.
 */

import fs from 'fs';
import path from 'path';

const IGNORE_FILE = '.codicenseignore';

/**
 * Default ignore patterns for common directories that shouldn't be scanned
 */
const DEFAULT_IGNORE_PATTERNS = [
  '# Codicense Ignore File',
  '# Patterns in this file will be excluded from license scanning',
  '',
  '# Test fixtures',
  'test/fixtures/',
  'tests/fixtures/',
  '__fixtures__/',
  'testdata/',
  '',
  '# Vendor directories (already bundled)',
  'vendor/',
  'third_party/',
  'external/',
  '',
  '# Build outputs',
  'dist/',
  'build/',
  'out/',
  '.next/',
  '.nuxt/',
  '',
  '# Generated code',
  'generated/',
  '*.generated.*',
  '',
  '# Documentation examples',
  'examples/',
  'docs/examples/',
  'demo/',
  '',
  '# Development dependencies (optional)',
  '# Uncomment to exclude dev dependencies from scanning',
  '# [dev]',
  '',
  '# Package-specific exclusions',
  '# Add specific packages to ignore:',
  '# package:lodash',
  '# package:@types/*',
];

export interface IgnoreConfig {
  patterns: string[];
  excludeDevDeps: boolean;
  excludePackages: string[];
}

/**
 * Codicenseignore handler
 */
export class IgnoreHandler {
  private ignorePath: string;
  private patterns: string[] = [];
  private excludeDevDeps: boolean = false;
  private excludePackages: string[] = [];
  
  constructor(projectPath: string) {
    this.ignorePath = path.join(projectPath, IGNORE_FILE);
    this.load();
  }
  
  /**
   * Load ignore patterns from file
   */
  private load(): void {
    try {
      if (fs.existsSync(this.ignorePath)) {
        const content = fs.readFileSync(this.ignorePath, 'utf8');
        this.parseIgnoreFile(content);
      }
    } catch {
      // Use defaults if file can't be read
      this.patterns = [];
    }
  }
  
  /**
   * Parse ignore file content
   */
  private parseIgnoreFile(content: string): void {
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        // Check for special directives in comments
        if (trimmed === '# [dev]' || trimmed === '[dev]') {
          this.excludeDevDeps = true;
        }
        continue;
      }
      
      // Package exclusion
      if (trimmed.startsWith('package:')) {
        const pkg = trimmed.substring(8).trim();
        if (pkg) {
          this.excludePackages.push(pkg);
        }
        continue;
      }
      
      // Regular pattern
      this.patterns.push(trimmed);
    }
  }
  
  /**
   * Check if a path should be ignored
   */
  shouldIgnore(filePath: string): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    for (const pattern of this.patterns) {
      if (this.matchPattern(normalizedPath, pattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Check if a package should be ignored
   */
  shouldIgnorePackage(packageName: string, isDev: boolean = false): boolean {
    // Check dev dependency exclusion
    if (isDev && this.excludeDevDeps) {
      return true;
    }
    
    // Check package patterns
    for (const pattern of this.excludePackages) {
      if (this.matchPackagePattern(packageName, pattern)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Match a file path against a pattern
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    // Normalize pattern
    const normalizedPattern = pattern.replace(/\\/g, '/');
    
    // Exact match
    if (filePath === normalizedPattern) return true;
    
    // Directory match (pattern ends with /)
    if (normalizedPattern.endsWith('/')) {
      if (filePath.startsWith(normalizedPattern) ||
          filePath.includes('/' + normalizedPattern)) {
        return true;
      }
    }
    
    // Glob pattern (contains *)
    if (normalizedPattern.includes('*')) {
      const regex = this.globToRegex(normalizedPattern);
      if (regex.test(filePath)) return true;
    }
    
    // Substring match for directories
    if (filePath.includes('/' + normalizedPattern + '/') ||
        filePath.startsWith(normalizedPattern + '/') ||
        filePath.endsWith('/' + normalizedPattern)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Match a package name against a pattern
   */
  private matchPackagePattern(packageName: string, pattern: string): boolean {
    // Exact match
    if (packageName === pattern) return true;
    
    // Wildcard match
    if (pattern.includes('*')) {
      const regex = this.globToRegex(pattern);
      if (regex.test(packageName)) return true;
    }
    
    // Scope match (e.g., @types/*)
    if (pattern.endsWith('/*')) {
      const scope = pattern.slice(0, -2);
      if (packageName.startsWith(scope + '/')) return true;
    }
    
    return false;
  }
  
  /**
   * Convert glob pattern to regex
   */
  private globToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(`^${escaped}$`, 'i');
  }
  
  /**
   * Create default ignore file
   */
  static createDefault(projectPath: string): void {
    const ignorePath = path.join(projectPath, IGNORE_FILE);
    
    // Don't overwrite existing file
    if (fs.existsSync(ignorePath)) {
      return;
    }
    
    try {
      fs.writeFileSync(ignorePath, DEFAULT_IGNORE_PATTERNS.join('\n'), 'utf8');
    } catch {
      // Silently fail
    }
  }
  
  /**
   * Check if ignore file exists
   */
  static exists(projectPath: string): boolean {
    return fs.existsSync(path.join(projectPath, IGNORE_FILE));
  }
  
  /**
   * Get default patterns
   */
  static getDefaultPatterns(): string[] {
    return [...DEFAULT_IGNORE_PATTERNS];
  }
  
  /**
   * Get config for current project
   */
  getConfig(): IgnoreConfig {
    return {
      patterns: [...this.patterns],
      excludeDevDeps: this.excludeDevDeps,
      excludePackages: [...this.excludePackages],
    };
  }
}
