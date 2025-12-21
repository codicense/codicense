/**
 * License Obligations Database
 * 
 * Plain English explanations of license obligations.
 * Reduces legal anxiety with clear, actionable descriptions.
 */

export interface LicenseObligation {
  id: string;
  shortName: string;
  description: string;
  action: string;
  severity: 'must' | 'should' | 'may';
}

export interface LicenseObligationSummary {
  license: string;
  category: string;
  summary: string;
  obligations: LicenseObligation[];
  permissions: string[];
  limitations: string[];
  tldr: string;
}

/**
 * License Obligations Database with plain English explanations
 */
const OBLIGATIONS_DB: Record<string, LicenseObligationSummary> = {
  'GPL-3.0': {
    license: 'GPL-3.0',
    category: 'Strong Copyleft',
    summary: 'Requires source code disclosure for distributed derivative works',
    tldr: 'If you distribute software using this, you must share your source code under GPL-3.0 too.',
    obligations: [
      {
        id: 'source-disclosure',
        shortName: 'Source Code Disclosure',
        description: 'You must make your source code available when distributing the software',
        action: 'Provide source code to anyone who receives your software',
        severity: 'must',
      },
      {
        id: 'same-license',
        shortName: 'Same License',
        description: 'Derivative works must be licensed under GPL-3.0',
        action: 'License your project under GPL-3.0 if you distribute it',
        severity: 'must',
      },
      {
        id: 'copyright-notice',
        shortName: 'Copyright Notices',
        description: 'Keep all copyright and license notices intact',
        action: 'Include original copyright notices in your distribution',
        severity: 'must',
      },
      {
        id: 'state-changes',
        shortName: 'State Changes',
        description: 'Document any modifications you make',
        action: 'Add notices to modified files indicating changes',
        severity: 'must',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Patent use',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
    ],
  },
  
  'GPL-2.0': {
    license: 'GPL-2.0',
    category: 'Strong Copyleft',
    summary: 'Requires source code disclosure for distributed derivative works',
    tldr: 'Similar to GPL-3.0 but without explicit patent grants.',
    obligations: [
      {
        id: 'source-disclosure',
        shortName: 'Source Code Disclosure',
        description: 'You must make your source code available when distributing',
        action: 'Provide source code to anyone who receives your software',
        severity: 'must',
      },
      {
        id: 'same-license',
        shortName: 'Same License',
        description: 'Derivative works must be licensed under GPL-2.0',
        action: 'License your project under GPL-2.0 if you distribute it',
        severity: 'must',
      },
      {
        id: 'copyright-notice',
        shortName: 'Copyright Notices',
        description: 'Keep all copyright and license notices intact',
        action: 'Include original copyright notices',
        severity: 'must',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
    ],
  },
  
  'AGPL-3.0': {
    license: 'AGPL-3.0',
    category: 'Network Copyleft',
    summary: 'Like GPL-3.0, but also applies to network use (SaaS)',
    tldr: 'Even if you only run this as a service (not distribute), you must share your source code.',
    obligations: [
      {
        id: 'network-disclosure',
        shortName: 'Network Source Disclosure',
        description: 'Users interacting over a network must be able to get the source code',
        action: 'Provide source code download option for network users',
        severity: 'must',
      },
      {
        id: 'source-disclosure',
        shortName: 'Source Code Disclosure',
        description: 'You must make source code available when distributing',
        action: 'Provide complete source code',
        severity: 'must',
      },
      {
        id: 'same-license',
        shortName: 'Same License',
        description: 'All derivative works must use AGPL-3.0',
        action: 'License your entire project under AGPL-3.0',
        severity: 'must',
      },
      {
        id: 'copyright-notice',
        shortName: 'Copyright Notices',
        description: 'Preserve all copyright notices',
        action: 'Include original notices in your distribution',
        severity: 'must',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Patent use',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
    ],
  },
  
  'LGPL-3.0': {
    license: 'LGPL-3.0',
    category: 'Weak Copyleft',
    summary: 'Copyleft applies to the library only, not your whole application',
    tldr: 'You can use this in proprietary software if you allow relinking with modified library versions.',
    obligations: [
      {
        id: 'library-source',
        shortName: 'Library Source',
        description: 'Modifications to the library itself must be disclosed',
        action: 'Share source code of any modifications to the library',
        severity: 'must',
      },
      {
        id: 'relinking',
        shortName: 'Allow Relinking',
        description: 'Users must be able to relink with modified library versions',
        action: 'Use dynamic linking or provide object files',
        severity: 'must',
      },
      {
        id: 'copyright-notice',
        shortName: 'Copyright Notices',
        description: 'Include copyright and license notices',
        action: 'Include LGPL notice with your distribution',
        severity: 'must',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Patent use',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
    ],
  },
  
  'LGPL-2.1': {
    license: 'LGPL-2.1',
    category: 'Weak Copyleft',
    summary: 'Copyleft applies to the library only',
    tldr: 'Similar to LGPL-3.0 but older version.',
    obligations: [
      {
        id: 'library-source',
        shortName: 'Library Source',
        description: 'Modifications to the library must be disclosed',
        action: 'Share modifications to the library itself',
        severity: 'must',
      },
      {
        id: 'relinking',
        shortName: 'Allow Relinking',
        description: 'Users must be able to use modified library versions',
        action: 'Use dynamic linking or provide object files',
        severity: 'must',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
    ],
  },
  
  'MPL-2.0': {
    license: 'MPL-2.0',
    category: 'Weak Copyleft (File-Level)',
    summary: 'Copyleft applies only to modified files',
    tldr: 'You can combine this with proprietary code; just share changes to MPL-licensed files.',
    obligations: [
      {
        id: 'file-disclosure',
        shortName: 'File-Level Disclosure',
        description: 'Modifications to MPL-licensed files must be shared',
        action: 'Disclose source of any modified MPL files',
        severity: 'must',
      },
      {
        id: 'copyright-notice',
        shortName: 'Copyright Notices',
        description: 'Include copyright notices in modified files',
        action: 'Keep notices in source files',
        severity: 'must',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Patent use',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
      'No trademark use',
    ],
  },
  
  'MIT': {
    license: 'MIT',
    category: 'Permissive',
    summary: 'Very permissive; just include the license notice',
    tldr: 'Use it however you want. Just include the copyright notice.',
    obligations: [
      {
        id: 'copyright-notice',
        shortName: 'Copyright Notice',
        description: 'Include the copyright and license notice',
        action: 'Copy the MIT license text into your distribution',
        severity: 'must',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
    ],
  },
  
  'Apache-2.0': {
    license: 'Apache-2.0',
    category: 'Permissive',
    summary: 'Permissive with patent grant; include notices and state changes',
    tldr: 'Use freely, but include the license and note any changes you make.',
    obligations: [
      {
        id: 'copyright-notice',
        shortName: 'Copyright Notice',
        description: 'Include copyright, patent, and attribution notices',
        action: 'Include NOTICE file if present',
        severity: 'must',
      },
      {
        id: 'state-changes',
        shortName: 'State Changes',
        description: 'Document significant modifications',
        action: 'Note any changes you made in modified files',
        severity: 'should',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Patent use',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
      'No trademark use',
    ],
  },
  
  'BSD-3-Clause': {
    license: 'BSD-3-Clause',
    category: 'Permissive',
    summary: 'Permissive; include notice; no endorsement claims',
    tldr: 'Use freely, include the license, don\'t use project names for endorsement.',
    obligations: [
      {
        id: 'copyright-notice',
        shortName: 'Copyright Notice',
        description: 'Include copyright and license notice',
        action: 'Include the BSD license text',
        severity: 'must',
      },
      {
        id: 'no-endorsement',
        shortName: 'No Endorsement',
        description: 'Don\'t use project/contributor names for endorsement',
        action: 'Avoid implying endorsement by original authors',
        severity: 'must',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
    ],
  },
  
  'ISC': {
    license: 'ISC',
    category: 'Permissive',
    summary: 'Functionally equivalent to MIT',
    tldr: 'Very permissive. Include the license notice.',
    obligations: [
      {
        id: 'copyright-notice',
        shortName: 'Copyright Notice',
        description: 'Include copyright and license notice',
        action: 'Include ISC license text',
        severity: 'must',
      },
    ],
    permissions: [
      'Commercial use',
      'Distribution',
      'Modification',
      'Private use',
    ],
    limitations: [
      'No liability',
      'No warranty',
    ],
  },
};

/**
 * License Obligations Explainer
 */
export class ObligationsExplainer {
  /**
   * Get obligation summary for a license
   */
  static getObligations(license: string): LicenseObligationSummary | null {
    // Normalize license identifier
    const normalized = this.normalizeLicense(license);
    return OBLIGATIONS_DB[normalized] || null;
  }
  
  /**
   * Normalize license identifier
   */
  private static normalizeLicense(license: string): string {
    if (!license) return 'UNKNOWN';
    
    const normalized = license.toUpperCase()
      .replace(/-ONLY$/, '')
      .replace(/-OR-LATER$/, '');
    
    // Map common variations
    const aliases: Record<string, string> = {
      'GPL3': 'GPL-3.0',
      'GPL2': 'GPL-2.0',
      'AGPL3': 'AGPL-3.0',
      'LGPL3': 'LGPL-3.0',
      'LGPL2': 'LGPL-2.1',
      'BSD': 'BSD-3-Clause',
      'APACHE': 'Apache-2.0',
      'APACHE2': 'Apache-2.0',
    };
    
    return aliases[normalized] || normalized;
  }
  
  /**
   * Format obligations for CLI display
   */
  static formatObligations(license: string): string {
    const summary = this.getObligations(license);
    
    if (!summary) {
      return `No detailed information available for ${license}.\nConsult the license text directly.`;
    }
    
    const lines: string[] = [];
    
    lines.push(`📜 ${summary.license} (${summary.category})`);
    lines.push('');
    lines.push(`📝 ${summary.summary}`);
    lines.push('');
    lines.push(`💡 TL;DR: ${summary.tldr}`);
    lines.push('');
    
    lines.push('📋 Obligations:');
    for (const obligation of summary.obligations) {
      const icon = obligation.severity === 'must' ? '⚠️' : 
                   obligation.severity === 'should' ? '💡' : 'ℹ️';
      lines.push(`  ${icon} ${obligation.shortName}`);
      lines.push(`     ${obligation.description}`);
      lines.push(`     → ${obligation.action}`);
    }
    
    lines.push('');
    lines.push('✅ Permissions:');
    for (const perm of summary.permissions) {
      lines.push(`  • ${perm}`);
    }
    
    lines.push('');
    lines.push('⛔ Limitations:');
    for (const limit of summary.limitations) {
      lines.push(`  • ${limit}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * Get short obligation summary for conflict display
   */
  static getShortSummary(license: string): string {
    const summary = this.getObligations(license);
    
    if (!summary) {
      return `${license}: Check license terms`;
    }
    
    return `${license} requires:\n${summary.obligations.map(o => `• ${o.shortName}`).join('\n')}`;
  }
  
  /**
   * Check if a license has problematic obligations for a use case
   */
  static hasProblematicObligations(
    license: string,
    distributionModel: string
  ): { problematic: boolean; reason: string } {
    const summary = this.getObligations(license);
    
    if (!summary) {
      return { problematic: false, reason: 'Unknown license' };
    }
    
    // Check for network disclosure with SaaS
    if (distributionModel === 'saas') {
      const networkObligation = summary.obligations.find(o => o.id === 'network-disclosure');
      if (networkObligation) {
        return {
          problematic: true,
          reason: `${license} requires source disclosure for network use (affects SaaS)`,
        };
      }
    }
    
    // Check for strong copyleft with proprietary
    if (distributionModel === 'proprietary') {
      const sameL = summary.obligations.find(o => o.id === 'same-license');
      if (sameL && summary.category.includes('Strong')) {
        return {
          problematic: true,
          reason: `${license} requires derivative works to use the same license`,
        };
      }
    }
    
    return { problematic: false, reason: '' };
  }
}
