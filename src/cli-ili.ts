/**
 * CLI Commands - ILI Integration
 * 
 * CLI commands for intent-aware license analysis.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'readline';
import type { DeveloperIntent, DistributionModel, LinkingModel, ProjectContext, DynamicSeverity } from './ili/types';
import { ILIScanner, type ILIScanResult, type EnhancedConflict } from './engine/ili-scanner';
import { LockfileParser } from './parsers/lockfile-parser';
import { ASCIIVisualizer } from './visualizer/ascii-visualizer';
import { PatchGenerator } from './fix/patch-generator';
import { PRGenerator } from './fix/pr-generator';
import { OutputFormatter } from './visualizer/output-formatter';
import type { DependencyNode } from './types';
import * as fs from 'fs';
import * as path from 'path';

// New feature imports
import { DiffEngine, type StoredDependency, type StoredScan } from './engine/diff-engine';
import { ConfidenceDetector, type LicenseSource } from './engine/confidence-detector';
import { HotspotsAnalyzer } from './engine/hotspots-analyzer';
import { UpgradeEngine } from './engine/upgrade-engine';
import { ObligationsExplainer } from './engine/obligations-db';
import { ScanTelemetryTracker } from './engine/telemetry';
import { ScanHistory, type HistoryEntry } from './engine/history';
import { BadgeGenerator } from './engine/badge-generator';
import { IgnoreHandler } from './engine/ignore-handler';
import { PolicyHintsEngine } from './engine/policy-hints';
import { causalImpactEngine } from './engine/causal-impact-engine.js';
import { licenseFixEngine } from './licensefix/index.js';

/**
 * codicense init - Interactive intent detection
 */
export function createInitCommand(_colorEnabled: boolean, _silentMode: boolean): Command {
  return new Command('init')
    .description('Initialize CODICENSE with intent-aware configuration')
    .option('--auto', 'Auto-detect intent without prompting')
    .option('--strict', 'Enable strict mode (no heuristics)')
    .action(async (options) => {
      const projectPath = process.cwd();
      const scanner = new ILIScanner(projectPath);

      // Create default .codicenseignore if it doesn't exist
      if (!IgnoreHandler.exists(projectPath)) {
        IgnoreHandler.createDefault(projectPath);
        console.log(chalk.dim('Created .codicenseignore with default patterns'));
      }

      if (options.auto) {
        // Auto-detect with intent override suggestion
        const context = await scanner.loadContext(projectPath);
        
        // Show detected intent and offer override
        console.log(chalk.cyan('\n🎯 Auto-detected Configuration\n'));
        const policyAnalysis = PolicyHintsEngine.analyze(context);
        console.log(PolicyHintsEngine.generateIntentOverride(context));
        
        await scanner.saveContext(context);
        
        console.log(chalk.green('\nConfiguration created'));
        console.log(chalk.dim(`Intent: ${context.intent}`));
        console.log(chalk.dim(`License: ${context.projectLicense || 'UNKNOWN'}`));
        
        // Show policy hints
        if (policyAnalysis.hints.length > 0) {
          console.log(chalk.dim('\n' + PolicyHintsEngine.format(policyAnalysis)));
        }
        return;
      }

      // Interactive mode
      console.log(chalk.cyan('\n🎯 CODICENSE Intent-Aware Setup\n'));
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const question = (prompt: string): Promise<string> => {
        return new Promise((resolve) => {
          rl.question(prompt, resolve);
        });
      };

      try {
        // Detect project license
        let projectLicense: string | undefined;
        const licensePath = `${projectPath}/LICENSE`;
        if (fs.existsSync(licensePath)) {
          const content = fs.readFileSync(licensePath, 'utf8');
          if (content.includes('GPL')) projectLicense = 'GPL-3.0';
          else if (content.includes('MIT')) projectLicense = 'MIT';
          else if (content.includes('Apache')) projectLicense = 'Apache-2.0';
        }

        if (projectLicense) {
          console.log(chalk.dim(`Detected license: ${projectLicense}\n`));
        }

        // Ask about intent
        console.log(chalk.yellow('What is your project intent?\n'));
        console.log('1) Open-source - Building for the community');
        console.log('2) Proprietary - Commercial/closed-source product');
        console.log('3) Undecided - Still exploring options\n');
        
        const intentChoice = await question('Choice (1-3): ');
        const intentMap: Record<string, DeveloperIntent> = {
          '1': 'open-source',
          '2': 'proprietary',
          '3': 'undecided',
        };
        const intent = intentMap[intentChoice.trim()] || 'undecided';

        // Ask about distribution
        console.log(chalk.yellow('\nHow will you distribute this project?\n'));
        console.log('1) SaaS - Hosted service (users never download)');
        console.log('2) CLI/Binary - Downloadable executable');
        console.log('3) Library/NPM - Code others import');
        console.log('4) Internal - Private use only\n');
        
        const distChoice = await question('Choice (1-4): ');
        const distMap: Record<string, DistributionModel> = {
          '1': 'saas',
          '2': 'cli',
          '3': 'library',
          '4': 'internal-only',
        };
        const distributionModel = distMap[distChoice.trim()] || 'cli';

        // Ask about linking
        console.log(chalk.yellow('\nHow do dependencies link to your code?\n'));
        console.log('1) Static - Bundled into binary/output');
        console.log('2) Dynamic - Loaded at runtime');
        console.log('3) Runtime - Separate processes\n');
        
        const linkChoice = await question('Choice (1-3): ');
        const linkMap: Record<string, LinkingModel> = {
          '1': 'static',
          '2': 'dynamic',
          '3': 'runtime',
        };
        const linkingModel = linkMap[linkChoice.trim()] || 'static';

        // Ask about future flexibility
        console.log(chalk.yellow('\nDo you want flexibility to change your license later?\n'));
        const flexAnswer = await question('(y/n): ');
        const futureFlexibility = flexAnswer.toLowerCase().startsWith('y');

        rl.close();

        // Save config
        const context: ProjectContext = {
          projectLicense,
          intent,
          distributionModel,
          linkingModel,
          futureFlexibility,
          detectedFrom: 'interactive',
        };

        await scanner.saveContext(context);

          console.log(chalk.green('\nConfiguration saved to .codicense/config.json'));
        
        // Show policy hints based on selections
        const policyAnalysis = PolicyHintsEngine.analyze(context);
        if (policyAnalysis.hints.length > 0) {
            console.log(chalk.cyan('\nPolicy hints:\n'));
          console.log(PolicyHintsEngine.format(policyAnalysis));
        }
        
          console.log(chalk.dim('\nRun `codicense scan` to analyze your dependencies'));

      } catch (error) {
        rl.close();
        throw error;
      }
    });
}

/**
 * codicense scan - ILI-powered scanning with all features
 */
export function createScanCommand(colorEnabled: boolean, silentMode: boolean): Command {
  return new Command('scan')
    .description('Scan project dependencies and report license conflicts')
    .option('--json', 'Output results as JSON')
    .option('--format <type>', 'Output format: text, json, markdown, table, sbom, summary')
    .option('--diff [ref]', 'Compare with previous scan or git ref (e.g., HEAD~1)')
    .option('--hotspots', 'Show risk hotspots analysis')
    .option('--confidence', 'Show license confidence scores')
    .option('--telemetry', 'Show scan timing breakdown')
    .option('--hints', 'Show policy hints')
    .action(async (options) => {
      const telemetry = new ScanTelemetryTracker();
      telemetry.start();
      
      const spinner = silentMode ? null : ora('Scanning dependency graph...').start();

      try {
        const projectPath = process.cwd();
        const scanner = new ILIScanner(projectPath);
        const history = new ScanHistory(projectPath);

        // Load context
        telemetry.startStep('parsing');
        if (spinner) spinner.text = 'Loading project context...';
        const context = await scanner.loadContext(projectPath);

        // Parse dependencies
        if (spinner) spinner.text = 'Parsing lockfile...';
        const dependencyTree = await LockfileParser.parse(projectPath);
        telemetry.endStep();

        // Run ILI scan
        telemetry.startStep('licenseResolution');
        if (spinner) spinner.text = 'Resolving licenses...';
        telemetry.endStep();
        
        telemetry.startStep('riskEngine');
        if (spinner) spinner.text = 'Analyzing license compatibility...';
        const result = await scanner.scan(dependencyTree, projectPath, context);
        telemetry.endStep();

        // Generate fixes with upgrade awareness
        telemetry.startStep('fixGeneration');
        if (spinner) spinner.text = 'Generating fix suggestions...';
        enhanceWithUpgrades(result);
        telemetry.endStep();

        if (spinner) spinner.stop();

        // Handle diff mode
        if (options.diff !== undefined) {
          const previousScan = history.getPreviousScan();
          if (previousScan) {
            const previousScanSnapshot: StoredScan = {
              scanId: previousScan.scanId,
              timestamp: previousScan.timestamp,
              commitSha: previousScan.commitSha,
              riskScore: previousScan.riskScore,
              dependencies: new Map<string, StoredDependency>(),
              conflicts: [],
            };

            const diffResult = DiffEngine.compare(previousScanSnapshot, result);
            console.log(chalk.cyan('\nDiff analysis\n'));
            console.log(DiffEngine.formatDiff(diffResult));
            console.log();
          } else {
            console.log(chalk.yellow('No previous scan found for comparison. Run scan again to enable diff mode.'));
          }
        }

        // Save to history
        const historyEntry: HistoryEntry = {
          scanId: result.scanId,
          timestamp: result.timestamp,
          riskScore: result.riskScore,
          conflictCount: result.enhancedConflicts.length,
          totalDependencies: result.summary.totalDependencies,
          summary: {
            critical: result.summary.critical,
            high: result.summary.high,
            medium: result.summary.medium,
            low: result.summary.low,
          },
        };
        history.addEntry(historyEntry);

        // Determine output format
        const format = options.format || (options.json ? 'json' : 'text');

        // Output results based on format
        switch (format) {
          case 'json':
            console.log(JSON.stringify(result, null, 2));
            break;
          
          case 'markdown': {
            const allDeps = collectAllDependencies(dependencyTree);
            const formattedResult = {
              projectContext: {
                intent: context.intent,
                license: context.projectLicense || 'MIT',
                distribution: context.distributionModel
              },
              summary: {
                totalDependencies: result.summary.totalDependencies,
                conflicts: result.enhancedConflicts.length,
                riskScore: result.riskScore
              },
              conflicts: result.enhancedConflicts,
              dependencies: allDeps
            };
            console.log(OutputFormatter.toMarkdown(formattedResult));
            break;
          }
          
          case 'table': {
            const allDeps = collectAllDependencies(dependencyTree);
            const formattedResult = {
              projectContext: {
                intent: context.intent,
                license: context.projectLicense || 'MIT',
                distribution: context.distributionModel
              },
              summary: {
                totalDependencies: result.summary.totalDependencies,
                conflicts: result.enhancedConflicts.length,
                riskScore: result.riskScore
              },
              conflicts: result.enhancedConflicts,
              dependencies: allDeps
            };
            console.log(OutputFormatter.toTable(formattedResult));
            break;
          }
          
          case 'sbom': {
            const projectName = path.basename(projectPath);
            const allDeps = collectAllDependencies(dependencyTree);
            const formattedResult = {
              projectContext: {
                intent: context.intent,
                license: context.projectLicense || 'MIT',
                distribution: context.distributionModel
              },
              summary: {
                totalDependencies: result.summary.totalDependencies,
                conflicts: result.enhancedConflicts.length,
                riskScore: result.riskScore
              },
              conflicts: result.enhancedConflicts,
              dependencies: allDeps
            };
            console.log(OutputFormatter.toSBOM(formattedResult, projectName));
            break;
          }
          
          case 'summary': {
            const allDeps = collectAllDependencies(dependencyTree);
            const formattedResult = {
              projectContext: {
                intent: context.intent,
                license: context.projectLicense || 'MIT',
                distribution: context.distributionModel
              },
              summary: {
                totalDependencies: result.summary.totalDependencies,
                conflicts: result.enhancedConflicts.length,
                riskScore: result.riskScore
              },
              conflicts: result.enhancedConflicts,
              dependencies: allDeps
            };
            console.log(OutputFormatter.toGitHubSummary(formattedResult));
            break;
          }
          
          case 'text':
          default:
            displayILIResult(result, colorEnabled, options.confidence || false);
            break;
        }

        // Show hotspots if requested
        if (options.hotspots) {
          console.log();
          const hotspotsResult = HotspotsAnalyzer.analyze(
            dependencyTree,
            result.enhancedConflicts,
            context.linkingModel
          );
          console.log(HotspotsAnalyzer.formatHotspots(hotspotsResult));
        }

        // Show policy hints if requested
        if (options.hints) {
          console.log();
          const policyAnalysis = PolicyHintsEngine.analyze(context, result.enhancedConflicts.length);
          console.log(PolicyHintsEngine.format(policyAnalysis));
        }

        // Show telemetry if requested
        if (options.telemetry) {
          const telemetryResult = telemetry.finish();
          console.log();
          console.log(chalk.dim(ScanTelemetryTracker.format(telemetryResult)));
        }

        // Exit with error code if conflicts found
        if (result.summary.critical > 0 || result.summary.high > 0) {
          process.exit(1);
        }
      } catch (error) {
        if (spinner) spinner.stop();
        console.error(chalk.red(`Error: ${(error as Error).message}`));
        process.exit(1);
      }
    });
}

/**
 * codicense explain - Deep-dive into conflict with obligations
 */
export function createExplainCommand(colorEnabled: boolean): Command {
  return new Command('explain')
    .description('Explain a specific license conflict or license')
    .argument('<conflict-id-or-package-or-license>', 'Conflict ID, package name, or license (e.g., GPL-3.0)')
    .option('--obligations', 'Show detailed license obligations')
    .action(async (target: string, _options: { obligations?: boolean }) => {
      const projectPath = process.cwd();
      
      // Check if it's a license identifier (e.g., GPL-3.0, MIT)
      const licensePattern = /^[A-Za-z0-9.-]+$/;
      if (licensePattern.test(target) && (target.includes('-') || ['MIT', 'ISC', 'BSD', 'Apache'].some(l => target.toUpperCase().startsWith(l.toUpperCase())))) {
        // Show license obligations
        console.log(chalk.cyan(`\nLicense explanation: ${target}\n`));
        console.log(ObligationsExplainer.formatObligations(target));
        return;
      }
      
      const scanner = new ILIScanner(projectPath);
      
      // Run scan
      const context = await scanner.loadContext(projectPath);
      const dependencyTree = await LockfileParser.parse(projectPath);
      const result = await scanner.scan(dependencyTree, projectPath, context);

      // Find conflict by ID or package name
      const conflict = result.enhancedConflicts.find((c) => 
        c.id === target || c.dependency.name === target
      );
      if (!conflict) {
        console.log(chalk.red(`❌ Conflict ${target} not found`));
        console.log(chalk.dim('\nTip: You can also explain licenses directly: codicense explain GPL-3.0'));
        process.exit(1);
      }

      // Display detailed explanation
      console.log(chalk.cyan(`\nConflict details: ${conflict.id}\n`));
      console.log(chalk.bold('Dependency:'), conflict.dependency.name);
      console.log(chalk.bold('License:'), conflict.dependency.license);
      console.log(chalk.bold('Severity:'), formatDynamicSeverity(conflict.dynamicSeverity, colorEnabled));
      console.log(chalk.bold('\nObligation:'), conflict.dynamicSeverity.obligation);
      console.log(chalk.bold('\nExplanation:'), conflict.dynamicSeverity.contextualExplanation);
      
      // Show license obligations
      console.log(chalk.bold('\nLicense obligations:\n'));
      console.log(ObligationsExplainer.getShortSummary(conflict.dependency.license));
      
      console.log(chalk.bold('\nFix suggestions:\n'));
      
      // Check for upgrade fix first
      const upgradeFix = conflict.fixSuggestions.find(f => f.strategy === 'upgrade');
      if (upgradeFix) {
        console.log(chalk.green('1. ' + upgradeFix.description + ' (recommended)'));
        console.log(chalk.dim(`   ${upgradeFix.implementation}`));
        console.log();
      }
      
      // Show other fixes
      const otherFixes = conflict.fixSuggestions.filter(f => f.strategy !== 'upgrade');
      otherFixes.forEach((fix, i) => {
        const num = upgradeFix ? i + 2 : i + 1;
        console.log(chalk.yellow(`${num}. ${fix.description} (${fix.effort} effort)`));
        console.log(chalk.dim(`   ${fix.implementation}`));
        console.log();
      });

      // Show conflict path
      console.log(chalk.bold('Dependency path:\n'));
      console.log(ASCIIVisualizer.renderConflictTree(
        conflict.conflictPath,
        'your-project',
        result.projectContext.projectLicense || 'UNKNOWN'
      ));
      
      // Show how risk entered the graph
      if (conflict.conflictPath.path.length > 2) {
        console.log(chalk.dim('\nNote: This conflict entered through transitive dependencies.'));
        console.log(chalk.dim('   The direct dependency is: ' + conflict.conflictPath.path[1]));
      }
    });
}

/**
 * codicense fix - Generate fixes with upgrade awareness
 */
export function createFixCommand(_colorEnabled: boolean): Command {
  return new Command('fix')
    .description('Generate fixes; replacements require --with, upgrades are suggested first when available')
    .argument('[package-or-id]', 'Package name or conflict ID to fix')
    .option('--dry-run', 'Show fix without applying')
    .option('--pr', 'Generate pull request')
    .option('--with <pkg@ver>', 'Specify replacement package (required)')
    .option('--upgrade', 'Try to find version upgrade that resolves conflict')
    .action(async (packageOrId: string | undefined, options: { dryRun?: boolean; pr?: boolean; with?: string; upgrade?: boolean }) => {
      const projectPath = process.cwd();
      const scanner = new ILIScanner(projectPath);
      
      // Run scan
      const context = await scanner.loadContext(projectPath);
      const dependencyTree = await LockfileParser.parse(projectPath);
      const result = await scanner.scan(dependencyTree, projectPath, context);

      const conflicts = packageOrId 
        ? result.enhancedConflicts.filter((c) => c.id === packageOrId || c.dependency.name === packageOrId)
        : result.enhancedConflicts;

      if (conflicts.length === 0) {
        console.log(chalk.yellow('No conflicts to fix'));
        return;
      }

      for (const conflict of conflicts) {
        // Check for upgrade fix first if --upgrade flag is set
        if (options.upgrade) {
          const upgradeCheck = UpgradeEngine.checkForUpgrade(
            conflict.dependency.name,
            conflict.dependency.version,
            conflict.dependency.license
          );
          
          if (upgradeCheck.hasUpgrade && upgradeCheck.upgrade) {
            console.log(chalk.green('\n✅ Upgrade Available!\n'));
            console.log(UpgradeEngine.formatUpgrade(upgradeCheck.upgrade));
            console.log(chalk.dim('\nRun the suggested command to apply the upgrade.'));
            continue;
          } else {
            console.log(chalk.yellow(`No license-improving upgrade found for ${conflict.dependency.name}`));
          }
        }
        
        const bestFix = conflict.fixSuggestions[0]; // Use best fix

        if (bestFix.strategy === 'replace') {
          // User must specify replacement with --with option
          let newPackage: string | undefined;
          let newVersion: string | undefined;
          
          if (options.with) {
            const [p, v] = options.with.split('@');
            newPackage = p;
            newVersion = v || undefined;
          }

          if (!newPackage) {
            console.log(chalk.red(`\nReplacement package required for "${conflict.dependency.name}".`));
            console.log(chalk.yellow('\nUsage:'));
            console.log(chalk.yellow('  codicense fix ' + conflict.dependency.name + ' --with <package@version>'));
            console.log(chalk.yellow('\nOptions:'));
            console.log(chalk.yellow('  --with <pkg@ver>  Specify replacement package (required)'));
            console.log(chalk.yellow('  --upgrade         Check for version upgrade that fixes license'));
            console.log(chalk.yellow('  --dry-run         Preview changes without applying'));
            console.log(chalk.yellow('  --pr              Generate pull request description'));
            console.log(chalk.dim('\nExample:'));
            console.log(chalk.dim('  codicense fix ' + conflict.dependency.name + ' --with alternative-package@1.0.0'));
            continue;
          }

          const patch = PatchGenerator.generateReplacementPatch(
            projectPath,
            conflict.dependency.name,
            newPackage,
            newVersion
          );

          if (options.dryRun) {
            console.log(chalk.cyan(`\n🔧 Fix for ${conflict.id}:\n`));
            console.log(patch.diff);
          } else if (options.pr) {
            const prContent = PRGenerator.generatePR(bestFix, patch, conflict.id);
            console.log(chalk.green('\n✅ PR content generated:\n'));
            console.log(prContent.prBody);
            console.log(chalk.dim('\nBranch:'), prContent.branchName);
          } else {
            // Apply the replacement directly to package.json
            const pkgJsonPath = path.join(projectPath, 'package.json');
            const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));

            let applied = false;
            if (pkg.dependencies && pkg.dependencies[conflict.dependency.name]) {
              pkg.dependencies[newPackage] = newVersion ?? pkg.dependencies[conflict.dependency.name];
              delete pkg.dependencies[conflict.dependency.name];
              applied = true;
            }
            if (pkg.devDependencies && pkg.devDependencies[conflict.dependency.name]) {
              pkg.devDependencies[newPackage] = newVersion ?? pkg.devDependencies[conflict.dependency.name];
              delete pkg.devDependencies[conflict.dependency.name];
              applied = true;
            }

            if (applied) {
              fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2));
              console.log(chalk.green(`\n✅ Applied replacement: ${conflict.dependency.name} → ${newPackage}`));
              console.log(chalk.yellow('Run `npm install` to update lockfiles.'));
            } else {
              console.log(chalk.red(`No dependency entry found for ${conflict.dependency.name} in package.json`));
            }
          }
        }
      }
    });
}

/**
 * codicense badge - Generate README badges
 */
export function createBadgeCommand(): Command {
  return new Command('badge')
    .description('Generate license status badges')
    .option('--format <type>', 'Badge format: markdown, html, rst, url', 'markdown')
    .option('--style <style>', 'Badge style: flat, flat-square, plastic, for-the-badge', 'flat')
    .action(async (options) => {
      const projectPath = process.cwd();
      const scanner = new ILIScanner(projectPath);
      
      // Run scan
      const context = await scanner.loadContext(projectPath);
      const dependencyTree = await LockfileParser.parse(projectPath);
      const result = await scanner.scan(dependencyTree, projectPath, context);
      
      const format = options.format as 'markdown' | 'html' | 'rst' | 'url';
      const style = options.style;
      
      console.log(BadgeGenerator.formatForCLI(
        result.riskScore,
        result.enhancedConflicts.length,
        format
      ));
      
      console.log(chalk.dim('\nAll badges:\n'));
      const badges = BadgeGenerator.generateAll(
        result.riskScore,
        result.enhancedConflicts.length,
        { format, style }
      );
      badges.forEach(badge => console.log(badge));
    });
}

/**
 * codicense trend - Show scan history and trends
 */
export function createTrendCommand(): Command {
  return new Command('trend')
    .description('Show license risk trends over time')
    .option('--history', 'Show full scan history')
    .option('--clear', 'Clear scan history')
    .action(async (options) => {
      const projectPath = process.cwd();
      const history = new ScanHistory(projectPath);
      
      if (options.clear) {
        history.clear();
        console.log(chalk.green('✅ Scan history cleared'));
        return;
      }
      
      if (options.history) {
        const entries = history.getEntries();
        console.log(ScanHistory.formatHistory(entries));
        return;
      }
      
      // Show trend analysis
      const trends = history.analyzeTrends();
      console.log(chalk.cyan('\nRisk trends\n'));
      console.log(ScanHistory.formatTrends(trends));
    });
}

/**
 * codicense obligations - Show license obligations
 */
export function createObligationsCommand(): Command {
  return new Command('obligations')
    .description('Show plain-English explanation of license obligations')
    .argument('<license>', 'License identifier (e.g., GPL-3.0, MIT, Apache-2.0)')
    .action(async (license: string) => {
      console.log(chalk.cyan(`\nLicense obligations: ${license}\n`));
      console.log(ObligationsExplainer.formatObligations(license));
    });
}

/**
 * Display ILI scan result with confidence scores
 */
function displayILIResult(result: ILIScanResult, _colorEnabled: boolean, showConfidence: boolean = false): void {
  console.log(chalk.cyan('\nScan results\n'));
  
  console.log(chalk.bold('Project Context:'));
  console.log(`  Intent: ${result.projectContext.intent}`);
  console.log(`  License: ${result.projectContext.projectLicense || 'UNKNOWN'}`);
  console.log(`  Distribution: ${result.projectContext.distributionModel}`);
  console.log();

  console.log(chalk.bold('Summary:'));
  console.log(`  Total Dependencies: ${result.summary.totalDependencies}`);
  console.log(`  Conflicts: ${result.summary.conflicts}`);
  console.log(`  Risk Score: ${result.riskScore}/100`);
  console.log();

  if (result.enhancedConflicts.length > 0) {
    console.log(chalk.bold('Conflicts:\n'));
    
    for (const conflict of result.enhancedConflicts) {
      console.log(chalk.red(`${conflict.dependency.name} (${conflict.dependency.license})`));
      
      // Show confidence if requested
      if (showConfidence) {
        const sources: LicenseSource[] = [
          ConfidenceDetector.createSource('lockfile', conflict.dependency.license),
        ];
        const confidence = ConfidenceDetector.calculateConfidence(conflict.dependency.license, sources);
        console.log(chalk.dim(`   Confidence: ${ConfidenceDetector.formatConfidence(confidence.confidence)}`));
      }
      
      console.log(chalk.dim(`   ${conflict.dynamicSeverity.contextualExplanation}`));

      // Highlight conflict path with entry-point marker
      const pathLine = formatConflictPath(conflict);
      if (pathLine) {
        console.log(chalk.dim(`   Path: ${pathLine}`));
      }

      // Recommend top LicenseFix alternative
      const alt = licenseFixEngine.searchAlternatives(conflict.dependency.name, conflict.dependency.license, {
        limit: 1,
        minConfidence: 0.55,
      }).alternatives[0];

      if (alt) {
        const confLabel = formatLevel(alt.confidenceScore);
        const simLabel = formatLevel(alt.similarityScore);
        console.log(chalk.green(`   Recommended: ${alt.package} (${alt.license})`));
        console.log(
          chalk.dim(
            `   Confidence: ${confLabel} (${Math.round(alt.confidenceScore * 100)}%) • Similarity: ${simLabel} (${Math.round(alt.similarityScore * 100)}%)`
          )
        );
        console.log(chalk.dim(`   Why: ${alt.rationale}`));
      }
      
      // Show upgrade fix prominently if available
      const upgradeFix = conflict.fixSuggestions.find(f => f.strategy === 'upgrade');
      if (upgradeFix) {
        console.log(chalk.green(`   ${upgradeFix.description}`));
      } else {
        console.log(chalk.yellow(`   Fix: ${conflict.fixSuggestions[0]?.description}`));
      }

      // Show ranked fixes with effort and tradeoffs
      if (conflict.fixSuggestions && conflict.fixSuggestions.length > 0) {
        console.log(chalk.bold('   Fix options (ranked):'));
        conflict.fixSuggestions.forEach((fix, idx) => {
          const effortLabel = formatEffort(fix.effort);
          const tradeoff = fix.tradeoffs && fix.tradeoffs.length > 0 ? ` • ${fix.tradeoffs[0]}` : '';
          console.log(`   ${idx + 1}. ${fix.description} ${effortLabel}${tradeoff}`);
        });
      }
      console.log(chalk.dim(`   ID: ${conflict.id}`));
      console.log();
    }

    const causalImpacts = causalImpactEngine.analyze(result.enhancedConflicts, result.riskScore);
    if (causalImpacts.length > 0) {
      console.log(chalk.bold('Causal impact (top 3):'));
      causalImpacts.slice(0, 3).forEach((impact, idx) => {
        console.log(
          `   ${idx + 1}. ${impact.packageName} — removes ${impact.riskContribution}% of current risk; conflicts cleared: ${impact.conflictsRemoved}`
        );
      });
      console.log();
    }

        console.log(chalk.dim(`\nRun \`codicense explain <id|package>\` for details`));
      console.log(chalk.dim(`Run \`codicense fix <id|package> --dry-run\` to preview fixes`));
      console.log(chalk.dim(`Run \`codicense scan --hotspots\` to see risk contributors`));
  } else {
    console.log(chalk.green('No license conflicts detected'));
  }
}

function formatConflictPath(conflict: EnhancedConflict): string {
  const path = conflict.conflictPath?.path || conflict.contaminationPath;
  const licenses = conflict.conflictPath?.licenses;
  if (!path || path.length === 0) return '';

  return path
    .map((name: string, idx: number) => {
      const license = licenses?.[idx] || conflict.dependency.license;
      const isEntry = idx === path.length - 1;
      const marker = isEntry ? ' \u2190 ENTRY POINT' : '';
      return `${name} (${license})${marker}`;
    })
    .join(' → ');
}

function formatLevel(score: number): string {
  if (score >= 0.8) return 'High';
  if (score >= 0.6) return 'Medium';
  return 'Low';
}

function formatEffort(effort: 'low' | 'medium' | 'high'): string {
  const label = effort.toUpperCase();
  if (effort === 'low') return chalk.green(`[${label} EFFORT]`);
  if (effort === 'medium') return chalk.yellow(`[${label} EFFORT]`);
  return chalk.red(`[${label} EFFORT]`);
}

/**
 * Format dynamic severity
 */
function formatDynamicSeverity(severity: DynamicSeverity, _colorEnabled: boolean): string {
  return `${severity.level.toUpperCase()} - ${severity.reason}`;
}

/**
 * Enhance conflicts with upgrade-aware fixes
 */
function enhanceWithUpgrades(result: ILIScanResult): void {
  for (const conflict of result.enhancedConflicts) {
    const upgradeCheck = UpgradeEngine.checkForUpgrade(
      conflict.dependency.name,
      conflict.dependency.version,
      conflict.dependency.license
    );
    
    if (upgradeCheck.hasUpgrade && upgradeCheck.upgrade) {
      // Add upgrade fix as first suggestion
      const upgradeFix = UpgradeEngine.toFixSuggestion(upgradeCheck.upgrade);
      conflict.fixSuggestions.unshift(upgradeFix);
    }
  }
}

/**
 * Helper to collect all dependencies from dependency tree
 */
function collectAllDependencies(tree: DependencyNode): DependencyNode[] {
  const deps: DependencyNode[] = [];

  const traverse = (node: DependencyNode | undefined) => {
    if (!node) return;
    deps.push(node);
    if (node.children && node.children.length > 0) {
      node.children.forEach(traverse);
    }
  };

  traverse(tree);
  return deps;
}

