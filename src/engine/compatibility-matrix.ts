import type { 
  CompatibilityRule, 
  DistributionModel, 
  LinkingModel, 
  Severity 
} from '../types';
import { licenseDb } from '../license-db';

/**
 * Extended compatibility result with traceability
 */
export interface CompatibilityResult {
  compatible: boolean;
  reason: string;
  severity: Severity;
  ruleId?: string;
  spdxRef?: string;
  legalBasis?: string;
  isHeuristic: boolean;
}

/**
 * License compatibility matrix - determines if two licenses can coexist
 * Supports strict mode and full traceability
 */
export class CompatibilityMatrix {
  private rules: CompatibilityRule[];

  constructor() {
    this.rules = this.buildRules();
  }

  /**
   * Check if a dependency license is compatible with project license
   * @param strictMode When true, only explicit rules are used (no heuristics)
   */
  isCompatible(
    projectLicense: string,
    dependencyLicense: string,
    linkingModel: LinkingModel,
    distributionModel: DistributionModel,
    strictMode = false
  ): CompatibilityResult {
    const normalizedProject = licenseDb.normalizeLicenseId(projectLicense);
    const normalizedDep = licenseDb.normalizeLicenseId(dependencyLicense);

    // Find matching rule
    const rule = this.findRule(normalizedProject, normalizedDep, linkingModel, distributionModel);

    if (rule) {
      return {
        compatible: rule.compatible,
        reason: rule.reason,
        severity: rule.severity,
        ruleId: rule.id,
        spdxRef: rule.spdxRef,
        legalBasis: rule.legalBasis,
        isHeuristic: false,
      };
    }

    // In strict mode, reject if no explicit rule
    if (strictMode) {
      return {
        compatible: false,
        reason: `No explicit compatibility rule found for ${projectLicense} + ${dependencyLicense}. Strict mode requires explicit rules.`,
        severity: 'HIGH',
        isHeuristic: false,
        ruleId: 'STRICT_MODE_VIOLATION',
      };
    }

    // Fallback to heuristic if no explicit rule
    return this.heuristicCheck(normalizedProject, normalizedDep, linkingModel, distributionModel);
  }

  private findRule(
    projectLicense: string,
    dependencyLicense: string,
    linkingModel: LinkingModel,
    distributionModel: DistributionModel
  ): CompatibilityRule | undefined {
    // Try exact match first
    const exactMatch = this.rules.find((rule) => {
      return (
        rule.projectLicense === projectLicense &&
        rule.dependencyLicense === dependencyLicense &&
        rule.linkingModel === linkingModel &&
        rule.distributionModel === distributionModel
      );
    });
    
    if (exactMatch) return exactMatch;
    
    // Try wildcard match
    return this.rules.find((rule) => {
      const projectMatch = rule.projectLicense === projectLicense || rule.projectLicense === '*';
      const depMatch = rule.dependencyLicense === dependencyLicense || rule.dependencyLicense === '*';
      const linkMatch = rule.linkingModel === linkingModel;
      const distMatch = rule.distributionModel === distributionModel;
      
      return projectMatch && depMatch && linkMatch && distMatch;
    });
  }

  private heuristicCheck(
    projectLicense: string,
    dependencyLicense: string,
    linkingModel: LinkingModel,
    distributionModel: DistributionModel
  ): CompatibilityResult {
    const depLicense = licenseDb.getLicense(dependencyLicense);

    // If dependency license is unknown, treat as compatible with low priority warning
    // (Unknown typically means the lockfile doesn't include license info - most packages are MIT/Apache)
    if (!depLicense || dependencyLicense === 'UNKNOWN') {
      return {
        compatible: true,
        reason: `Dependency license "${dependencyLicense}" is not in the database. Manual review recommended.`,
        severity: 'LOW',
        isHeuristic: true,
        ruleId: 'HEURISTIC_UNKNOWN_LICENSE',
      };
    }

    // Permissive licenses are almost always safe
    if (depLicense.category === 'permissive') {
      return {
        compatible: true,
        reason: `${dependencyLicense} is a permissive license compatible with most projects.`,
        severity: 'LOW',
        isHeuristic: true,
        ruleId: 'HEURISTIC_PERMISSIVE',
        legalBasis: 'Permissive licenses grant broad rights without copyleft restrictions.',
      };
    }

    // Strong copyleft with proprietary is critical
    if (depLicense.category === 'strong-copyleft' && distributionModel === 'proprietary') {
      return {
        compatible: false,
        reason: `${dependencyLicense} is strong copyleft and requires derivative works to be licensed under ${dependencyLicense}. This conflicts with proprietary distribution.`,
        severity: 'CRITICAL',
        isHeuristic: true,
        ruleId: 'HEURISTIC_STRONG_COPYLEFT_PROPRIETARY',
        legalBasis: 'Strong copyleft requires derivative works to use the same license.',
      };
    }

    // Weak copyleft with dynamic linking is usually OK
    if (depLicense.category === 'weak-copyleft' && linkingModel === 'dynamic') {
      return {
        compatible: true,
        reason: `${dependencyLicense} allows dynamic linking with proprietary code.`,
        severity: 'LOW',
        isHeuristic: true,
        ruleId: 'HEURISTIC_WEAK_COPYLEFT_DYNAMIC',
        legalBasis: 'LGPL and similar licenses explicitly permit dynamic linking.',
      };
    }

    // Default to cautious
    return {
      compatible: false,
      reason: `Potential incompatibility between ${projectLicense} and ${dependencyLicense}. Manual review recommended.`,
      severity: 'MEDIUM',
      isHeuristic: true,
      ruleId: 'HEURISTIC_DEFAULT_CAUTIOUS',
    };
  }

  /**
   * Generate a unique rule ID based on licenses and context
   */
  private generateRuleId(
    projectLicense: string,
    depLicense: string,
    linkingModel: string,
    distributionModel: string,
    index: number
  ): string {
    const proj = projectLicense.replace(/-/g, '').substring(0, 6).toUpperCase();
    const dep = depLicense.replace(/-/g, '').substring(0, 6).toUpperCase();
    const link = linkingModel.substring(0, 3).toUpperCase();
    const dist = distributionModel.substring(0, 3).toUpperCase();
    return `${proj}_${dep}_${link}_${dist}_${String(index).padStart(3, '0')}`;
  }

  private buildRules(): CompatibilityRule[] {
    const rules: CompatibilityRule[] = [];
    let ruleIndex = 1;

    // Helper to add rule with auto-generated ID
    const addRule = (rule: Omit<CompatibilityRule, 'id' | 'isHeuristic'> & { id?: string }): void => {
      rules.push({
        ...rule,
        id: rule.id || this.generateRuleId(
          rule.projectLicense,
          rule.dependencyLicense,
          rule.linkingModel,
          rule.distributionModel,
          ruleIndex++
        ),
        isHeuristic: false,
      });
    };

    // === Permissive project licenses ===
    
    // MIT project
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'MIT',
      linkingModel: 'static',
      distributionModel: 'proprietary',
      compatible: true,
      reason: 'MIT is compatible with MIT.',
      severity: 'LOW',
      spdxRef: 'MIT License - https://spdx.org/licenses/MIT.html',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'Apache-2.0',
      linkingModel: 'static',
      distributionModel: 'proprietary',
      compatible: true,
      reason: 'Apache-2.0 is compatible with MIT projects.',
      severity: 'LOW',
      spdxRef: 'Apache-2.0 Section 4 - Redistribution',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'BSD-3-Clause',
      linkingModel: 'static',
      distributionModel: 'proprietary',
      compatible: true,
      reason: 'BSD-3-Clause is compatible with MIT projects.',
      severity: 'LOW',
      spdxRef: 'BSD-3-Clause - https://spdx.org/licenses/BSD-3-Clause.html',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'ISC',
      linkingModel: 'static',
      distributionModel: 'proprietary',
      compatible: true,
      reason: 'ISC is compatible with MIT projects.',
      severity: 'LOW',
      spdxRef: 'ISC License - https://spdx.org/licenses/ISC.html',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'GPL-2.0',
      linkingModel: 'static',
      distributionModel: 'proprietary',
      compatible: false,
      reason: 'GPL-2.0 requires the entire combined work to be GPL-2.0. Static linking with proprietary MIT code creates a derivative work that must be GPL-2.0.',
      severity: 'CRITICAL',
      spdxRef: 'GPL-2.0 Section 2(b) - Derivative Works',
      legalBasis: 'GPLv2 requires derivative works to be licensed under GPL-2.0.',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'GPL-3.0',
      linkingModel: 'static',
      distributionModel: 'proprietary',
      compatible: false,
      reason: 'GPL-3.0 requires the entire combined work to be GPL-3.0. Static linking with proprietary MIT code creates a derivative work that must be GPL-3.0.',
      severity: 'CRITICAL',
      spdxRef: 'GPL-3.0 Section 5 - Conveying Modified Source Versions',
      legalBasis: 'GPLv3 Section 5(c) requires derivative works to be GPL-3.0.',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'AGPL-3.0',
      linkingModel: 'static',
      distributionModel: 'proprietary',
      compatible: false,
      reason: 'AGPL-3.0 requires the entire combined work to be AGPL-3.0, including server-side code. This conflicts with proprietary distribution.',
      severity: 'CRITICAL',
      spdxRef: 'AGPL-3.0 Section 13 - Remote Network Interaction',
      legalBasis: 'AGPL extends GPL copyleft to network services.',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'AGPL-3.0',
      linkingModel: 'static',
      distributionModel: 'saas',
      compatible: false,
      reason: 'AGPL-3.0 requires disclosure of all source code for SaaS applications. This conflicts with proprietary SaaS.',
      severity: 'CRITICAL',
      spdxRef: 'AGPL-3.0 Section 13 - Remote Network Interaction',
      legalBasis: 'AGPL Section 13 triggers on network interaction, not just distribution.',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'LGPL-2.1',
      linkingModel: 'dynamic',
      distributionModel: 'proprietary',
      compatible: true,
      reason: 'LGPL-2.1 allows dynamic linking with proprietary code.',
      severity: 'LOW',
      spdxRef: 'LGPL-2.1 Section 6 - Combining with Non-LGPL Works',
      legalBasis: 'LGPL explicitly permits dynamic linking.',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'LGPL-2.1',
      linkingModel: 'static',
      distributionModel: 'proprietary',
      compatible: false,
      reason: 'LGPL-2.1 with static linking requires providing object files to allow re-linking. This is often impractical for proprietary software.',
      severity: 'HIGH',
      spdxRef: 'LGPL-2.1 Section 6(a) - Object Code Requirements',
      legalBasis: 'LGPL requires ability for users to re-link with modified library.',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'LGPL-3.0',
      linkingModel: 'dynamic',
      distributionModel: 'proprietary',
      compatible: true,
      reason: 'LGPL-3.0 allows dynamic linking with proprietary code.',
      severity: 'LOW',
      spdxRef: 'LGPL-3.0 Section 4 - Combined Works',
      legalBasis: 'LGPLv3 Section 4 permits combination with non-LGPL works.',
    });
    addRule({
      projectLicense: 'MIT',
      dependencyLicense: 'MPL-2.0',
      linkingModel: 'static',
      distributionModel: 'proprietary',
      compatible: true,
      reason: 'MPL-2.0 is file-level copyleft. Only modified MPL files need to be disclosed.',
      severity: 'MEDIUM',
      spdxRef: 'MPL-2.0 Section 3.2 - Distribution of Executable Form',
      legalBasis: 'MPL copyleft applies at file level, not entire work.',
    });

    // Apache-2.0 project
    rules.push(
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'MIT',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'MIT is compatible with Apache-2.0 projects.',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'Apache-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'Apache-2.0 is compatible with Apache-2.0.',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'GPL-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'GPL-2.0 is incompatible with Apache-2.0 due to patent clause conflicts.',
        severity: 'CRITICAL',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'GPL-3.0 requires the entire work to be GPL-3.0. Apache-2.0 cannot be relicensed as GPL-3.0 for proprietary projects.',
        severity: 'CRITICAL',
      }
    );

    // === GPL Projects (open-source) ===
    
    rules.push(
      {
        projectLicense: 'GPL-3.0',
        dependencyLicense: 'MIT',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'MIT code can be incorporated into GPL-3.0 projects.',
        severity: 'LOW',
      },
      {
        projectLicense: 'GPL-3.0',
        dependencyLicense: 'Apache-2.0',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'Apache-2.0 is compatible with GPL-3.0 (but not GPL-2.0).',
        severity: 'LOW',
      },
      {
        projectLicense: 'GPL-3.0',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'GPL-3.0 is compatible with GPL-3.0.',
        severity: 'LOW',
      },
      {
        projectLicense: 'GPL-2.0',
        dependencyLicense: 'Apache-2.0',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: false,
        reason: 'GPL-2.0 is incompatible with Apache-2.0 due to patent clause conflicts.',
        severity: 'HIGH',
      }
    );

    // === Microservice architecture (looser coupling) ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'microservice',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'GPL-3.0 in a separate microservice (communicating over network) does not create a derivative work. Each service can have independent licenses.',
        severity: 'LOW',
      },
      {
        projectLicense: 'MIT',
        dependencyLicense: 'AGPL-3.0',
        linkingModel: 'microservice',
        distributionModel: 'saas',
        compatible: false,
        reason: 'AGPL-3.0 requires disclosure of source code even in microservice architecture if services interact.',
        severity: 'HIGH',
      }
    );

    // === BSD-3-Clause project ===
    
    rules.push(
      {
        projectLicense: 'BSD-3-Clause',
        dependencyLicense: 'MIT',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'MIT is compatible with BSD-3-Clause projects.',
        severity: 'LOW',
      },
      {
        projectLicense: 'BSD-3-Clause',
        dependencyLicense: 'Apache-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'Apache-2.0 is compatible with BSD-3-Clause projects.',
        severity: 'LOW',
      },
      {
        projectLicense: 'BSD-3-Clause',
        dependencyLicense: 'BSD-3-Clause',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'BSD-3-Clause is compatible with itself.',
        severity: 'LOW',
      },
      {
        projectLicense: 'BSD-3-Clause',
        dependencyLicense: 'BSD-2-Clause',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'BSD-2-Clause is compatible with BSD-3-Clause.',
        severity: 'LOW',
      },
      {
        projectLicense: 'BSD-3-Clause',
        dependencyLicense: 'ISC',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'ISC is compatible with BSD-3-Clause.',
        severity: 'LOW',
      },
      {
        projectLicense: 'BSD-3-Clause',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'GPL-3.0 requires derivative works to be GPL-3.0. Static linking creates incompatibility with proprietary BSD projects.',
        severity: 'CRITICAL',
      },
      {
        projectLicense: 'BSD-3-Clause',
        dependencyLicense: 'GPL-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'GPL-2.0 requires derivative works to be GPL-2.0. Static linking creates incompatibility with proprietary BSD projects.',
        severity: 'CRITICAL',
      }
    );

    // === ISC project ===
    
    rules.push(
      {
        projectLicense: 'ISC',
        dependencyLicense: 'MIT',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'MIT is compatible with ISC projects.',
        severity: 'LOW',
      },
      {
        projectLicense: 'ISC',
        dependencyLicense: 'ISC',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'ISC is compatible with ISC.',
        severity: 'LOW',
      },
      {
        projectLicense: 'ISC',
        dependencyLicense: 'Apache-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'Apache-2.0 is compatible with ISC.',
        severity: 'LOW',
      },
      {
        projectLicense: 'ISC',
        dependencyLicense: 'BSD-3-Clause',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'BSD-3-Clause is compatible with ISC.',
        severity: 'LOW',
      },
      {
        projectLicense: 'ISC',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'GPL-3.0 requires derivative works to be GPL-3.0. Static linking creates incompatibility with proprietary ISC projects.',
        severity: 'CRITICAL',
      }
    );

    // === 0BSD (Zero-Clause BSD) - public domain equivalent ===
    
    rules.push(
      {
        projectLicense: '0BSD',
        dependencyLicense: 'MIT',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'MIT is compatible with 0BSD (public domain equivalent).',
        severity: 'LOW',
      },
      {
        projectLicense: '0BSD',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'GPL-3.0 requires derivative works to be GPL-3.0. Conflicts with proprietary 0BSD projects.',
        severity: 'CRITICAL',
      },
      {
        projectLicense: 'MIT',
        dependencyLicense: '0BSD',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: '0BSD (public domain equivalent) is compatible with everything.',
        severity: 'LOW',
      }
    );

    // === Unlicense (public domain) ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'Unlicense',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'Unlicense (public domain) is compatible with all licenses.',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'Unlicense',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'Unlicense (public domain) is compatible with all licenses.',
        severity: 'LOW',
      },
      {
        projectLicense: 'GPL-3.0',
        dependencyLicense: 'Unlicense',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'Unlicense (public domain) can be incorporated into GPL projects.',
        severity: 'LOW',
      }
    );

    // === CC0 (Creative Commons Zero) ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'CC0-1.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'CC0 (public domain dedication) is compatible with all licenses.',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'CC0-1.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'CC0 (public domain dedication) is compatible with all licenses.',
        severity: 'LOW',
      }
    );

    // === WTFPL (Do What The Fuck You Want To Public License) ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'WTFPL',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'WTFPL is compatible with all licenses (extremely permissive).',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'WTFPL',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'WTFPL is compatible with all licenses (extremely permissive).',
        severity: 'LOW',
      }
    );

    // === Artistic License 2.0 ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'Artistic-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'Artistic-2.0 is a permissive license compatible with MIT.',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'Artistic-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'Artistic-2.0 is compatible with Apache-2.0.',
        severity: 'LOW',
      }
    );

    // === Zlib License ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'Zlib',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'Zlib is a permissive license compatible with MIT.',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'Zlib',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'Zlib is a permissive license compatible with Apache-2.0.',
        severity: 'LOW',
      }
    );

    // === Python Software Foundation License ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'PSF-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'PSF-2.0 is compatible with permissive licenses.',
        severity: 'LOW',
      }
    );

    // === EUPL (European Union Public License) ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'EUPL-1.2',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'EUPL-1.2 is a copyleft license. Derivative works must be EUPL-1.2 or compatible.',
        severity: 'HIGH',
      },
      {
        projectLicense: 'GPL-3.0',
        dependencyLicense: 'EUPL-1.2',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'EUPL-1.2 is explicitly compatible with GPL-3.0.',
        severity: 'LOW',
      }
    );

    // === EPL (Eclipse Public License) ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'EPL-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'EPL-2.0 requires derivative works to be EPL-2.0 or a compatible license. May conflict with proprietary use.',
        severity: 'HIGH',
      },
      {
        projectLicense: 'MIT',
        dependencyLicense: 'EPL-2.0',
        linkingModel: 'dynamic',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'EPL-2.0 allows dynamic linking with proprietary code (secondary license provision).',
        severity: 'MEDIUM',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'EPL-2.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'EPL-2.0 copyleft requirements conflict with proprietary Apache projects.',
        severity: 'HIGH',
      }
    );

    // === CDDL (Common Development and Distribution License) ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'CDDL-1.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'CDDL-1.0 is file-level copyleft. Only modified CDDL files need to be disclosed.',
        severity: 'MEDIUM',
      },
      {
        projectLicense: 'GPL-2.0',
        dependencyLicense: 'CDDL-1.0',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: false,
        reason: 'CDDL-1.0 is incompatible with GPL-2.0 due to conflicting copyleft terms.',
        severity: 'CRITICAL',
      }
    );

    // === Open-source distribution models ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'GPL-2.0',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'When distributing as open-source, MIT code can be incorporated into GPL-2.0 (but entire work becomes GPL-2.0).',
        severity: 'MEDIUM',
      },
      {
        projectLicense: 'MIT',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'When distributing as open-source, MIT code can be incorporated into GPL-3.0 (but entire work becomes GPL-3.0).',
        severity: 'MEDIUM',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'Apache-2.0 can be incorporated into GPL-3.0 open-source projects.',
        severity: 'MEDIUM',
      },
      {
        projectLicense: 'BSD-3-Clause',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'BSD-3-Clause can be incorporated into GPL-3.0 open-source projects.',
        severity: 'MEDIUM',
      }
    );

    // === SaaS distribution models ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'saas',
        compatible: true,
        reason: 'GPL-3.0 does not require source disclosure for SaaS (no distribution occurs). Only AGPL has SaaS requirements.',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'static',
        distributionModel: 'saas',
        compatible: true,
        reason: 'GPL-3.0 does not require source disclosure for SaaS (no distribution occurs).',
        severity: 'LOW',
      },
      {
        projectLicense: 'MIT',
        dependencyLicense: 'LGPL-2.1',
        linkingModel: 'static',
        distributionModel: 'saas',
        compatible: true,
        reason: 'LGPL-2.1 does not trigger for SaaS (no distribution occurs).',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'AGPL-3.0',
        linkingModel: 'static',
        distributionModel: 'saas',
        compatible: false,
        reason: 'AGPL-3.0 requires source disclosure for SaaS applications, even without distribution.',
        severity: 'CRITICAL',
      }
    );

    // === Dynamic linking variations ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'GPL-2.0',
        linkingModel: 'dynamic',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'GPL-2.0 copyleft applies to dynamically linked works when distributed together.',
        severity: 'CRITICAL',
      },
      {
        projectLicense: 'MIT',
        dependencyLicense: 'GPL-3.0',
        linkingModel: 'dynamic',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'GPL-3.0 copyleft applies to dynamically linked works when distributed together.',
        severity: 'CRITICAL',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'LGPL-2.1',
        linkingModel: 'dynamic',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'LGPL-2.1 explicitly allows dynamic linking with proprietary code.',
        severity: 'LOW',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'LGPL-3.0',
        linkingModel: 'dynamic',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'LGPL-3.0 explicitly allows dynamic linking with proprietary code.',
        severity: 'LOW',
      },
      {
        projectLicense: 'BSD-3-Clause',
        dependencyLicense: 'LGPL-2.1',
        linkingModel: 'dynamic',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'LGPL-2.1 allows dynamic linking with BSD-3-Clause proprietary projects.',
        severity: 'LOW',
      }
    );

    // === LGPL variations ===
    
    rules.push(
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'LGPL-2.1',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'LGPL-2.1 with static linking requires providing object files for re-linking.',
        severity: 'HIGH',
      },
      {
        projectLicense: 'Apache-2.0',
        dependencyLicense: 'LGPL-3.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'LGPL-3.0 with static linking has copyleft requirements.',
        severity: 'HIGH',
      },
      {
        projectLicense: 'MIT',
        dependencyLicense: 'LGPL-3.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'LGPL-3.0 with static linking requires object files and has anti-tivoization clause.',
        severity: 'HIGH',
      }
    );

    // === CC licenses (Creative Commons - for non-code assets) ===
    
    rules.push(
      {
        projectLicense: 'MIT',
        dependencyLicense: 'CC-BY-4.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: true,
        reason: 'CC-BY-4.0 requires attribution only. Compatible with proprietary projects.',
        severity: 'LOW',
      },
      {
        projectLicense: 'MIT',
        dependencyLicense: 'CC-BY-SA-4.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'CC-BY-SA-4.0 (ShareAlike) requires derivative works to use the same license.',
        severity: 'HIGH',
      },
      {
        projectLicense: 'MIT',
        dependencyLicense: 'CC-BY-NC-4.0',
        linkingModel: 'static',
        distributionModel: 'proprietary',
        compatible: false,
        reason: 'CC-BY-NC-4.0 prohibits commercial use.',
        severity: 'CRITICAL',
      }
    );

    // === Special cases ===
    
    rules.push(
      {
        projectLicense: 'GPL-2.0-only',
        dependencyLicense: 'GPL-3.0-only',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: false,
        reason: 'GPL-2.0-only is incompatible with GPL-3.0-only. Cannot combine without "or later" clause.',
        severity: 'CRITICAL',
      },
      {
        projectLicense: 'GPL-2.0-or-later',
        dependencyLicense: 'GPL-3.0-only',
        linkingModel: 'static',
        distributionModel: 'open-source',
        compatible: true,
        reason: 'GPL-2.0-or-later can upgrade to GPL-3.0, making combination possible.',
        severity: 'LOW',
      }
    );

    return rules;
  }

  /**
   * Get all rules (for testing/debugging)
   */
  getAllRules(): CompatibilityRule[] {
    return this.rules;
  }
}

export const compatibilityMatrix = new CompatibilityMatrix();

