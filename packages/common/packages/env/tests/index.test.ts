import { describe, it, expect } from 'vitest';
import { isBrowser, isNode, isSSR, getEnvInfo, isUnknownEnv } from '../src/index';

describe('@lytjs/common-env', () => {
  describe('Basic functions', () => {
    it('should export all functions', () => {
      expect(typeof isBrowser).toBe('function');
      expect(typeof isNode).toBe('function');
      expect(typeof isSSR).toBe('function');
      expect(typeof getEnvInfo).toBe('function');
      expect(typeof isUnknownEnv).toBe('function');
    });

    it('should return boolean values', () => {
      expect(typeof isBrowser()).toBe('boolean');
      expect(typeof isNode()).toBe('boolean');
      expect(typeof isSSR()).toBe('boolean');
    });

    it('getEnvInfo should return correct shape', () => {
      const info = getEnvInfo();
      expect(info).toHaveProperty('isBrowser');
      expect(info).toHaveProperty('isNode');
      expect(info).toHaveProperty('isSSR');
      expect(info).toHaveProperty('userAgent');
    });

    it('isNode should be true in test environment', () => {
      expect(isNode()).toBe(true);
    });

    it('isBrowser should be false in Node.js test environment', () => {
      expect(isBrowser()).toBe(false);
    });
  });
});
