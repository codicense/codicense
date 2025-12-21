import fs from 'fs';
import path from 'path';
import type { ProjectContext, DeveloperIntent, DistributionModel, LinkingModel, IntentConfig } from './types';

const CONFIG_DIR = '.codicense';
const CONFIG_FILE = 'config.json';

export class IntentDetector {
  constructor(private readonly projectPath: string) {}

  async detectContext(): Promise<ProjectContext> {
    const license = this.detectLicense();
    const intent = this.inferIntent(license);
    const distributionModel = this.inferDistribution();
    const linkingModel = this.inferLinking();

    return {
      projectLicense: license,
      intent,
      distributionModel,
      linkingModel,
      futureFlexibility: intent === 'undecided',
      detectedFrom: 'auto-detect',
    };
  }

  detectLicense(): string | undefined {
    const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'COPYING'];
    for (const file of licenseFiles) {
      const licensePath = path.join(this.projectPath, file);
      if (fs.existsSync(licensePath)) {
        const content = fs.readFileSync(licensePath, 'utf8');
        const detected = this.parseLicenseFile(content);
        if (detected) return detected;
      }
    }

    const pkgPath = path.join(this.projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.license && typeof pkg.license === 'string') {
          return this.normalizeLicenseString(pkg.license);
        }
      } catch {
        // Ignore parse errors
      }
    }

    return undefined;
  }

  private parseLicenseFile(content: string): string | undefined {
    const lines = content.split('\n').slice(0, 10);
    const text = lines.join(' ');

    if (/MIT License/i.test(text)) return 'MIT';
    if (/Apache License.*Version 2\.0/i.test(text)) return 'Apache-2.0';
    if (/GNU GENERAL PUBLIC LICENSE.*Version 3/i.test(text)) return 'GPL-3.0';
    if (/GNU GENERAL PUBLIC LICENSE.*Version 2/i.test(text)) return 'GPL-2.0';
    if (/BSD 3-Clause/i.test(text)) return 'BSD-3-Clause';
    if (/BSD 2-Clause/i.test(text)) return 'BSD-2-Clause';
    if (/ISC License/i.test(text)) return 'ISC';

    return undefined;
  }

  private normalizeLicenseString(license: string): string {
    if (license.includes('OR')) {
      const parts = license.split('OR').map((p) => p.trim());
      return parts[0];
    }
    return license;
  }

  private inferIntent(license: string | undefined): DeveloperIntent {
    const pkgPath = path.join(this.projectPath, 'package.json');

    if (pkgPath && fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.private === true) return 'proprietary';
      } catch {
        // ignore
      }
    }

    if (!license) return 'undecided';

    const copyleft = ['GPL', 'AGPL', 'LGPL', 'MPL', 'EPL', 'SSPL'];
    const isCopyleft = copyleft.some((l) => license.includes(l));
    if (isCopyleft) return 'open-source';

    const permissive = ['MIT', 'Apache-2.0', 'BSD', 'ISC', 'Unlicense'];
    if (permissive.some((l) => license.includes(l))) {
      return 'open-source';
    }

    return 'undecided';
  }

  private inferDistribution(): DistributionModel {
    const pkgPath = path.join(this.projectPath, 'package.json');
    const srcPath = path.join(this.projectPath, 'src');
    
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

        // Check for CLI characteristics
        if (pkg.bin) return 'cli';

        // Check for server frameworks (Express, Fastify, Koa, Nest, Hapi, etc.)
        const serverFrameworks = [
          'express', 'fastify', 'koa', '@nestjs/core', 'hapi',
          'restify', 'flask', 'django', 'gin', 'echo', 'fiber',
          'http', 'net/http', 'gorilla/mux'
        ];
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        
        if (serverFrameworks.some((fw) => fw in deps)) {
          return 'saas';
        }

        // Check for API/server indicators
        if (pkg.scripts && (pkg.scripts.start || pkg.scripts.serve || pkg.scripts.server)) {
          return 'saas';
        }

        // Check for library characteristics
        if (pkg.main || pkg.exports || pkg.types) {
          return 'library';
        }

        // Default detection based on presence of test files and src/
        if (pkg.main === undefined && fs.existsSync(srcPath)) {
          return 'library';
        }
      } catch {
        // ignore
      }
    }

    // Check Go project
    const goModPath = path.join(this.projectPath, 'go.mod');
    if (fs.existsSync(goModPath)) {
      try {
        const content = fs.readFileSync(goModPath, 'utf8');
        const serverFrameworks = ['gin', 'echo', 'fiber', 'gorilla/mux', 'http', 'net/http'];
        if (serverFrameworks.some((fw) => content.includes(fw))) {
          return 'saas';
        }
      } catch {
        // ignore
      }
    }

    // Check Python project
    const requirementsPath = path.join(this.projectPath, 'requirements.txt');
    if (fs.existsSync(requirementsPath)) {
      try {
        const content = fs.readFileSync(requirementsPath, 'utf8');
        const serverFrameworks = ['flask', 'django', 'fastapi', 'tornado'];
        if (serverFrameworks.some((fw) => content.includes(fw))) {
          return 'saas';
        }
      } catch {
        // ignore
      }
    }

    return 'library';
  }

  private inferLinking(): LinkingModel {
    return 'dynamic';
  }

  async loadOrCreate(): Promise<ProjectContext> {
    const configPath = path.join(this.projectPath, CONFIG_DIR, CONFIG_FILE);
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(raw) as IntentConfig;
        return parsed.projectContext;
      } catch {
        // fall through and regenerate
      }
    }

    const context = await this.detectContext();
    await this.save(context);
    return context;
  }

  async save(context: ProjectContext): Promise<void> {
    const configDir = path.join(this.projectPath, CONFIG_DIR);
    const configPath = path.join(configDir, CONFIG_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const config: IntentConfig = {
      version: '1.1.0',
      projectContext: context,
      guidedMode: context.intent === 'undecided',
      educationalMode: context.intent === 'undecided',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  }
}

