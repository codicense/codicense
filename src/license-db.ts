import spdxLicenses from 'spdx-license-list/full';
import type { License, LicenseCategory } from './types';

/**
 * License database manager - loads and queries SPDX license data
 */
class LicenseDatabase {
  private licenses: Map<string, License>;
  private aliasMap: Map<string, string>;

  constructor() {
    this.licenses = new Map();
    this.aliasMap = new Map();
    this.loadSpdxLicenses();
    this.setupAliases();
  }

  private loadSpdxLicenses() {
    // Load core licenses with categorization
    const coreDefinitions = this.getCoreDefinitions();

    for (const [id, data] of Object.entries(spdxLicenses)) {
      const coreDef = coreDefinitions.get(id);
      
      this.licenses.set(id, {
        id,
        name: data.name,
        category: coreDef?.category || this.inferCategory(id),
        osiApproved: data.osiApproved || false,
        fsfLibre: false,
        text: data.licenseText,
        obligations: coreDef?.obligations || [],
        permissions: coreDef?.permissions || [],
        limitations: coreDef?.limitations || [],
      });
    }
  }

  private getCoreDefinitions(): Map<string, Partial<License>> {
    const defs = new Map<string, Partial<License>>();

    // Permissive licenses
    defs.set('MIT', {
      category: 'permissive',
      obligations: ['attribution', 'include-license-text'],
      permissions: ['commercial-use', 'distribution', 'modification', 'private-use'],
      limitations: ['liability', 'warranty'],
    });

    defs.set('Apache-2.0', {
      category: 'permissive',
      obligations: ['attribution', 'include-license-text', 'state-changes'],
      permissions: ['commercial-use', 'distribution', 'modification', 'patent-use', 'private-use'],
      limitations: ['liability', 'trademark-use', 'warranty'],
    });

    defs.set('BSD-3-Clause', {
      category: 'permissive',
      obligations: ['attribution', 'include-license-text'],
      permissions: ['commercial-use', 'distribution', 'modification', 'private-use'],
      limitations: ['liability', 'warranty'],
    });

    defs.set('BSD-2-Clause', {
      category: 'permissive',
      obligations: ['attribution', 'include-license-text'],
      permissions: ['commercial-use', 'distribution', 'modification', 'private-use'],
      limitations: ['liability', 'warranty'],
    });

    defs.set('ISC', {
      category: 'permissive',
      obligations: ['attribution', 'include-license-text'],
      permissions: ['commercial-use', 'distribution', 'modification', 'private-use'],
      limitations: ['liability', 'warranty'],
    });

    // Weak copyleft
    defs.set('LGPL-2.1', {
      category: 'weak-copyleft',
      obligations: ['disclose-source', 'include-license-text', 'state-changes'],
      permissions: ['commercial-use', 'distribution', 'modification', 'private-use'],
      limitations: ['liability', 'warranty'],
    });

    defs.set('LGPL-3.0', {
      category: 'weak-copyleft',
      obligations: ['disclose-source', 'include-license-text', 'state-changes'],
      permissions: ['commercial-use', 'distribution', 'modification', 'patent-use', 'private-use'],
      limitations: ['liability', 'warranty'],
    });

    defs.set('MPL-2.0', {
      category: 'weak-copyleft',
      obligations: ['disclose-source', 'include-license-text'],
      permissions: ['commercial-use', 'distribution', 'modification', 'patent-use', 'private-use'],
      limitations: ['liability', 'trademark-use', 'warranty'],
    });

    // Strong copyleft
    defs.set('GPL-2.0', {
      category: 'strong-copyleft',
      obligations: ['disclose-source', 'include-copyright', 'include-license-text', 'same-license', 'state-changes'],
      permissions: ['commercial-use', 'distribution', 'modification', 'private-use'],
      limitations: ['liability', 'warranty'],
    });

    defs.set('GPL-3.0', {
      category: 'strong-copyleft',
      obligations: ['disclose-source', 'include-copyright', 'include-license-text', 'same-license', 'state-changes'],
      permissions: ['commercial-use', 'distribution', 'modification', 'patent-use', 'private-use'],
      limitations: ['liability', 'warranty'],
    });

    defs.set('AGPL-3.0', {
      category: 'strong-copyleft',
      obligations: ['disclose-source', 'include-copyright', 'include-license-text', 'network-use-disclose', 'same-license', 'state-changes'],
      permissions: ['commercial-use', 'distribution', 'modification', 'patent-use', 'private-use'],
      limitations: ['liability', 'warranty'],
    });

    return defs;
  }

  private inferCategory(licenseId: string): LicenseCategory {
    const id = licenseId.toLowerCase();
    
    if (id.includes('gpl') || id.includes('agpl')) {
      return 'strong-copyleft';
    }
    if (id.includes('lgpl') || id.includes('mpl') || id.includes('epl') || id.includes('cddl')) {
      return 'weak-copyleft';
    }
    if (id.includes('proprietary') || id === 'unlicensed') {
      return 'proprietary';
    }
    
    return 'permissive';
  }

  private setupAliases() {
    // Common variations and old SPDX identifiers
    this.aliasMap.set('GPL-2.0-only', 'GPL-2.0');
    this.aliasMap.set('GPL-2.0-or-later', 'GPL-2.0');
    this.aliasMap.set('GPL-3.0-only', 'GPL-3.0');
    this.aliasMap.set('GPL-3.0-or-later', 'GPL-3.0');
    this.aliasMap.set('AGPL-3.0-only', 'AGPL-3.0');
    this.aliasMap.set('AGPL-3.0-or-later', 'AGPL-3.0');
    this.aliasMap.set('LGPL-2.1-only', 'LGPL-2.1');
    this.aliasMap.set('LGPL-2.1-or-later', 'LGPL-2.1');
    this.aliasMap.set('LGPL-3.0-only', 'LGPL-3.0');
    this.aliasMap.set('LGPL-3.0-or-later', 'LGPL-3.0');
    
    // Common informal names
    this.aliasMap.set('BSD', 'BSD-3-Clause');
    this.aliasMap.set('Apache', 'Apache-2.0');
    this.aliasMap.set('Apache 2.0', 'Apache-2.0');
    this.aliasMap.set('Apache License 2.0', 'Apache-2.0');
  }

  /**
   * Get license by SPDX ID
   */
  getLicense(id: string): License | undefined {
    // Try direct lookup
    const license = this.licenses.get(id);
    if (license) return license;

    // Try alias
    const canonicalId = this.aliasMap.get(id);
    if (canonicalId) {
      return this.licenses.get(canonicalId);
    }

    return undefined;
  }

  /**
   * Normalize license identifier to canonical SPDX form
   */
  normalizeLicenseId(id: string): string {
    const normalized = id.trim();
    
    // Check if it's already valid
    if (this.licenses.has(normalized)) {
      return normalized;
    }

    // Check aliases
    const alias = this.aliasMap.get(normalized);
    if (alias) {
      return alias;
    }

    // Return as-is if unknown (will be handled as unknown license)
    return normalized;
  }

  /**
   * Check if license is copyleft
   */
  isCopyleft(licenseId: string): boolean {
    const license = this.getLicense(licenseId);
    if (!license) return false;
    
    return license.category === 'weak-copyleft' || license.category === 'strong-copyleft';
  }

  /**
   * Check if license is strong copyleft (GPL-like)
   */
  isStrongCopyleft(licenseId: string): boolean {
    const license = this.getLicense(licenseId);
    return license?.category === 'strong-copyleft';
  }

  /**
   * Get all loaded licenses
   */
  getAllLicenses(): License[] {
    return Array.from(this.licenses.values());
  }
}

// Export the class for programmatic use
export { LicenseDatabase };

// Singleton instance
export const licenseDb = new LicenseDatabase();

