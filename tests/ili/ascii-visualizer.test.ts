/**
 * ASCII Visualizer Tests
 * 
 * Tests for dependency tree rendering.
 */

import { describe, it, expect } from 'vitest';
import { ASCIIVisualizer } from '../../src/visualizer/ascii-visualizer';
import type { ConflictPath } from '../../src/ili/types';
import type { DependencyNode } from '../../src/types';

describe('ASCIIVisualizer', () => {
  describe('renderConflictTree', () => {
    it('should render a simple conflict path', () => {
      const path: ConflictPath = {
        path: ['my-project', 'dep-a', 'dep-b'],
        licenses: ['MIT', 'MIT', 'GPL-3.0'],
        ruleTriggered: 'copyleft',
        humanExplanation: 'Test conflict',
        obligationsInConflict: [],
      };

      const output = ASCIIVisualizer.renderConflictTree(path, 'my-project', 'MIT');
      
      expect(output).toContain('my-project');
      expect(output).toContain('dep-a');
      expect(output).toContain('dep-b');
      expect(output).toContain('GPL-3.0');
    });

    it('should use tree connectors correctly', () => {
      const path: ConflictPath = {
        path: ['root', 'child1', 'child2'],
        licenses: ['MIT', 'Apache-2.0', 'GPL-2.0'],
        ruleTriggered: 'copyleft',
        humanExplanation: 'Test',
        obligationsInConflict: [],
      };

      const output = ASCIIVisualizer.renderConflictTree(path, 'root', 'MIT');
      
      expect(output).toMatch(/[├└]/); // Should contain tree characters
    });

    it('should mark the last node with conflict marker', () => {
      const path: ConflictPath = {
        path: ['proj', 'lib'],
        licenses: ['MIT', 'AGPL-3.0'],
        ruleTriggered: 'agpl',
        humanExplanation: 'Test',
        obligationsInConflict: [],
      };

      const output = ASCIIVisualizer.renderConflictTree(path, 'proj', 'MIT');
      
      expect(output).toContain('❌'); // Conflict marker
    });

    it('should handle single-level path', () => {
      const path: ConflictPath = {
        path: ['my-app'],
        licenses: ['MIT'],
        ruleTriggered: 'none',
        humanExplanation: 'No conflict',
        obligationsInConflict: [],
      };

      const output = ASCIIVisualizer.renderConflictTree(path, 'my-app', 'MIT');
      
      expect(output).toBe('my-app (MIT)');
    });

    it('should handle deep paths', () => {
      const path: ConflictPath = {
        path: ['a', 'b', 'c', 'd', 'e'],
        licenses: ['MIT', 'MIT', 'MIT', 'MIT', 'GPL-3.0'],
        ruleTriggered: 'copyleft',
        humanExplanation: 'Deep conflict',
        obligationsInConflict: [],
      };

      const output = ASCIIVisualizer.renderConflictTree(path, 'a', 'MIT');
      
      const lines = output.split('\n');
      expect(lines.length).toBe(5);
      expect(lines[0]).toContain('a (MIT)');
      expect(lines[4]).toContain('e (GPL-3.0)');
    });
  });

  describe('renderFullTree', () => {
    it('should render a simple tree', () => {
      const root: DependencyNode = {
        name: 'my-app',
        version: '1.0.0',
        license: 'MIT',
        path: ['my-app'],
        depth: 0,
        dev: false,
        children: [
          {
            name: 'dep-a',
            version: '2.0.0',
            license: 'Apache-2.0',
            path: ['my-app', 'dep-a'],
            depth: 1,
            dev: false,
            children: [],
          },
        ],
      };

      const output = ASCIIVisualizer.renderFullTree(root);
      
      expect(output).toContain('my-app');
      expect(output).toContain('dep-a');
      expect(output).toContain('MIT');
      expect(output).toContain('Apache-2.0');
    });

    it('should respect maxDepth', () => {
      const deepTree: DependencyNode = {
        name: 'root',
        version: '1.0.0',
        license: 'MIT',
        path: ['root'],
        depth: 0,
        dev: false,
        children: [{
          name: 'level-1',
          version: '1.0.0',
          license: 'MIT',
          path: ['root', 'level-1'],
          depth: 1,
          dev: false,
          children: [{
            name: 'level-2',
            version: '1.0.0',
            license: 'MIT',
            path: ['root', 'level-1', 'level-2'],
            depth: 2,
            dev: false,
            children: [{
              name: 'level-3',
              version: '1.0.0',
              license: 'MIT',
              path: ['root', 'level-1', 'level-2', 'level-3'],
              depth: 3,
              dev: false,
              children: [],
            }],
          }],
        }],
      };

      const output = ASCIIVisualizer.renderFullTree(deepTree, 2);
      
      expect(output).toContain('level-1');
      expect(output).toContain('level-2');
      expect(output).not.toContain('level-3');
    });

    it('should handle multiple children', () => {
      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'MIT',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [
          {
            name: 'dep-1',
            version: '1.0.0',
            license: 'MIT',
            path: ['app', 'dep-1'],
            depth: 1,
            dev: false,
            children: [],
          },
          {
            name: 'dep-2',
            version: '2.0.0',
            license: 'Apache-2.0',
            path: ['app', 'dep-2'],
            depth: 1,
            dev: false,
            children: [],
          },
          {
            name: 'dep-3',
            version: '3.0.0',
            license: 'BSD-3-Clause',
            path: ['app', 'dep-3'],
            depth: 1,
            dev: false,
            children: [],
          },
        ],
      };

      const output = ASCIIVisualizer.renderFullTree(root);
      
      expect(output).toContain('dep-1');
      expect(output).toContain('dep-2');
      expect(output).toContain('dep-3');
      expect(output).toMatch(/├─.*dep-1/);
      expect(output).toMatch(/├─.*dep-2/);
      expect(output).toMatch(/└─.*dep-3/); // Last child uses └
    });

    it('should use correct tree characters', () => {
      const root: DependencyNode = {
        name: 'app',
        version: '1.0.0',
        license: 'MIT',
        path: ['app'],
        depth: 0,
        dev: false,
        children: [{
          name: 'dep',
          version: '1.0.0',
          license: 'MIT',
          path: ['app', 'dep'],
          depth: 1,
          dev: false,
          children: [],
        }],
      };

      const output = ASCIIVisualizer.renderFullTree(root);
      
      expect(output).toContain('└─'); // Last child connector
    });

    it('should handle empty tree', () => {
      const root: DependencyNode = {
        name: 'solo-app',
        version: '1.0.0',
        license: 'MIT',
        path: ['solo-app'],
        depth: 0,
        dev: false,
        children: [],
      };

      const output = ASCIIVisualizer.renderFullTree(root);
      
      expect(output).toBe('solo-app (MIT)');
    });
  });

  describe('renderConflictBox', () => {
    it('should render a conflict summary box', () => {
      const output = ASCIIVisualizer.renderConflictBox(
        'gpl-library',
        'GPL-3.0',
        'CRITICAL',
        'Using GPL-3.0 requires open-sourcing your entire codebase.',
        'Replace with MIT alternative'
      );

      expect(output).toContain('gpl-library');
      expect(output).toContain('GPL-3.0');
      expect(output).toContain('CRITICAL');
      expect(output).toContain('open-sourcing');
    });

    it('should use box drawing characters', () => {
      const output = ASCIIVisualizer.renderConflictBox(
        'test-lib',
        'MIT',
        'SAFE',
        'No conflict',
        ''
      );

      expect(output).toMatch(/[┏┓┗┛━]/); // Box drawing chars
    });

    it('should wrap long obligations', () => {
      const longObligation = 'This is a very long obligation text that should be wrapped to fit within the box width constraints and not exceed the maximum line length specified for readability.';
      
      const output = ASCIIVisualizer.renderConflictBox(
        'long-lib',
        'GPL-3.0',
        'HIGH',
        longObligation,
        'Replace with alternative'
      );

      const lines = output.split('\n');
      const maxLineLength = Math.max(...lines.map(l => l.length));
      
      expect(maxLineLength).toBeLessThan(100); // Reasonable width
    });

    it('should handle different severity levels', () => {
      const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'];
      
      for (const severity of severities) {
        const output = ASCIIVisualizer.renderConflictBox(
          'test',
          'MIT',
          severity,
          'Test',
          ''
        );
        
        expect(output).toContain(severity);
      }
    });
  });

  describe('determinism', () => {
    it('should produce identical output for same input', () => {
      const path: ConflictPath = {
        path: ['a', 'b', 'c'],
        licenses: ['MIT', 'Apache-2.0', 'GPL-3.0'],
        ruleTriggered: 'copyleft',
        humanExplanation: 'Test',
        obligationsInConflict: [],
      };

      const output1 = ASCIIVisualizer.renderConflictTree(path, 'a', 'MIT');
      const output2 = ASCIIVisualizer.renderConflictTree(path, 'a', 'MIT');
      
      expect(output1).toBe(output2);
    });

    it('should not include timestamps or UUIDs', () => {
      const path: ConflictPath = {
        path: ['test'],
        licenses: ['MIT'],
        ruleTriggered: 'none',
        humanExplanation: 'Test',
        obligationsInConflict: [],
      };

      const output = ASCIIVisualizer.renderConflictTree(path, 'test', 'MIT');
      
      // No UUIDs (8-4-4-4-12 hex pattern)
      expect(output).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      
      // No timestamps
      expect(output).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(output).not.toMatch(/\d{2}:\d{2}:\d{2}/);
    });
  });
});

