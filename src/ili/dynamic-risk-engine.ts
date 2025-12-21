import type { LinkingModel, DynamicSeverity, ProjectContext } from './types';

/**
 * Dynamic Risk Model - Context-aware severity calculation
 */
export class DynamicRiskEngine {
  /**
   * Public instance API expected by tests: calculateSeverity(projectLicense, dependencyLicense, context)
   */
  calculateSeverity(
    projectLicense: string | undefined,
    dependencyLicense: string,
    context: ProjectContext
  ): DynamicSeverity {
    const effectiveContext: ProjectContext = {
      ...context,
      projectLicense: projectLicense ?? context.projectLicense,
    };

    switch (effectiveContext.intent) {
      case 'proprietary':
        return DynamicRiskEngine.proprietarySeverity(
          dependencyLicense,
          effectiveContext.linkingModel,
          effectiveContext.projectLicense
        );
      case 'open-source':
        return DynamicRiskEngine.openSourceSeverity(
          dependencyLicense,
          effectiveContext.projectLicense
        );
      case 'undecided':
      default:
        return DynamicRiskEngine.undecidedSeverity(
          dependencyLicense,
          effectiveContext.linkingModel
        );
    }
  }

  /**
   * Proprietary projects: Copyleft is a blocker
   */
  private static proprietarySeverity(
    depLicense: string,
    linkingModel: LinkingModel,
    _projectLicense?: string
  ): DynamicSeverity {
    // GPL/AGPL → Critical
    if (this.isStrongCopyleft(depLicense)) {
      return {
        level: 'critical',
        reason: depLicense.includes('AGPL') ? 'network copyleft risk' : 'Strong copyleft license incompatible with proprietary distribution',
        obligation: 'Requires making your entire codebase open-source under the same license',
        contextualExplanation: `${depLicense} requires that any software linking to it must also be ${depLicense}. This conflicts with your proprietary intent.`,
        appliesWhen: ['static linking', 'dynamic linking', 'modification of the dependency'],
        intentImpact: 'Because your project is proprietary, this dependency creates a legal incompatibility.',
      };
    }

    // MPL → Medium
    if (depLicense.includes('MPL')) {
      return {
        level: 'medium',
        reason: 'File-level copyleft requires source disclosure for modified files only',
        obligation: 'modifications to MPL files must be disclosed; your code remains proprietary',
        contextualExplanation: `${depLicense} is file-scoped copyleft. Only modified MPL files need to be open-sourced.`,
        appliesWhen: ['if you modify the dependency'],
        intentImpact: 'Compatible with proprietary projects as long as you don\'t modify the library.',
      };
    }

    // LGPL static → High
    if (this.isWeakCopyleft(depLicense) && linkingModel === 'static') {
      return {
        level: 'high',
        reason: 'Weak copyleft with static linking creates redistribution obligations',
        obligation: 'Requires providing object files or source code for relinking',
        contextualExplanation: `${depLicense} allows proprietary use but requires that users can relink with modified versions. Static linking makes this impractical.`,
        appliesWhen: ['static linking'],
        intentImpact: 'Your proprietary project can use this, but static linking creates practical compliance challenges.',
      };
    }

    // LGPL dynamic → Medium
    if (this.isWeakCopyleft(depLicense) && (linkingModel === 'dynamic' || linkingModel === 'runtime')) {
      return {
        level: 'medium',
        reason: 'Weak copyleft with dynamic linking is compatible but has obligations',
        obligation: 'Must allow users to replace the library with modified versions',
        contextualExplanation: `${depLicense} allows proprietary use when dynamically linked. You must ensure users can swap the library.`,
        appliesWhen: ['dynamic linking'],
        intentImpact: 'Compatible with your proprietary intent, but has specific distribution requirements.',
      };
    }

    // Permissive → Safe
    if (this.isPermissive(depLicense)) {
      return {
        level: 'safe',
        reason: 'Permissive license fully compatible with proprietary use',
        obligation: 'Include copyright notice and license text in distributions',
        contextualExplanation: `${depLicense} allows unrestricted commercial and proprietary use.`,
        appliesWhen: ['always'],
        intentImpact: 'No restrictions on your proprietary intent.',
      };
    }

    // Unknown → Low
    return {
      level: 'medium',
      reason: 'unknown license; manual review recommended',
      obligation: 'Review license terms manually',
      contextualExplanation: `${depLicense} is not in our database. Check if it allows proprietary use.`,
      appliesWhen: ['unknown'],
      intentImpact: 'Cannot automatically assess compatibility.',
    };
  }

  /**
   * Open-source projects: Copyleft is generally safe
   */
  private static openSourceSeverity(
    depLicense: string,
    projectLicense?: string
  ): DynamicSeverity {
    if (!projectLicense) {
      return {
        level: 'low',
        reason: 'No project license declared yet',
        obligation: 'Declare a project license to assess compatibility',
        contextualExplanation: 'Without knowing your project license, we cannot determine if there are conflicts.',
        appliesWhen: ['no project license'],
        intentImpact: 'Add a LICENSE file to enable accurate analysis.',
      };
    }

    // Same license → Safe
    if (this.normalizeLicense(depLicense) === this.normalizeLicense(projectLicense)) {
      return {
        level: 'safe',
        reason: 'same license compatibility',
        obligation: 'Continue using the same license for your project',
        contextualExplanation: `Both your project and this dependency use ${projectLicense}.`,
        appliesWhen: ['always'],
        intentImpact: 'No conflict. This is the intended use case for copyleft licenses.',
      };
    }

    // Apache vs GPL has patent clause friction
    if (projectLicense.includes('GPL') && depLicense.includes('Apache-2.0')) {
      return {
        level: 'high',
        reason: 'incompatible patent clause between GPL and Apache-2.0',
        obligation: 'Avoid mixing GPL project with Apache-2.0 dependency unless clarified by legal review',
        contextualExplanation: 'Apache-2.0 patent license terms conflict with GPL reciprocity expectations.',
        appliesWhen: ['distribution'],
        intentImpact: 'May require replacing the dependency or changing license.',
      };
    }

    // GPL inside GPL-compatible → Safe
    if (this.isGPLCompatible(depLicense, projectLicense)) {
      return {
        level: 'safe',
        reason: 'Dependency license is compatible with your project license',
        obligation: 'Continue distributing under your project license',
        contextualExplanation: `${depLicense} is compatible with ${projectLicense}.`,
        appliesWhen: ['always'],
        intentImpact: 'No restrictions for open-source projects.',
      };
    }

    // Incompatible copyleft → High
    if (this.isStrongCopyleft(depLicense) && !this.isGPLCompatible(depLicense, projectLicense)) {
      return {
        level: 'high',
        reason: 'copyleft contamination incompatible with project license',
        obligation: `Must change project license to ${depLicense} or remove dependency`,
        contextualExplanation: `${depLicense} requires your entire project to be ${depLicense}, but your project is ${projectLicense}.`,
        appliesWhen: ['distribution'],
        intentImpact: 'Your open-source intent is fine, but these specific licenses conflict.',
      };
    }

    // Permissive → Safe
    if (this.isPermissive(depLicense)) {
      return {
        level: 'safe',
        reason: 'Permissive license compatible with all open-source licenses',
        obligation: 'Include attribution in your project',
        contextualExplanation: `${depLicense} allows use in any open-source project.`,
        appliesWhen: ['always'],
        intentImpact: 'No restrictions.',
      };
    }

    return {
      level: 'medium',
      reason: 'License compatibility unclear',
      obligation: 'Review licenses manually for compatibility',
      contextualExplanation: `Check if ${depLicense} is compatible with ${projectLicense}.`,
      appliesWhen: ['distribution'],
      intentImpact: 'May require legal review.',
    };
  }

  /**
  * Undecided projects: highlight flexibility risks
   */
  private static undecidedSeverity(
    depLicense: string,
    _linkingModel: LinkingModel
  ): DynamicSeverity {
    if (this.isStrongCopyleft(depLicense)) {
      return {
        level: 'medium',
        reason: 'future flexibility risk from copyleft',
        obligation: 'If you use this dependency, your project will likely need to be open-source',
        contextualExplanation: `${depLicense} is a strong copyleft license. It reduces future flexibility; if you later want to make your project proprietary or use a permissive license, you'll need to remove this dependency.`,
        appliesWhen: ['if you want proprietary or permissive licensing later'],
        intentImpact: 'Using this now doesn\'t lock you in, but be aware of the implications.',
      };
    }

    if (this.isWeakCopyleft(depLicense)) {
      return {
        level: 'low',
        reason: 'Weak copyleft has some obligations but maintains flexibility',
        obligation: 'Allows proprietary use with dynamic linking',
        contextualExplanation: `${depLicense} allows most licensing options if you use dynamic linking.`,
        appliesWhen: ['static linking creates obligations'],
        intentImpact: 'Maintains flexibility for most future licensing choices.',
      };
    }

    if (this.isPermissive(depLicense)) {
      return {
        level: 'safe',
        reason: 'Permissive license maintains full licensing flexibility',
        obligation: 'Include attribution',
        contextualExplanation: `${depLicense} allows any future licensing choice.`,
        appliesWhen: ['always'],
        intentImpact: 'No impact on future licensing decisions.',
      };
    }

    return {
      level: 'low',
      reason: 'License impact on future flexibility unclear',
      obligation: 'Review before committing to a project license',
      contextualExplanation: `${depLicense} should be reviewed before you choose a project license.`,
      appliesWhen: ['when deciding project license'],
      intentImpact: 'May affect licensing options.',
    };
  }

  // Helper methods
  private static isStrongCopyleft(license: string): boolean {
    if (license.includes('LGPL')) return false;
    return ['AGPL', 'GPL-3.0', 'GPL-2.0', 'GPL'].some((l) => license.includes(l));
  }

  private static isWeakCopyleft(license: string): boolean {
    return ['LGPL', 'MPL', 'EPL'].some((l) => license.includes(l));
  }

  private static isPermissive(license: string): boolean {
    return ['MIT', 'Apache', 'BSD', 'ISC', 'Unlicense', 'CC0'].some((l) => license.includes(l));
  }

  private static normalizeLicense(license: string): string {
    return license.replace(/-only|-or-later/gi, '').trim();
  }

  private static isGPLCompatible(depLicense: string, projectLicense: string): boolean {
    const dep = this.normalizeLicense(depLicense);
    const proj = this.normalizeLicense(projectLicense);

    // GPL-3.0 is compatible with GPL-3.0, AGPL-3.0
    if (proj.includes('GPL-3.0')) {
      return dep.includes('GPL-3.0') || dep.includes('AGPL-3.0') || dep.includes('LGPL-3.0');
    }

    // GPL-2.0 is compatible with GPL-2.0, LGPL-2.1
    if (proj.includes('GPL-2.0')) {
      return dep.includes('GPL-2.0') || dep.includes('LGPL-2.1');
    }

    // AGPL is compatible with AGPL, GPL
    if (proj.includes('AGPL')) {
      return dep.includes('GPL') || dep.includes('AGPL');
    }

    return false;
  }
}

