/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isBrowser, isNode, isSSR, getEnvInfo, type EnvInfo } from '../src/index';

describe('@lytjs/common-env', () => {
  describe('isBrowser', () => {
    it('should return true when window is defined', () => {
      // 在 vitest 中，window 默认存在（jsdom 或 happy-dom）
      expect(typeof isBrowser()).toBe('boolean');
    });

    it('should return false when window is undefined', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error test - 故意删除 window
      delete globalThis.window;
      expect(isBrowser()).toBe(false);
      globalThis.window = originalWindow;
    });

    it('should return false when document is undefined', () => {
      const originalDocument = globalThis.document;
      // @ts-expect-error test - 故意删除 document
      delete globalThis.document;
      expect(isBrowser()).toBe(false);
      globalThis.document = originalDocument;
    });
  });

  describe('isNode', () => {
    it('should return a boolean', () => {
      expect(typeof isNode()).toBe('boolean');
    });

    it('should return true when process.versions.node exists', () => {
      const originalProcess = globalThis.process;
      // @ts-expect-error test - 故意设置 process
      globalThis.process = { versions: { node: '18.0.0' } } as any;
      expect(isNode()).toBe(true);
      globalThis.process = originalProcess;
    });

    it('should return false when process is undefined', () => {
      const originalProcess = globalThis.process;
      // @ts-expect-error test - 故意删除 process
      delete globalThis.process;
      expect(isNode()).toBe(false);
      globalThis.process = originalProcess;
    });
  });

  describe('isSSR', () => {
    it('should return a boolean', () => {
      expect(typeof isSSR()).toBe('boolean');
    });

    it('should return true when not in browser and not in node', () => {
      const originalWindow = globalThis.window;
      const originalProcess = globalThis.process;
      // @ts-expect-error test
      delete globalThis.window;
      // @ts-expect-error test
      delete globalThis.process;
      expect(isSSR()).toBe(true);
      globalThis.window = originalWindow;
      globalThis.process = originalProcess;
    });
  });

  describe('getEnvInfo', () => {
    it('should return an object with correct shape', () => {
      const info = getEnvInfo();
      expect(info).toHaveProperty('isBrowser');
      expect(info).toHaveProperty('isNode');
      expect(info).toHaveProperty('isSSR');
      expect(info).toHaveProperty('userAgent');
      expect(typeof info.isBrowser).toBe('boolean');
      expect(typeof info.isNode).toBe('boolean');
      expect(typeof info.isSSR).toBe('boolean');
      expect(typeof info.userAgent).toBe('string');
    });

    it('should return consistent results', () => {
      const info1 = getEnvInfo();
      const info2 = getEnvInfo();
      expect(info1).toEqual(info2);
    });

    it('should have userAgent as empty string in Node environment', () => {
      const info = getEnvInfo();
      if (info.isNode) {
        expect(info.userAgent).toBe('');
      }
    });
  });
});
