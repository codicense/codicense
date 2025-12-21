#!/usr/bin/env node

import { Command } from "commander";
import ora from "ora";
import { createInitCommand, createScanCommand, createExplainCommand, createFixCommand, createBadgeCommand, createTrendCommand, createObligationsCommand } from "./cli-ili";
import { ILIScanner } from "./engine/ili-scanner";
import { LockfileParser } from "./parsers/lockfile-parser";

const program = new Command();

program
  .name("codicense")
  .description("Intent-aware license compliance CLI")
  .version("3.0.0")
  .option("--json", "Output machine-readable JSON")
  .option("--format <type>", "Output format: text, json, markdown, table, sbom")
  .option("--no-color", "Disable colored output");

// Register commands
program.addCommand(createInitCommand(true, false));
program.addCommand(createScanCommand(true, false));
program.addCommand(createExplainCommand(true));
program.addCommand(createFixCommand(true));
program.addCommand(createBadgeCommand());
program.addCommand(createTrendCommand());
program.addCommand(createObligationsCommand());

// CI command
program
  .command("ci")
  .description("Run scan in CI/CD mode (fails on specified severities)")
  .option("--fail-on <levels>", "Comma-separated severities to fail on", "critical,high")
  .action(async (options) => {
    const projectPath = process.cwd();
    const scanner = new ILIScanner(projectPath);
    const globalOpts = program.opts();
    const spinner = ora({ text: "Analyzing dependencies...", isEnabled: !globalOpts.noColor }).start();

    try {
      const context = await scanner.loadContext(projectPath);
      const dependencyTree = await LockfileParser.parse(projectPath);
      const result = await scanner.scan(dependencyTree, projectPath, context);

      spinner.stop();
      const failLevels = options.failOn.split(",").map((s: string) => s.trim().toLowerCase());
      const shouldFail = result.enhancedConflicts.some((c) => failLevels.includes(c.dynamicSeverity.level));

      if (globalOpts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
      process.exit(shouldFail ? 1 : 0);
    } catch (error) {
      spinner.fail("CI scan failed");
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parseAsync(process.argv);

