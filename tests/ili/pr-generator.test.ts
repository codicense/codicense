/**
 * PR Generator Tests
 * 
 * Tests for GitHub PR content generation.
 */

import { describe, it, expect } from 'vitest';
import { PRGenerator } from '../../src/fix/pr-generator';
import type { FixSuggestion } from '../../src/ili/types';
import type { Patch } from '../../src/fix/patch-generator';

describe('PRGenerator', () => {
  const mockFix: FixSuggestion = {
    effort: 'low',
    strategy: 'replace',
    description: 'Replace gpl-library with mit-alternative',
    implementation: 'npm uninstall gpl-library && npm install mit-alternative',
    tradeoffs: ['May require minor API adjustments'],
    estimatedTime: '15 minutes',
  };

  const mockPatch: Patch = {
    description: 'Replace gpl-library with mit-alternative',
    operations: [{
      file: 'package.json',
      operation: 'modify',
      before: '"gpl-library": "^1.0.0"',
      after: '"mit-alternative": "^1.0.0"',
    }],
    diff: `--- a/package.json
+++ b/package.json
@@ -1,1 +1,1 @@
-"gpl-library": "^1.0.0"
+"mit-alternative": "^1.0.0"
`,
  };

  describe('generatePR', () => {
    it('should generate complete PR content', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-abc123');

      expect(pr.branchName).toBeDefined();
      expect(pr.commitMessage).toBeDefined();
      expect(pr.prTitle).toBeDefined();
      expect(pr.prBody).toBeDefined();
      expect(pr.labels).toBeDefined();
      expect(pr.labels.length).toBeGreaterThan(0);
    });

    it('should use strategy in branch name', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.branchName).toContain('replace');
    });

    it('should include conflict ID in branch name', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-xyz789');

      expect(pr.branchName).toContain('xyz789');
    });

    it('should sanitize conflict ID for branch name', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-#@$%');

      expect(pr.branchName).toMatch(/^codicense\/[a-z0-9-]+$/);
    });

    it('should start branch name with codicense/', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.branchName).toMatch(/^codicense\//);
    });
  });

  describe('commit message generation', () => {
    it('should follow conventional commit format', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.commitMessage).toMatch(/^fix\(licenses\):/);
    });

    it('should include fix description', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.commitMessage).toContain('Replace gpl-library');
    });

    it('should include strategy and effort', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.commitMessage).toContain('Strategy: replace');
      expect(pr.commitMessage).toContain('Effort: low');
    });

    it('should include generator attribution', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.commitMessage).toContain('Codicense');
    });
  });

  describe('PR title generation', () => {
    it('should include License Fix tag', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prTitle).toContain('[License Fix]');
    });

    it('should include fix description', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prTitle).toContain('Replace gpl-library');
    });

    it('should be concise', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prTitle.length).toBeLessThan(100);
    });
  });

  describe('PR body generation', () => {
    it('should include fix details section', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toContain('## License Compatibility Fix');
      expect(pr.prBody).toContain('### Fix Details');
    });

    it('should include strategy and effort', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toContain('**Strategy**: replace');
      expect(pr.prBody).toContain('**Effort**: low');
    });

    it('should include estimated time if provided', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toContain('15 minutes');
    });

    it('should include diff in code block', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toContain('```diff');
      expect(pr.prBody).toContain(mockPatch.diff);
    });

    it('should include implementation notes', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toContain('### Implementation Notes');
      expect(pr.prBody).toContain(mockFix.implementation);
    });

    it('should include tradeoffs section', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toContain('### Tradeoffs');
      expect(pr.prBody).toContain('May require minor API adjustments');
    });

    it('should include testing checklist', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toContain('### Testing Checklist');
      expect(pr.prBody).toContain('- [ ]');
    });

    it('should include generator attribution', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toContain('Generated by');
      expect(pr.prBody).toContain('Codicense');
    });

    it('should use markdown formatting', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toMatch(/##/);
      expect(pr.prBody).toMatch(/###/);
      expect(pr.prBody).toMatch(/-/);
    });
  });

  describe('label generation', () => {
    it('should always include license-fix and automated labels', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.labels).toContain('license-fix');
      expect(pr.labels).toContain('automated');
    });

    it('should add easy-fix label for low effort', () => {
      const lowEffortFix = { ...mockFix, effort: 'low' as const };
      const pr = PRGenerator.generatePR(lowEffortFix, mockPatch, 'conflict-123');

      expect(pr.labels).toContain('easy-fix');
    });

    it('should add complex-fix label for high effort', () => {
      const highEffortFix = { ...mockFix, effort: 'high' as const };
      const pr = PRGenerator.generatePR(highEffortFix, mockPatch, 'conflict-123');

      expect(pr.labels).toContain('complex-fix');
    });

    it('should add dependency-update label for replace strategy', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.labels).toContain('dependency-update');
    });

    it('should add breaking-change label for remove strategy', () => {
      const removeFix = { ...mockFix, strategy: 'remove' as const };
      const pr = PRGenerator.generatePR(removeFix, mockPatch, 'conflict-123');

      expect(pr.labels).toContain('breaking-change');
    });

    it('should not duplicate labels', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      const uniqueLabels = new Set(pr.labels);
      expect(uniqueLabels.size).toBe(pr.labels.length);
    });
  });

  describe('CLI commands generation', () => {
    it('should generate git commands', () => {
      const commands = PRGenerator.generateCLICommands(
        PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123'),
        mockPatch
      );

      expect(commands).toContain('git checkout -b');
      expect(commands).toContain('git add');
      expect(commands).toContain('git commit');
      expect(commands).toContain('git push');
    });

    it('should include gh pr create command', () => {
      const commands = PRGenerator.generateCLICommands(
        PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123'),
        mockPatch
      );

      expect(commands).toContain('gh pr create');
    });

    it('should include branch name in checkout command', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');
      const commands = PRGenerator.generateCLICommands(pr, mockPatch);

      expect(commands).toContain(pr.branchName);
    });

    it('should include file operations for each change', () => {
      const commands = PRGenerator.generateCLICommands(
        PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123'),
        mockPatch
      );

      expect(commands).toContain('package.json');
    });
  });

  describe('determinism', () => {
    it('should use deterministic mode when env var set', () => {
      process.env.CODICENSE_DETERMINISTIC = '1';

      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr.branchName).toContain('0000000000');
      
      delete process.env.CODICENSE_DETERMINISTIC;
    });

    it('should generate consistent output for same input', () => {
      process.env.CODICENSE_DETERMINISTIC = '1';

      const pr1 = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');
      const pr2 = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      expect(pr1.branchName).toBe(pr2.branchName);
      expect(pr1.commitMessage).toBe(pr2.commitMessage);
      expect(pr1.prBody).toBe(pr2.prBody);

      delete process.env.CODICENSE_DETERMINISTIC;
    });

    it('should not include actual timestamps in deterministic mode', () => {
      process.env.CODICENSE_DETERMINISTIC = '1';

      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-123');

      const timestampPattern = /\d{13}/; // Unix timestamp in ms
      expect(pr.branchName).not.toMatch(timestampPattern);

      delete process.env.CODICENSE_DETERMINISTIC;
    });
  });

  describe('edge cases', () => {
    it('should handle empty tradeoffs array', () => {
      const noTradeoffsFix = { ...mockFix, tradeoffs: [] };
      const pr = PRGenerator.generatePR(noTradeoffsFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toBeDefined();
    });

    it('should handle missing estimated time', () => {
      const noTimeFix = { ...mockFix, estimatedTime: undefined };
      const pr = PRGenerator.generatePR(noTimeFix, mockPatch, 'conflict-123');

      expect(pr.prBody).toBeDefined();
      expect(pr.prBody).not.toContain('Estimated Time');
    });

    it('should handle special characters in conflict ID', () => {
      const pr = PRGenerator.generatePR(mockFix, mockPatch, 'conflict-@#$%^&*()');

      expect(pr.branchName).toMatch(/^codicense\/[a-z0-9-]+$/);
    });

    it('should handle medium effort (no special label)', () => {
      const mediumFix = { ...mockFix, effort: 'medium' as const };
      const pr = PRGenerator.generatePR(mediumFix, mockPatch, 'conflict-123');

      expect(pr.labels).not.toContain('easy-fix');
      expect(pr.labels).not.toContain('complex-fix');
    });
  });
});

