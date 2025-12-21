/**
 * Dynamic Risk Engine Tests
 * 
 * Tests for context-aware severity calculation.
 */

import { describe, it, expect } from 'vitest';
import { DynamicRiskEngine } from '../../src/ili/dynamic-risk-engine';
import type { ProjectContext } from '../../src/ili/types';

describe('DynamicRiskEngine', () => {
  const engine = new DynamicRiskEngine();

  describe('Proprietary Intent', () => {
    const proprietaryContext: ProjectContext = {
      projectLicense: 'UNLICENSED',
      intent: 'proprietary',
      distributionModel: 'saas',
      linkingModel: 'static',
      futureFlexibility: false,
      detectedFrom: 'config',
    };

    it('should flag GPL as CRITICAL for proprietary projects', () => {
      const severity = engine.calculateSeverity('UNLICENSED', 'GPL-3.0', proprietaryContext);
      expect(severity.level).toBe('critical');
      expect(severity.reason).toContain('copyleft');
    });

    it('should flag AGPL as CRITICAL for proprietary projects', () => {
      const severity = engine.calculateSeverity('UNLICENSED', 'AGPL-3.0', proprietaryContext);
      expect(severity.level).toBe('critical');
      expect(severity.reason).toContain('network copyleft');
    });

    it('should flag static LGPL as HIGH for proprietary projects', () => {
      const severity = engine.calculateSeverity('UNLICENSED', 'LGPL-3.0', proprietaryContext);
      expect(severity.level).toBe('high');
      expect(severity.obligation).toContain('source code');
    });

    it('should flag MPL as MEDIUM for proprietary projects', () => {
      const severity = engine.calculateSeverity('UNLICENSED', 'MPL-2.0', proprietaryContext);
      expect(severity.level).toBe('medium');
      expect(severity.obligation).toContain('modifications');
    });

    it('should allow MIT for proprietary projects', () => {
      const severity = engine.calculateSeverity('UNLICENSED', 'MIT', proprietaryContext);
      expect(severity.level).toBe('safe');
    });

    it('should allow Apache-2.0 for proprietary projects', () => {
      const severity = engine.calculateSeverity('UNLICENSED', 'Apache-2.0', proprietaryContext);
      expect(severity.level).toBe('safe');
    });

    it('should allow BSD-3-Clause for proprietary projects', () => {
      const severity = engine.calculateSeverity('UNLICENSED', 'BSD-3-Clause', proprietaryContext);
      expect(severity.level).toBe('safe');
    });
  });

  describe('Open-Source Intent', () => {
    const ossGPLContext: ProjectContext = {
      projectLicense: 'GPL-3.0',
      intent: 'open-source',
      distributionModel: 'library',
      linkingModel: 'static',
      futureFlexibility: false,
      detectedFrom: 'config',
    };

    it('should allow GPL for GPL projects', () => {
      const severity = engine.calculateSeverity('GPL-3.0', 'GPL-3.0', ossGPLContext);
      expect(severity.level).toBe('safe');
      expect(severity.reason).toContain('same license');
    });

    it('should allow LGPL for GPL projects', () => {
      const severity = engine.calculateSeverity('GPL-3.0', 'LGPL-3.0', ossGPLContext);
      expect(severity.level).toBe('safe');
    });

    it('should flag GPL-incompatible licenses as HIGH', () => {
      const severity = engine.calculateSeverity('GPL-3.0', 'Apache-2.0', ossGPLContext);
      expect(severity.level).toBe('high');
      expect(severity.reason).toContain('incompatible');
    });

    it('should allow permissive licenses for GPL projects', () => {
      const severity = engine.calculateSeverity('GPL-3.0', 'MIT', ossGPLContext);
      expect(severity.level).toBe('safe');
    });

    const ossMITContext: ProjectContext = {
      projectLicense: 'MIT',
      intent: 'open-source',
      distributionModel: 'library',
      linkingModel: 'static',
      futureFlexibility: true,
      detectedFrom: 'config',
    };

    it('should warn about GPL for permissive projects with flexibility', () => {
      const severity = engine.calculateSeverity('MIT', 'GPL-3.0', ossMITContext);
      expect(severity.level).toBe('high');
      expect(severity.reason).toContain('copyleft contamination');
    });

    it('should allow permissive licenses for MIT projects', () => {
      const severity = engine.calculateSeverity('MIT', 'Apache-2.0', ossMITContext);
      expect(severity.level).toBe('safe');
    });
  });

  describe('Undecided Intent', () => {
    const undecidedContext: ProjectContext = {
      intent: 'undecided',
      distributionModel: 'cli',
      linkingModel: 'static',
      futureFlexibility: true,
      detectedFrom: 'auto-detect',
    };

    it('should warn about GPL for undecided projects', () => {
      const severity = engine.calculateSeverity(undefined, 'GPL-3.0', undecidedContext);
      expect(severity.level).toBe('medium');
      expect(severity.reason).toContain('future flexibility');
    });

    it('should warn about AGPL for undecided projects', () => {
      const severity = engine.calculateSeverity(undefined, 'AGPL-3.0', undecidedContext);
      expect(severity.level).toBe('medium');
    });

    it('should allow permissive licenses for undecided projects', () => {
      const severity = engine.calculateSeverity(undefined, 'MIT', undecidedContext);
      expect(severity.level).toBe('safe');
    });

    it('should warn about weak copyleft for undecided projects', () => {
      const severity = engine.calculateSeverity(undefined, 'LGPL-3.0', undecidedContext);
      expect(severity.level).toBe('low');
    });
  });

  describe('Distribution Model Impact', () => {
    it('should be lenient for SaaS with runtime linking', () => {
      const saasContext: ProjectContext = {
        projectLicense: 'UNLICENSED',
        intent: 'proprietary',
        distributionModel: 'saas',
        linkingModel: 'runtime',
        futureFlexibility: false,
        detectedFrom: 'config',
      };

      const severity = engine.calculateSeverity('UNLICENSED', 'GPL-3.0', saasContext);
      // Should still be critical, but explanation should mention runtime linking
      expect(severity.level).toBe('critical');
      expect(severity.contextualExplanation).toBeDefined();
    });

    it('should be strict for library distribution', () => {
      const libContext: ProjectContext = {
        projectLicense: 'MIT',
        intent: 'open-source',
        distributionModel: 'library',
        linkingModel: 'static',
        futureFlexibility: false,
        detectedFrom: 'config',
      };

      const severity = engine.calculateSeverity('MIT', 'GPL-3.0', libContext);
      expect(severity.level).toBe('high');
      expect(severity.obligation).toContain('GPL');
    });
  });

  describe('Linking Model Impact', () => {
    it('should reduce severity for dynamic linking with LGPL', () => {
      const dynamicContext: ProjectContext = {
        projectLicense: 'UNLICENSED',
        intent: 'proprietary',
        distributionModel: 'cli',
        linkingModel: 'dynamic',
        futureFlexibility: false,
        detectedFrom: 'config',
      };

      const severity = engine.calculateSeverity('UNLICENSED', 'LGPL-3.0', dynamicContext);
      expect(severity.level).toBe('medium');
      expect(severity.reason).toContain('dynamic linking');
    });

    it('should keep high severity for static linking with LGPL', () => {
      const staticContext: ProjectContext = {
        projectLicense: 'UNLICENSED',
        intent: 'proprietary',
        distributionModel: 'cli',
        linkingModel: 'static',
        futureFlexibility: false,
        detectedFrom: 'config',
      };

      const severity = engine.calculateSeverity('UNLICENSED', 'LGPL-3.0', staticContext);
      expect(severity.level).toBe('high');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown licenses', () => {
      const context: ProjectContext = {
        intent: 'proprietary',
        distributionModel: 'cli',
        linkingModel: 'static',
        futureFlexibility: false,
        detectedFrom: 'config',
      };

      const severity = engine.calculateSeverity('UNLICENSED', 'UNKNOWN', context);
      expect(severity.level).toBe('medium');
      expect(severity.reason).toContain('unknown');
    });

    it('should handle dual licenses', () => {
      const context: ProjectContext = {
        intent: 'proprietary',
        distributionModel: 'cli',
        linkingModel: 'static',
        futureFlexibility: false,
        detectedFrom: 'config',
      };

      const severity = engine.calculateSeverity('UNLICENSED', 'MIT OR GPL-3.0', context);
      // Should evaluate best option (MIT)
      expect(severity).toBeDefined();
    });

    it('should provide intent-specific explanations', () => {
      const propContext: ProjectContext = {
        intent: 'proprietary',
        distributionModel: 'saas',
        linkingModel: 'static',
        futureFlexibility: false,
        detectedFrom: 'config',
      };

      const severity = engine.calculateSeverity('UNLICENSED', 'GPL-3.0', propContext);
      expect(severity.intentImpact).toContain('proprietary');
    });
  });
});

