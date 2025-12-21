/**
 * Intent-Aware License Intelligence (ILI) Engine
 * 
 * Understands developer intent before making severity decisions.
 * Core component of Codicense license analysis.
 */

export type DeveloperIntent = 'open-source' | 'proprietary' | 'undecided';
export type DistributionModel = 'proprietary' | 'saas' | 'cli' | 'library' | 'open-source' | 'internal-only';
export type LinkingModel = 'static' | 'dynamic' | 'runtime';

export interface ProjectContext {
  projectLicense?: string;
  intent: DeveloperIntent;
  distributionModel: DistributionModel;
  linkingModel: LinkingModel;
  futureFlexibility: boolean;
  detectedFrom: 'config' | 'auto-detect' | 'interactive';
}

export interface IntentConfig {
  version: string;
  projectContext: ProjectContext;
  guidedMode: boolean;
  educationalMode: boolean;
  createdAt: string;
  lastUpdated: string;
}

export interface DynamicSeverity {
  level: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  obligation: string;
  contextualExplanation: string;
  appliesWhen: string[];
  intentImpact: string;
}

export interface FixSuggestion {
  effort: 'low' | 'medium' | 'high';
  strategy: 'replace' | 'isolate' | 'dual-license' | 'remove' | 'boundary-refactor' | 'upgrade';
  description: string;
  implementation: string;
  tradeoffs: string[];
  estimatedTime?: string;
}

export interface ConflictPath {
  path: string[];
  licenses: string[];
  ruleTriggered: string;
  humanExplanation: string;
  obligationsInConflict: string[];
  obligations?: string[];
}

export interface IntentAwareResult {
  compatible: boolean;
  severity: DynamicSeverity;
  conflictPath?: ConflictPath;
  fixes: FixSuggestion[];
  educationalNote?: string;
}

