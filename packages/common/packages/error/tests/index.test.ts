import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  LytErrorCodes,
  type ErrorCategoryType,
  ErrorCategory,
  getErrorMessage,
  getCategory,
  type SourceLocation,
  LytError,
  createCompilerError,
  createRendererError,
  createComponentError,
  setDevMode,
  getDevMode,
  warn,
  warnOnce,
  error,
  resetWarnedMessages,
} from '../src/index';

describe('@lytjs/common-error', () => {
  beforeEach(() => {
    resetWarnedMessages();
  });

  describe('LytErrorCodes', () => {
    it('should have compiler error codes', () => {
      expect(LytErrorCodes.INVALID_EXPRESSION).toBeDefined();
      expect(LytErrorCodes.UNEXPECTED_TOKEN).toBeDefined();
    });

    it('should have renderer error codes', () => {
      expect(LytErrorCodes.RENDER_ERROR).toBeDefined();
      expect(LytErrorCodes.SETUP_FUNCTION_ERROR).toBeDefined();
    });

    it('should have component error codes', () => {
      expect(LytErrorCodes.INVALID_PROP_TYPE).toBeDefined();
      expect(LytErrorCodes.MISSING_PROP).toBeDefined();
    });
  });

  describe('ErrorCategory', () => {
    it('should have correct categories', () => {
      expect(ErrorCategory.COMPILER).toBe('compiler');
      expect(ErrorCategory.RUNTIME).toBe('runtime');
      expect(ErrorCategory.RENDERER).toBe('renderer');
      expect(ErrorCategory.COMPONENT).toBe('component');
    });
  });

  describe('getErrorMessage', () => {
    it('should return message for known error code', () => {
      const msg = getErrorMessage(LytErrorCodes.INVALID_EXPRESSION);
      expect(msg).toBeTruthy();
      expect(typeof msg).toBe('string');
    });

    it('should return generic message for unknown code', () => {
      const msg = getErrorMessage(99999 as any);
      expect(msg).toContain('unknown error code');
    });
  });

  describe('getCategory', () => {
    it('should return compiler category for compiler codes', () => {
      expect(getCategory(LytErrorCodes.INVALID_EXPRESSION)).toBe(ErrorCategory.COMPILER);
    });

    it('should return renderer category for renderer codes', () => {
      expect(getCategory(LytErrorCodes.RENDER_ERROR)).toBe(ErrorCategory.RENDERER);
    });

    it('should return component category for component codes', () => {
      expect(getCategory(LytErrorCodes.INVALID_PROP_TYPE)).toBe(ErrorCategory.COMPONENT);
    });

    it('should return runtime for code 0', () => {
      expect(getCategory(0)).toBe(ErrorCategory.RUNTIME);
    });

    it('should return runtime for negative codes', () => {
      expect(getCategory(-1)).toBe(ErrorCategory.RUNTIME);
    });

    it('should return runtime for unknown high codes', () => {
      expect(getCategory(9999)).toBe(ErrorCategory.RUNTIME);
    });

    it('should correctly categorize RENDER_ERROR as RENDERER not RUNTIME', () => {
      // RENDER_ERROR (2002) falls in [2000, 3000) RUNTIME range
      // but should be categorized as RENDERER due to special handling
      expect(getCategory(LytErrorCodes.RENDER_ERROR)).toBe(ErrorCategory.RENDERER);
      // A nearby runtime code should still be RUNTIME
      expect(getCategory(2001)).toBe(ErrorCategory.RUNTIME);
    });
  });

  describe('LytError', () => {
    it('should create an error with code and message', () => {
      const err = new LytError(LytErrorCodes.INVALID_EXPRESSION, 'test error');
      expect(err.message).toBe('test error');
      expect(err.code).toBe(LytErrorCodes.INVALID_EXPRESSION);
      expect(err).toBeInstanceOf(Error);
    });

    it('should store source location', () => {
      const loc: SourceLocation = {
        start: { line: 1, column: 1, offset: 0 },
        end: { line: 1, column: 5, offset: 4 },
        source: 'hello',
      };
      const err = new LytError(LytErrorCodes.INVALID_EXPRESSION, 'test', loc);
      expect(err.loc).toEqual(loc);
    });

    it('should be throwable', () => {
      expect(() => {
        throw new LytError(LytErrorCodes.INVALID_EXPRESSION, 'test');
      }).toThrow('test');
    });
  });

  describe('createCompilerError', () => {
    it('should create a compiler error', () => {
      const err = createCompilerError(LytErrorCodes.INVALID_EXPRESSION);
      expect(err).toBeInstanceOf(LytError);
      expect(err.code).toBe(LytErrorCodes.INVALID_EXPRESSION);
    });
  });

  describe('createRendererError', () => {
    it('should create a renderer error', () => {
      const err = createRendererError(LytErrorCodes.RENDER_ERROR);
      expect(err).toBeInstanceOf(LytError);
      expect(err.code).toBe(LytErrorCodes.RENDER_ERROR);
    });
  });

  describe('createComponentError', () => {
    it('should create a component error', () => {
      const err = createComponentError(LytErrorCodes.INVALID_PROP_TYPE);
      expect(err).toBeInstanceOf(LytError);
      expect(err.code).toBe(LytErrorCodes.INVALID_PROP_TYPE);
    });
  });

  describe('setDevMode / getDevMode', () => {
    it('should default to false', () => {
      expect(getDevMode()).toBe(false);
    });

    it('should set dev mode', () => {
      setDevMode(true);
      expect(getDevMode()).toBe(true);
      setDevMode(false);
      expect(getDevMode()).toBe(false);
    });
  });

  describe('warn', () => {
    it('should call console.warn in dev mode', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setDevMode(true);
      warn('test warning');
      expect(spy).toHaveBeenCalledWith('[LytJS]: test warning');
      setDevMode(false);
      spy.mockRestore();
    });

    it('should not call console.warn in production mode', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setDevMode(false);
      warn('test warning');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('warnOnce', () => {
    it('should only warn once for the same message', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setDevMode(true);
      warnOnce('test warning');
      warnOnce('test warning');
      warnOnce('test warning');
      expect(spy).toHaveBeenCalledTimes(1);
      setDevMode(false);
      spy.mockRestore();
    });

    it('should warn for different messages', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setDevMode(true);
      warnOnce('warning 1');
      warnOnce('warning 2');
      expect(spy).toHaveBeenCalledTimes(2);
      setDevMode(false);
      spy.mockRestore();
    });
  });

  describe('error', () => {
    it('should call console.error in dev mode', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      setDevMode(true);
      error('test error');
      expect(spy).toHaveBeenCalledWith(
        '[LytJS] Error: test error\n  (dev mode - see stack trace above for details)',
      );
      setDevMode(false);
      spy.mockRestore();
    });
  });

  describe('resetWarnedMessages', () => {
    it('should reset warned messages', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setDevMode(true);
      warnOnce('test');
      resetWarnedMessages();
      warnOnce('test');
      expect(spy).toHaveBeenCalledTimes(2);
      setDevMode(false);
      spy.mockRestore();
    });
  });
});
