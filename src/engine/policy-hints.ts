/**
 * Policy Hints Engine
 * 
 * Provides contextual suggestions without enforcing policies.
 * Prepares users psychologically for enterprise features without upselling.
 */

import type { ProjectContext, DeveloperIntent, DistributionModel } from '../ili/types';

export interface PolicyHint {
  type: 'suggestion' | 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
  learnMore?: string;
}

export interface PolicyAnalysis {
  detectedBehavior: string;
  hints: PolicyHint[];
  recommendedPolicy: RecommendedPolicy;
}

export interface RecommendedPolicy {
  intent: DeveloperIntent;
  distribution: DistributionModel;
  blockedLicenses: string[];
  reason: string;
}

/**
 * Common project archetypes and their typical policies
 */
const PROJECT_ARCHETYPES: Record<string, RecommendedPolicy> = {
  'saas-proprietary': {
    intent: 'proprietary',
    distribution: 'saas',
    blockedLicenses: ['AGPL-3.0', 'SSPL-1.0'],
    reason: 'SaaS products typically block AGPL due to network copyleft requirements',
  },
  'commercial-library': {
    intent: 'proprietary',
    distribution: 'library',
    blockedLicenses: ['GPL-3.0', 'GPL-2.0', 'AGPL-3.0', 'LGPL-3.0'],
    reason: 'Commercial libraries avoid copyleft to give users maximum flexibility',
  },
  'cli-tool': {
    intent: 'proprietary',
    distribution: 'cli',
    blockedLicenses: ['AGPL-3.0'],
    reason: 'CLI tools distributed as binaries may be affected by strong copyleft',
  },
  'open-source-permissive': {
    intent: 'open-source',
    distribution: 'library',
    blockedLicenses: [],
    reason: 'Open source projects under permissive licenses can use most dependencies',
  },
  'open-source-copyleft': {
    intent: 'open-source',
    distribution: 'library',
    blockedLicenses: ['proprietary'],
    reason: 'GPL projects should avoid proprietary dependencies',
  },
  'internal-tool': {
    intent: 'proprietary',
    distribution: 'internal-only',
    blockedLicenses: [],
    reason: 'Internal tools not distributed externally have fewer license constraints',
  },
};

/**
 * Policy Hints Engine
 */
export class PolicyHintsEngine {
  /**
   * Analyze project and provide policy hints
   */
  static analyze(context: ProjectContext, conflicts: number = 0): PolicyAnalysis {
    const archetype = this.detectArchetype(context);
    const recommendedPolicy = PROJECT_ARCHETYPES[archetype] || PROJECT_ARCHETYPES['cli-tool'];
    const hints = this.generateHints(context, archetype, conflicts);
    
    return {
      detectedBehavior: this.describeDetectedBehavior(context),
      hints,
      recommendedPolicy,
    };
  }
  
  /**
   * Detect project archetype based on context
   */
  private static detectArchetype(context: ProjectContext): string {
    const { intent, distributionModel } = context;
    
    if (distributionModel === 'saas' && intent === 'proprietary') {
      return 'saas-proprietary';
    }
    
    if (distributionModel === 'library') {
      if (intent === 'proprietary') return 'commercial-library';
      if (intent === 'open-source') {
        const license = context.projectLicense?.toUpperCase() || '';
        if (license.includes('GPL')) return 'open-source-copyleft';
        return 'open-source-permissive';
      }
    }
    
    if (distributionModel === 'cli') {
      return 'cli-tool';
    }
    
    if (distributionModel === 'internal-only') {
      return 'internal-tool';
    }
    
    return 'cli-tool'; // Default
  }
  
  /**
   * Describe detected behavior for user understanding
   */
  private static describeDetectedBehavior(context: ProjectContext): string {
    const parts: string[] = [];
    
    // Intent
    if (context.intent === 'proprietary') {
      parts.push('proprietary/commercial');
    } else if (context.intent === 'open-source') {
      parts.push('open-source');
    } else {
      parts.push('undecided');
    }
    
    // Distribution
    switch (context.distributionModel) {
      case 'saas':
        parts.push('SaaS/hosted service');
        break;
      case 'cli':
        parts.push('CLI/desktop application');
        break;
      case 'library':
        parts.push('library/package');
        break;
      case 'internal-only':
        parts.push('internal tool');
        break;
      default:
        parts.push(context.distributionModel);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Generate contextual hints
   */
  private static generateHints(
    context: ProjectContext,
    archetype: string,
    conflicts: number
  ): PolicyHint[] {
    const hints: PolicyHint[] = [];
    const recommended = PROJECT_ARCHETYPES[archetype];
    
    // Hint: AGPL for SaaS
    if (context.distributionModel === 'saas' && context.intent === 'proprietary') {
      hints.push({
        type: 'suggestion',
        title: 'SaaS License Consideration',
        message: 'Your project behaves like a SaaS. Most SaaS teams block AGPL due to network copyleft requirements that mandate source disclosure.',
        action: 'Consider adding AGPL-3.0 to your blocked licenses',
      });
    }
    
    // Hint: Internal tools have fewer constraints
    if (context.distributionModel === 'internal-only' && conflicts > 0) {
      hints.push({
        type: 'info',
        title: 'Internal Tool Flexibility',
        message: 'Since this is an internal tool (not distributed externally), many copyleft licenses like GPL have reduced impact. Severity levels may be lower than for distributed software.',
        action: 'Review if current conflicts apply to internal-only usage',
      });
    }
    
    // Hint: Static linking concerns
    if (context.linkingModel === 'static' && recommended?.blockedLicenses.includes('LGPL-3.0')) {
      hints.push({
        type: 'warning',
        title: 'Static Linking Consideration',
        message: 'Static linking with LGPL libraries requires users to be able to relink with modified library versions. This may affect your distribution strategy.',
        action: 'Consider dynamic linking or reviewing LGPL dependencies',
      });
    }
    
    // Hint: Undecided intent
    if (context.intent === 'undecided') {
      hints.push({
        type: 'info',
        title: 'Intent Clarification',
        message: 'Your project intent is undecided. Clarifying whether you plan to be open-source or proprietary can significantly affect severity assessments.',
        action: 'Run `codicense init` to set your project intent',
      });
    }
    
    // Hint: Future flexibility
    if (context.futureFlexibility && context.intent === 'open-source') {
      hints.push({
        type: 'suggestion',
        title: 'Future Flexibility',
        message: 'You indicated wanting future flexibility. Choosing a permissive license (MIT, Apache-2.0) keeps more options open for potential future licensing changes.',
      });
    }
    
    // Hint: No conflicts
    if (conflicts === 0) {
      hints.push({
        type: 'info',
        title: 'Clean Slate',
        message: 'No license conflicts detected. This is a great time to document your license policy to prevent future issues.',
        action: 'Consider creating a LEGAL.md or LICENSE-POLICY.md',
      });
    }
    
    return hints;
  }
  
  /**
   * Generate intent override question
   */
  static generateIntentOverride(context: ProjectContext): string {
    const detected = this.describeDetectedBehavior(context);
    
    return [
      `Detected intent: ${detected}`,
      'Is this correct? (y/n)',
      '',
      this.getOverrideTip(context),
    ].join('\n');
  }
  
  /**
   * Get tip for intent override
   */
  private static getOverrideTip(context: ProjectContext): string {
    if (context.distributionModel === 'saas' && context.intent === 'proprietary') {
      return 'Tip: If this is an internal tool only, severity would drop from HIGH → LOW for most copyleft licenses.';
    }
    
    if (context.intent === 'undecided') {
      return 'Tip: Setting a clear intent (proprietary or open-source) improves severity accuracy.';
    }
    
    if (context.distributionModel === 'library' && context.intent === 'open-source') {
      return 'Tip: For open-source libraries, GPL dependencies are often acceptable if you use a compatible license.';
    }
    
    return 'Tip: Your project context affects how license risks are evaluated.';
  }
  
  /**
   * Format policy analysis for display
   */
  static format(analysis: PolicyAnalysis): string {
    const lines: string[] = [];
    
    lines.push(`🎯 Detected Project Type: ${analysis.detectedBehavior}`);
    lines.push('');
    
    if (analysis.hints.length > 0) {
      lines.push('💡 Policy Hints:');
      lines.push('');
      
      for (const hint of analysis.hints) {
        const icon = hint.type === 'warning' ? '⚠️' :
                     hint.type === 'suggestion' ? '💡' : 'ℹ️';
        
        lines.push(`${icon} ${hint.title}`);
        lines.push(`   ${hint.message}`);
        if (hint.action) {
          lines.push(`   → ${hint.action}`);
        }
        lines.push('');
      }
    }
    
    if (analysis.recommendedPolicy.blockedLicenses.length > 0) {
      lines.push('📋 Recommended Blocked Licenses:');
      for (const license of analysis.recommendedPolicy.blockedLicenses) {
        lines.push(`   • ${license}`);
      }
      lines.push(`   Reason: ${analysis.recommendedPolicy.reason}`);
    }
    
    return lines.join('\n');
  }
}
