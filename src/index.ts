/**
 * CODICENSE - Intent-Aware License Intelligence
 * Main programmatic API entry point
 */

export * from './types';
export { LicenseDatabase, licenseDb } from './license-db';
export { ConflictDetector } from './engine/conflict-detector';
export { CompatibilityMatrix } from './engine/compatibility-matrix';
export { LockfileParser } from './parsers/lockfile-parser';
export { WorkspaceDetector } from './parsers/workspace-detector';
export { OutputFormatter } from './visualizer/output-formatter';
export { ILIScanner } from './engine/ili-scanner';

// Public exports
export { DiffEngine } from './engine/diff-engine';
export { ConfidenceDetector } from './engine/confidence-detector';
export { HotspotsAnalyzer } from './engine/hotspots-analyzer';
export { UpgradeEngine } from './engine/upgrade-engine';
export { ObligationsExplainer } from './engine/obligations-db';
export { ScanTelemetryTracker, getTelemetryTracker, resetTelemetry } from './engine/telemetry';
export { ScanHistory } from './engine/history';
export { BadgeGenerator } from './engine/badge-generator';
export { IgnoreHandler } from './engine/ignore-handler';
export { PolicyHintsEngine } from './engine/policy-hints';
export { CausalImpactEngine, causalImpactEngine } from './engine/causal-impact-engine.js';
export { LicenseFixEngine, licenseFixEngine } from './licensefix/index.js';

// Error classes
export { CodicenseError, ErrorCodes } from './errors';
