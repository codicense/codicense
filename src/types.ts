/**
 * Core type definitions for CODICENSE license conflict engine
 */

export type LicenseCategory = 'permissive' | 'weak-copyleft' | 'strong-copyleft' | 'proprietary';

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type DistributionModel = 'proprietary' | 'saas' | 'cli' | 'library' | 'open-source' | 'internal-only';

export type LinkingModel = 'static' | 'dynamic' | 'runtime' | 'microservice';

export interface License {
  id: string;
  name: string;
  category: LicenseCategory;
  osiApproved: boolean;
  fsfLibre: boolean;
  text: string;
  obligations: string[];
  permissions: string[];
  limitations: string[];
}

export interface DependencyNode {
  name: string;
  version: string;
  license: string | string[];
  depth: number;
  path: string[];
  children: DependencyNode[];
  resolved?: string;
  dev?: boolean;
}

export interface ProjectConfig {
  projectLicense: string;
  distributionModel: DistributionModel;
  linkingModel: LinkingModel;
  policy?: PolicyConfig;
}

export interface PolicyConfig {
  allowedLicenses?: string[];
  forbiddenLicenses?: string[];
  failOn?: Severity[];
  strictMode?: boolean;             // When true: no heuristics, only explicit rules
  autoFix?: {
    enabled: boolean;
    createPr: boolean;
    runTests: boolean;
  };
}

export interface CompatibilityRule {
  id?: string;                      // Rule ID for traceability (e.g., "GPL3-MIT-STATIC-001")
  projectLicense: string;
  dependencyLicense: string;
  linkingModel: LinkingModel;
  distributionModel: DistributionModel;
  compatible: boolean;
  reason: string;
  severity: Severity;
  spdxRef?: string;                 // SPDX section reference (e.g., "GPL-3.0 Section 5")
  legalBasis?: string;              // Legal basis for the rule
  isHeuristic?: boolean;            // Whether this rule is heuristic-based
}

export interface ConflictFix {
  type: 'replace' | 'architectural' | 'relicense';
  description: string;
  action?: {
    remove?: string;
    add?: string;
    compatibility?: string;
    communityValidation?: {
      upvotes: number;
      testedBy: number;
      successRate: number;
    };
  };
  steps?: string[];
  automated: boolean;
  prAvailable?: boolean;
}

export interface Conflict {
  id: string;
  severity: Severity;
  dependency: {
    name: string;
    version: string;
    license: string;
    path: string[];
  };
  reason: string;
  legalContext?: string;
  contaminationPath: string[];
  fixes: ConflictFix[];
  // Traceability fields
  triggeredRule?: {
    id: string;
    spdxRef?: string;
    legalBasis?: string;
    isHeuristic: boolean;
  };
}

export interface ScanResult {
  scanId: string;
  timestamp: string;
  repository?: string;
  projectLicense: string;
  riskScore: number;
  summary: {
    totalDependencies: number;
    conflicts: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  conflicts: Conflict[];
  complianceObligations?: ComplianceObligation[];
}

export interface ComplianceObligation {
  license: string;
  dependenciesCount: number;
  obligations: string[];
  satisfied: boolean;
  missingFiles?: string[];
}

export interface DependencyGraph {
  root: DependencyNode;
  allNodes: Map<string, DependencyNode>;
  conflicts: Conflict[];
}

