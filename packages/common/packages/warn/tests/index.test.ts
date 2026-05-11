import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  warn,
  error,
  debug,
  fatal,
  setLevel,
  setHandler,
  resetWarned,
  getLevel,
  type LogEntry,
  createWarnContext,
  type WarnContext,
} from '../src/index';

describe('@lytjs/common-warn', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    // Reset module state to defaults
    setLevel('warn');
    setHandler(null);
    resetWarned();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── warn ───────────────────────────────────────────────
  describe('warn', () => {
    it('should call console.warn with formatted message', () => {
      warn('something happened');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Lyt.js warn] something happened');
    });

    it('should include source in formatted message', () => {
      warn('something happened', { source: 'MyComponent' });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[Lyt.js warn] something happened (at MyComponent)',
      );
    });
  });

  // ─── error ──────────────────────────────────────────────
  describe('error', () => {
    it('should call console.error with formatted message', () => {
      error('something broke');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Lyt.js error] something broke');
    });

    it('should include source in formatted message', () => {
      error('something broke', { source: 'Runtime' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Lyt.js error] something broke (at Runtime)');
    });
  });

  // ─── debug ──────────────────────────────────────────────
  describe('debug', () => {
    it('should not output by default (level is warn)', () => {
      debug('trace info');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should output when level is set to debug', () => {
      setLevel('debug');
      debug('trace info');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Lyt.js debug] trace info');
    });
  });

  // ─── fatal ──────────────────────────────────────────────
  describe('fatal', () => {
    it('should call console.error and process.exit', () => {
      fatal('unrecoverable error');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Lyt.js fatal] unrecoverable error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should include source in formatted message', () => {
      fatal('unrecoverable error', { source: 'Bootstrap' });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Lyt.js fatal] unrecoverable error (at Bootstrap)',
      );
    });
  });

  // ─── setLevel / getLevel ────────────────────────────────
  describe('setLevel / getLevel', () => {
    it('should return the current level via getLevel', () => {
      expect(getLevel()).toBe('warn');
    });

    it('should change the current level via setLevel', () => {
      setLevel('error');
      expect(getLevel()).toBe('error');
    });

    it('should suppress warn when level is set to error', () => {
      setLevel('error');
      warn('should be suppressed');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should allow error when level is set to error', () => {
      setLevel('error');
      error('should be logged');
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    });

    it('should allow all levels when set to debug', () => {
      setLevel('debug');
      debug('debug msg');
      warn('warn msg');
      error('error msg');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2); // debug + warn
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // error
    });
  });

  // ─── once option ────────────────────────────────────────
  describe('once option', () => {
    it('should only log a message once with the same msg and source', () => {
      warn('dedup message', { once: true });
      warn('dedup message', { once: true });
      warn('dedup message', { once: true });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });

    it('should treat messages with different sources as distinct', () => {
      warn('dedup message', { once: true, source: 'A' });
      warn('dedup message', { once: true, source: 'B' });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });

    it('should log again after resetWarned', () => {
      warn('dedup message', { once: true });
      resetWarned();
      warn('dedup message', { once: true });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });
  });

  // ─── setHandler ─────────────────────────────────────────
  describe('setHandler', () => {
    it('should use custom handler instead of console', () => {
      const handler = vi.fn();
      setHandler(handler);

      warn('custom handler test');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);

      const entry: LogEntry = handler.mock.calls[0][0];
      expect(entry.level).toBe('warn');
      expect(entry.msg).toBe('custom handler test');
      expect(entry.timestamp).toBeTypeOf('number');
    });

    it('should pass source to custom handler', () => {
      const handler = vi.fn();
      setHandler(handler);

      error('error with source', { source: 'TestModule' });
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      const entry: LogEntry = handler.mock.calls[0][0];
      expect(entry.source).toBe('TestModule');
    });

    it('should restore default handler when set to null', () => {
      const handler = vi.fn();
      setHandler(handler);
      warn('via custom');
      expect(handler).toHaveBeenCalledTimes(1);

      setHandler(null);
      warn('via default');
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ─── resetWarned ────────────────────────────────────────
  describe('resetWarned', () => {
    it('should clear the warned set so once messages can log again', () => {
      warn('reset test', { once: true });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);

      warn('reset test', { once: true });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1); // still 1

      resetWarned();

      warn('reset test', { once: true });
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2); // now 2
    });
  });

  // ─── default handler formatting ─────────────────────────
  describe('default handler formatting', () => {
    it('should format warn messages correctly', () => {
      warn('test warn');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Lyt.js warn] test warn');
    });

    it('should format error messages correctly', () => {
      error('test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[Lyt.js error] test error');
    });

    it('should format messages with source correctly', () => {
      warn('test', { source: 'ComponentA' });
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Lyt.js warn] test (at ComponentA)');
    });

    it('should not include source parenthesis when source is not provided', () => {
      warn('test');
      const msg = consoleWarnSpy.mock.calls[0][0];
      expect(msg).not.toContain('(at');
    });
  });

  // ─── createWarnContext ───────────────────────────────────
  describe('createWarnContext', () => {
    it('should create an independent warning context', () => {
      const ctx1 = createWarnContext();
      const ctx2 = createWarnContext();

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      ctx1.setHandler(handler1);
      ctx2.setHandler(handler2);

      ctx1.warn('ctx1 message');
      ctx2.warn('ctx2 message');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
      expect(handler1.mock.calls[0][0].msg).toBe('ctx1 message');
      expect(handler2.mock.calls[0][0].msg).toBe('ctx2 message');
    });

    it('should have independent level setting', () => {
      const ctx1 = createWarnContext();
      const ctx2 = createWarnContext();

      ctx1.setLevel('debug');
      ctx2.setLevel('error');

      expect(ctx1.getLevel()).toBe('debug');
      expect(ctx2.getLevel()).toBe('error');
    });

    it('should have independent once tracking', () => {
      const ctx1 = createWarnContext();
      const ctx2 = createWarnContext();

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      ctx1.setHandler(handler1);
      ctx2.setHandler(handler2);

      ctx1.warn('duplicate', { once: true });
      ctx1.warn('duplicate', { once: true });
      ctx2.warn('duplicate', { once: true });
      ctx2.warn('duplicate', { once: true });

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should reset warned messages independently', () => {
      const ctx = createWarnContext();
      const handler = vi.fn();
      ctx.setHandler(handler);

      ctx.warn('test', { once: true });
      ctx.warn('test', { once: true });
      expect(handler).toHaveBeenCalledTimes(1);

      ctx.resetWarned();
      ctx.warn('test', { once: true });
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should support all log levels in context', () => {
      const ctx = createWarnContext();
      const handler = vi.fn();
      ctx.setHandler(handler);
      ctx.setLevel('debug');

      ctx.debug('debug msg');
      ctx.warn('warn msg');
      ctx.error('error msg');
      ctx.fatal('fatal msg');

      expect(handler).toHaveBeenCalledTimes(4);
      expect(handler.mock.calls[0][0].level).toBe('debug');
      expect(handler.mock.calls[1][0].level).toBe('warn');
      expect(handler.mock.calls[2][0].level).toBe('error');
      expect(handler.mock.calls[3][0].level).toBe('fatal');
    });

    it('should call process.exit on fatal in context (Node.js)', () => {
      const ctx = createWarnContext();
      ctx.fatal('fatal error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
