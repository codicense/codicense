/**
 * Upgrade-aware fix engine.
 * Checks for version upgrades that resolve license conflicts.
 */

import type { FixSuggestion } from '../ili/types';

export interface UpgradeFix {
  packageName: string;
  currentVersion: string;
  suggestedVersion: string;
  currentLicense: string;
  newLicense: string;
  effort: 'low' | 'medium' | 'high';
  riskReduction: number;
  source: 'npm' | 'pypi' | 'go' | 'github' | 'cached';
  releaseDate?: string;
  changelog?: string;
}

export interface UpgradeCheckResult {
  hasUpgrade: boolean;
  upgrade?: UpgradeFix;
  alternatives: UpgradeFix[];
}

/**
 * Curated map of packages with known license improvements.
 */
const KNOWN_LICENSE_UPGRADES: Record<string, UpgradeFix[]> = {
  // Sample record for a known license change
  'known-gpl-to-mit': [{
    packageName: 'known-gpl-to-mit',
    currentVersion: '1.0.0',
    suggestedVersion: '2.0.0',
    currentLicense: 'GPL-3.0',
    newLicense: 'MIT',
    effort: 'low',
    riskReduction: 85,
    source: 'cached',
  }],
  
  // Patterns for common upgrade paths
  'faker': [{
    packageName: 'faker',
    currentVersion: '5.5.3',
    suggestedVersion: '@faker-js/faker@7.0.0',
    currentLicense: 'MIT',
    newLicense: 'MIT',
    effort: 'low',
    riskReduction: 0,
    source: 'npm',
  }],
};

/**
 * Patterns for license compatibility improvements via upgrades
 */
const LICENSE_IMPROVEMENT_PATTERNS: Array<{
  from: string[];
  to: string[];
  riskReduction: number;
}> = [
  { from: ['GPL-3.0', 'GPL-2.0'], to: ['MIT', 'Apache-2.0', 'BSD-3-Clause'], riskReduction: 85 },
  { from: ['AGPL-3.0'], to: ['MIT', 'Apache-2.0', 'GPL-3.0'], riskReduction: 90 },
  { from: ['LGPL-3.0', 'LGPL-2.1'], to: ['MIT', 'Apache-2.0'], riskReduction: 60 },
  { from: ['UNKNOWN'], to: ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'], riskReduction: 70 },
];

/**
 * Upgrade-Aware Fix Engine
 */
export class UpgradeEngine {
  /**
   * Check if a newer version of the package has a better license
   */
  static checkForUpgrade(
    packageName: string,
    currentVersion: string,
    currentLicense: string
  ): UpgradeCheckResult {
    // Check known upgrades database
    const knownUpgrades = KNOWN_LICENSE_UPGRADES[packageName];
    if (knownUpgrades) {
      const relevantUpgrade = knownUpgrades.find(
        (u) => this.isNewerVersion(u.suggestedVersion, currentVersion) &&
               this.isLicenseImprovement(currentLicense, u.newLicense)
      );
      
      if (relevantUpgrade) {
        return {
          hasUpgrade: true,
          upgrade: {
            ...relevantUpgrade,
            currentVersion,
            currentLicense,
          },
          alternatives: [],
        };
      }
    }
    
    // Check for general upgrade patterns
    const potentialUpgrade = this.simulateRegistryCheck(
      packageName,
      currentVersion,
      currentLicense
    );
    
    return potentialUpgrade;
  }
  
  /**
  * Simulated registry check to keep offline determinism
   */
  private static simulateRegistryCheck(
    _packageName: string,
    _currentVersion: string,
    currentLicense: string
  ): UpgradeCheckResult {
    const isProblematicLicense = ['GPL-3.0', 'GPL-2.0', 'AGPL-3.0', 'LGPL-3.0', 'UNKNOWN']
      .includes(currentLicense.toUpperCase().replace(/-ONLY|-OR-LATER/, ''));

    if (!isProblematicLicense) {
      return { hasUpgrade: false, alternatives: [] };
    }

    return {
      hasUpgrade: false,
      alternatives: [],
    };
  }
  
  /**
   * Check if version A is newer than version B
   */
  private static isNewerVersion(versionA: string, versionB: string): boolean {
    // Handle scoped package renames (e.g., @faker-js/faker)
    if (versionA.includes('@') && versionA.includes('/')) {
      return true; // New package name is always considered an upgrade path
    }
    
    const parseVersion = (v: string): number[] => {
      return v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
    };
    
    const a = parseVersion(versionA);
    const b = parseVersion(versionB);
    
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const aVal = a[i] || 0;
      const bVal = b[i] || 0;
      if (aVal > bVal) return true;
      if (aVal < bVal) return false;
    }
    
    return false;
  }
  
  /**
   * Check if a license change is an improvement
   */
  private static isLicenseImprovement(fromLicense: string, toLicense: string): boolean {
    const normalize = (l: string) => l.toUpperCase().replace(/-ONLY|-OR-LATER/, '');
    const from = normalize(fromLicense);
    const to = normalize(toLicense);
    
    for (const pattern of LICENSE_IMPROVEMENT_PATTERNS) {
      if (pattern.from.includes(from) && pattern.to.includes(to)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Calculate risk reduction for an upgrade
   */
  static calculateRiskReduction(fromLicense: string, toLicense: string): number {
    const normalize = (l: string) => l.toUpperCase().replace(/-ONLY|-OR-LATER/, '');
    const from = normalize(fromLicense);
    const to = normalize(toLicense);
    
    for (const pattern of LICENSE_IMPROVEMENT_PATTERNS) {
      if (pattern.from.includes(from) && pattern.to.includes(to)) {
        return pattern.riskReduction;
      }
    }
    
    return 0;
  }
  
  /**
   * Generate a FixSuggestion for an upgrade
   */
  static toFixSuggestion(upgrade: UpgradeFix): FixSuggestion {
    return {
      effort: upgrade.effort,
      strategy: 'upgrade',
      description: `Upgrade ${upgrade.packageName}@${upgrade.currentVersion} → ${upgrade.suggestedVersion} (license: ${upgrade.currentLicense} → ${upgrade.newLicense})`,
      implementation: `npm install ${upgrade.suggestedVersion.includes('/') ? upgrade.suggestedVersion.split('@')[0] + '@' + upgrade.suggestedVersion.split('@')[1] : upgrade.packageName + '@' + upgrade.suggestedVersion}`,
      tradeoffs: [
        'Requires testing for breaking changes',
        `Risk reduction: −${upgrade.riskReduction}%`,
      ],
      estimatedTime: '15-30 minutes',
    };
  }
  
  /**
   * Format upgrade for display
   */
  static formatUpgrade(upgrade: UpgradeFix): string {
    return [
      `✔ Upgrade ${upgrade.packageName}@${upgrade.currentVersion} → ${upgrade.suggestedVersion}`,
      `  License: ${upgrade.currentLicense} → ${upgrade.newLicense}`,
      `  Effort: ${upgrade.effort.charAt(0).toUpperCase() + upgrade.effort.slice(1)}`,
      `  Risk reduction: −${upgrade.riskReduction}%`,
    ].join('\n');
  }
}
