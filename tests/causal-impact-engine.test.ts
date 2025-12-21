import { describe, expect, it } from 'vitest';
import { causalImpactEngine } from '../src/engine/causal-impact-engine.js';
import type { Conflict } from '../src/types.js';

describe('CausalImpactEngine', () => {
  const conflicts: Conflict[] = [
    {
      id: 'c1',
      severity: 'HIGH',
      dependency: {
        name: 'leaf-a',
        version: '1.0.0',
        license: 'GPL-3.0',
        path: ['root', 'mid-a', 'leaf-a'],
      },
      reason: 'Incompatible',
      contaminationPath: ['root (MIT)', 'mid-a (MIT)', 'leaf-a (GPL-3.0) ← CONFLICT'],
      fixes: [],
    },
    {
      id: 'c2',
      severity: 'MEDIUM',
      dependency: {
        name: 'leaf-b',
        version: '2.0.0',
        license: 'AGPL-3.0',
        path: ['root', 'mid-b', 'leaf-b'],
      },
      reason: 'Incompatible',
      contaminationPath: ['root (MIT)', 'mid-b (MIT)', 'leaf-b (AGPL-3.0) ← CONFLICT'],
      fixes: [],
    },
  ];

  it('ranks packages by risk contribution', () => {
    const result = causalImpactEngine.analyze(conflicts, 60); // baseline penalty = 40
    expect(result[0].riskContribution).toBeGreaterThanOrEqual(result[1].riskContribution);
    expect(['leaf-a', 'mid-a']).toContain(result[0].packageName);
  });

  it('caps contribution at 100% and computes hypothetical risk score', () => {
    const result = causalImpactEngine.analyze(conflicts, 10); // heavy penalty
    const top = result[0];
    expect(top.riskContribution).toBeLessThanOrEqual(100);
    expect(top.riskScoreAfterRemoval).toBeGreaterThan(10);
  });
});
