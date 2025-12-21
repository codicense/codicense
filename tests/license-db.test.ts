import { describe, it, expect } from 'vitest';
import { licenseDb } from '../src/license-db';

describe('License Database', () => {
  it('should load SPDX licenses', () => {
    const mitLicense = licenseDb.getLicense('MIT');
    expect(mitLicense).toBeDefined();
    expect(mitLicense?.name).toContain('MIT');
    expect(mitLicense?.category).toBe('permissive');
  });

  it('should recognize permissive licenses', () => {
    const licenses = ['MIT', 'Apache-2.0', 'BSD-3-Clause', 'ISC'];
    
    for (const id of licenses) {
      const license = licenseDb.getLicense(id);
      expect(license?.category).toBe('permissive');
    }
  });

  it('should recognize strong copyleft licenses', () => {
    const licenses = ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0'];
    
    for (const id of licenses) {
      const license = licenseDb.getLicense(id);
      expect(license?.category).toBe('strong-copyleft');
    }
  });

  it('should recognize weak copyleft licenses', () => {
    const licenses = ['LGPL-2.1', 'LGPL-3.0', 'MPL-2.0'];
    
    for (const id of licenses) {
      const license = licenseDb.getLicense(id);
      expect(license?.category).toBe('weak-copyleft');
    }
  });

  it('should normalize license IDs', () => {
    // These specific aliases are defined in the database
    expect(licenseDb.normalizeLicenseId('Apache 2.0')).toBe('Apache-2.0');
    expect(licenseDb.normalizeLicenseId('Apache')).toBe('Apache-2.0');
    expect(licenseDb.normalizeLicenseId('BSD')).toBe('BSD-3-Clause');
    
    // Non-aliased IDs return as-is
    expect(licenseDb.normalizeLicenseId('MIT')).toBe('MIT');
  });

  it('should detect copyleft licenses', () => {
    expect(licenseDb.isCopyleft('GPL-3.0')).toBe(true);
    expect(licenseDb.isCopyleft('LGPL-3.0')).toBe(true);
    expect(licenseDb.isCopyleft('MIT')).toBe(false);
  });

  it('should detect strong copyleft', () => {
    expect(licenseDb.isStrongCopyleft('GPL-3.0')).toBe(true);
    expect(licenseDb.isStrongCopyleft('AGPL-3.0')).toBe(true);
    expect(licenseDb.isStrongCopyleft('LGPL-3.0')).toBe(false);
    expect(licenseDb.isStrongCopyleft('MIT')).toBe(false);
  });
});

