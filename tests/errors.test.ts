import { describe, it, expect, beforeEach } from 'vitest';
import { CodicenseError, ErrorCodes, ErrorFormatter, createError } from '../src/errors';

describe('Error Engineering', () => {
  describe('CodicenseError', () => {
    it('should create error with code and default message', () => {
      const error = new CodicenseError(ErrorCodes.LOCKFILE_NOT_FOUND);
      
      expect(error.code).toBe('CODICENSE_ERR_100');
      expect(error.message).toBe('No lockfile found in the project');
      expect(error.recommendation).toContain('npm install');
    });

    it('should allow custom message override', () => {
      const error = new CodicenseError(
        ErrorCodes.LOCKFILE_NOT_FOUND,
        'Custom message for testing'
      );
      
      expect(error.code).toBe('CODICENSE_ERR_100');
      expect(error.message).toBe('Custom message for testing');
    });

    it('should include context when provided', () => {
      const error = new CodicenseError(
        ErrorCodes.LOCKFILE_PARSE_FAILED,
        undefined,
        { context: { file: 'package-lock.json', line: 42 } }
      );
      
      expect(error.context).toEqual({ file: 'package-lock.json', line: 42 });
    });

    it('should include rule traceability', () => {
      const error = new CodicenseError(
        ErrorCodes.COMPAT_CONFLICT_DETECTED,
        undefined,
        { 
          ruleId: 'MIT_GPL3_STA_PRO_001',
          spdxRef: 'GPL-3.0 Section 5'
        }
      );
      
      expect(error.ruleId).toBe('MIT_GPL3_STA_PRO_001');
      expect(error.spdxRef).toBe('GPL-3.0 Section 5');
    });

    it('should format error for console output', () => {
      const error = new CodicenseError(ErrorCodes.CONFIG_NOT_FOUND);
      const formatted = error.format({ color: false });
      
      expect(formatted).toContain('[CODICENSE_ERR_200]');
      expect(formatted).toContain('No CODICENSE configuration found');
      expect(formatted).toContain('Try:');
      expect(formatted).toContain('codicense init');
    });

    it('should convert to JSON correctly', () => {
      const error = new CodicenseError(
        ErrorCodes.LICENSE_UNKNOWN,
        undefined,
        { context: { license: 'CUSTOM-1.0' } }
      );
      
      const json = error.toJSON();
      
      expect(json.code).toBe('CODICENSE_ERR_300');
      expect(json.message).toContain('unknown');
      expect(json.recommendation).toBeDefined();
      expect(json.context).toEqual({ license: 'CUSTOM-1.0' });
    });

    it('should preserve cause error', () => {
      const cause = new Error('Original error');
      const error = new CodicenseError(
        ErrorCodes.INTERNAL_ERROR,
        undefined,
        { cause }
      );
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('ErrorFormatter', () => {
    let formatter: ErrorFormatter;

    beforeEach(() => {
      formatter = new ErrorFormatter({ color: false, verbose: false });
    });

    it('should format CodicenseError', () => {
      const error = new CodicenseError(ErrorCodes.SCAN_TIMEOUT);
      const output = formatter.format(error);
      
      expect(output).toContain('[CODICENSE_ERR_403]');
      expect(output).toContain('timed out');
    });

    it('should format generic Error with internal error code', () => {
      const error = new Error('Something went wrong');
      const output = formatter.format(error);
      
      expect(output).toContain('[CODICENSE_ERR_900]');
      expect(output).toContain('Something went wrong');
    });

    it('should format unknown values', () => {
      const output = formatter.format('string error');
      
      expect(output).toContain('[CODICENSE_ERR_999]');
      expect(output).toContain('string error');
    });

    it('should include verbose stack when enabled', () => {
      formatter.setVerbose(true);
      const error = new Error('Test error');
      const output = formatter.format(error);
      
      expect(output).toContain('Stack:');
    });
  });

  describe('createError helper', () => {
    it('should create CodicenseError instance', () => {
      const error = createError(ErrorCodes.FIX_GITHUB_AUTH_MISSING);
      
      expect(error).toBeInstanceOf(CodicenseError);
      expect(error.code).toBe('CODICENSE_ERR_502');
    });
  });

  describe('ErrorCodes coverage', () => {
    const allCodes = Object.values(ErrorCodes);

    it('should have unique error codes', () => {
      const uniqueCodes = new Set(allCodes);
      expect(uniqueCodes.size).toBe(allCodes.length);
    });

    it('should follow naming convention', () => {
      for (const code of allCodes) {
        expect(code).toMatch(/^CODICENSE_ERR_\d{3}$/);
      }
    });

    it('should have at least 20 error codes for comprehensive coverage', () => {
      expect(allCodes.length).toBeGreaterThanOrEqual(20);
    });
  });
});

