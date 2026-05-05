import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  detectHostCapabilities,
  supportsHostCapability,
  waitForHostReady,
  createExtendedWebHost,
  type ExtendedRendererHost,
} from '../src/host';

describe('@lytjs/host', () => {
  describe('detectHostCapabilities', () => {
    it('should return capability flags', () => {
      const caps = detectHostCapabilities();
      expect(caps).toHaveProperty('shadowDOM');
      expect(caps).toHaveProperty('customElements');
      expect(caps).toHaveProperty('cssVariables');
      expect(caps).toHaveProperty('resizeObserver');
      expect(typeof caps.shadowDOM).toBe('boolean');
    });
  });

  describe('supportsHostCapability', () => {
    it('should check specific capability', () => {
      const result = supportsHostCapability('shadowDOM');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('createExtendedWebHost', () => {
    const mockBaseHost = {
      createElement: vi.fn((tag: string) => document.createElement(tag)),
      createText: vi.fn((text: string) => document.createTextNode(text)),
      createComment: vi.fn((text: string) => document.createComment(text)),
      setElementText: vi.fn(),
      setText: vi.fn(),
      insert: vi.fn(),
      remove: vi.fn(),
      nextSibling: vi.fn(),
      parentNode: vi.fn(),
      querySelector: vi.fn(),
      patchProp: vi.fn(),
      addClass: vi.fn(),
      removeClass: vi.fn(),
      hasClass: vi.fn(),
      setStyle: vi.fn(),
      removeStyle: vi.fn(),
      getComputedStyle: vi.fn(),
      forceReflow: vi.fn(),
      addEventListener: vi.fn(() => () => {}),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(),
      getAttribute: vi.fn(),
      getTransitionInfo: vi.fn(),
      nextFrame: vi.fn(),
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    };

    it('should create extended host with insertBefore', () => {
      const host = createExtendedWebHost({ baseHost: mockBaseHost as unknown as ExtendedRendererHost });
      expect(host.insertBefore).toBeDefined();
    });

    it('should create extended host with replaceChild', () => {
      const host = createExtendedWebHost({ baseHost: mockBaseHost as unknown as ExtendedRendererHost });
      expect(host.replaceChild).toBeDefined();
    });

    it('should create extended host with querySelectorAll', () => {
      const host = createExtendedWebHost({ baseHost: mockBaseHost as unknown as ExtendedRendererHost });
      expect(host.querySelectorAll).toBeDefined();
    });

    it('should create extended host with setStyles', () => {
      const host = createExtendedWebHost({ baseHost: mockBaseHost as unknown as ExtendedRendererHost });
      expect(host.setStyles).toBeDefined();
    });

    it('should create extended host with dispatchEvent', () => {
      const host = createExtendedWebHost({ baseHost: mockBaseHost as unknown as ExtendedRendererHost });
      expect(host.dispatchEvent).toBeDefined();
    });
  });

  describe('waitForHostReady', () => {
    it('should return a promise', () => {
      const result = waitForHostReady();
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
