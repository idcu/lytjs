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
  getErrorSuggestion,
  formatError,
  printFormattedError,
  safeExec,
  safeJsonParse,
  createEnhancedError,
  safeExecWithRecovery,
  safeExecWithRecoveryAsync,
  type LogHandler,
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
      expect(msg).toContain('error code');
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
      setDevMode(false);
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

  describe('getErrorSuggestion', () => {
    it('should return suggestion for known error code', () => {
      const suggestion = getErrorSuggestion(LytErrorCodes.INVALID_EXPRESSION);
      expect(suggestion).toBeTruthy();
      expect(typeof suggestion).toBe('string');
    });

    it('should return undefined for unknown error code', () => {
      const suggestion = getErrorSuggestion(99999 as any);
      expect(suggestion).toBeUndefined();
    });
  });

  describe('formatError', () => {
    it('should format LytError with code', () => {
      const err = new LytError(LytErrorCodes.INVALID_EXPRESSION, 'test error');
      const formatted = formatError(err);
      expect(formatted.code).toBe(LytErrorCodes.INVALID_EXPRESSION);
      expect(formatted.message).toBe('test error');
      expect(formatted.title).toContain('Compiler');
    });

    it('should format string error', () => {
      const formatted = formatError('string error');
      expect(formatted.message).toBe('string error');
    });

    it('should include location when available', () => {
      const loc: SourceLocation = {
        start: { line: 1, column: 2, offset: 3 },
        end: { line: 4, column: 5, offset: 6 },
        source: 'test',
      };
      const err = new LytError(LytErrorCodes.INVALID_EXPRESSION, 'test', loc);
      const formatted = formatError(err);
      expect(formatted.location).toContain('line 1');
      expect(formatted.location).toContain('column 2');
    });

    it('should include suggestion when available', () => {
      const err = new LytError(LytErrorCodes.INVALID_EXPRESSION);
      const formatted = formatError(err);
      expect(formatted.suggestion).toBeTruthy();
    });
  });

  describe('printFormattedError', () => {
    it('should call console.error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      printFormattedError('test error');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('safeExec', () => {
    it('should return result of successful function', () => {
      const result = safeExec(() => 42, 0);
      expect(result).toBe(42);
    });

    it('should return default value on error', () => {
      const result = safeExec(() => {
        throw new Error('test error');
      }, 'default');
      expect(result).toBe('default');
    });

    it('should log warning in dev mode on error', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setDevMode(true);
      safeExec(
        () => {
          throw new Error('test');
        },
        0,
        'test context',
      );
      expect(spy).toHaveBeenCalled();
      setDevMode(false);
      spy.mockRestore();
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const result = safeJsonParse('{"a": 1}', {});
      expect(result).toEqual({ a: 1 });
    });

    it('should return default value on invalid JSON', () => {
      const result = safeJsonParse('invalid json', { default: true });
      expect(result).toEqual({ default: true });
    });
  });

  describe('createEnhancedError', () => {
    it('should create an enhanced error', () => {
      const err = createEnhancedError('test error', {
        code: 123,
        recoverable: true,
        recoverySuggestion: 'try again',
        context: { test: 'data' },
      });
      expect(err.message).toBe('test error');
      expect(err.code).toBe(123);
      expect(err.recoverable).toBe(true);
      expect(err.recoverySuggestion).toBe('try again');
      expect(err.context).toEqual({ test: 'data' });
    });

    it('should include cause', () => {
      const cause = new Error('root cause');
      const err = createEnhancedError('wrapper', { cause });
      expect(err.cause).toBe(cause);
    });
  });

  describe('safeExecWithRecovery', () => {
    it('should return result of successful function', () => {
      const result = safeExecWithRecovery(() => 42, { defaultValue: 0 });
      expect(result).toBe(42);
    });

    it('should return default value on error', () => {
      const result = safeExecWithRecovery(
        () => {
          throw new Error('test');
        },
        { defaultValue: 'fallback' },
      );
      expect(result).toBe('fallback');
    });

    it('should call onError on error', () => {
      const onError = vi.fn();
      safeExecWithRecovery(
        () => {
          throw new Error('test');
        },
        { defaultValue: 0, onError },
      );
      expect(onError).toHaveBeenCalled();
    });

    it('should call onRecover and use recovered value', () => {
      const onRecover = vi.fn(() => 'recovered');
      const result = safeExecWithRecovery(
        () => {
          throw new Error('test');
        },
        { defaultValue: 'fallback', onRecover, maxRetries: 1 },
      );
      expect(onRecover).toHaveBeenCalled();
      expect(result).toBe('recovered');
    });
  });

  describe('safeExecWithRecoveryAsync', async () => {
    it('should return result of successful async function', async () => {
      const result = await safeExecWithRecoveryAsync(async () => 42, { defaultValue: 0 });
      expect(result).toBe(42);
    });

    it('should return default value on async error', async () => {
      const result = await safeExecWithRecoveryAsync(
        async () => {
          throw new Error('test');
        },
        { defaultValue: 'fallback' },
      );
      expect(result).toBe('fallback');
    });
  });
});
