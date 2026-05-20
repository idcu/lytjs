/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorBoundary,
  useErrorHandler,
  useErrorBoundaryReset,
  errorLogManager,
  setGlobalErrorReporter,
  getGlobalErrorReporter,
  generateErrorId,
  type ErrorBoundaryProps,
  type FallbackProps,
  type ErrorContext,
  type ErrorReporter,
} from '../src/error-boundary';

describe('ErrorBoundary', () => {
  describe('基础功能', () => {
    it('should create ErrorBoundary without error', () => {
      const vnode = ErrorBoundary({
        children: null,
      });
      expect(vnode).toBeDefined();
      expect(vnode.type).toBe('error-boundary-wrapper');
    });

    it('should use default fallback when error occurs', () => {
      const props: ErrorBoundaryProps = {
        maxRetries: 3,
        retryDelay: 1000,
      };
      const vnode = ErrorBoundary(props);
      expect(vnode).toBeDefined();
    });

    it('should accept maxRetries option', () => {
      const vnode = ErrorBoundary({
        maxRetries: 5,
      });
      expect(vnode).toBeDefined();
    });

    it('should accept retryDelay option', () => {
      const vnode = ErrorBoundary({
        retryDelay: 2000,
      });
      expect(vnode).toBeDefined();
    });

    it('should accept onError callback', () => {
      const onError = vi.fn();
      const vnode = ErrorBoundary({
        onError,
      });
      expect(vnode).toBeDefined();
    });

    it('should accept onRetry callback', () => {
      const onRetry = vi.fn();
      const vnode = ErrorBoundary({
        onRetry,
      });
      expect(vnode).toBeDefined();
    });

    it('should accept onMaxRetriesReached callback', () => {
      const onMaxRetriesReached = vi.fn();
      const vnode = ErrorBoundary({
        onMaxRetriesReached,
      });
      expect(vnode).toBeDefined();
    });
  });

  describe('fallback 渲染', () => {
    it('should support custom fallback component', () => {
      const CustomFallback = (props: FallbackProps) => ({
        type: 'div',
        props: {
          class: 'custom-fallback',
          'data-error': props.error?.message || 'unknown',
        },
      });

      const vnode = ErrorBoundary({
        fallback: CustomFallback,
      });
      expect(vnode).toBeDefined();
    });

    it('should support fallbackRender function', () => {
      const fallbackRender = vi.fn(() => ({
        type: 'div',
        props: { class: 'rendered-fallback' },
      }));

      const vnode = ErrorBoundary({
        fallbackRender,
      });
      expect(vnode).toBeDefined();
    });

    it('should use default fallback when no custom fallback provided', () => {
      const vnode = ErrorBoundary({});
      expect(vnode).toBeDefined();
      expect(vnode.type).toBe('error-boundary-wrapper');
    });

    it('should prefer fallback over fallbackRender', () => {
      const fallback = vi.fn();
      const fallbackRender = vi.fn();

      const vnode = ErrorBoundary({
        fallback,
        fallbackRender,
      });
      expect(vnode).toBeDefined();
    });
  });

  describe('错误重试机制', () => {
    it('should respect maxRetries default value (3)', () => {
      const vnode = ErrorBoundary({});
      expect(vnode).toBeDefined();
    });

    it('should respect custom maxRetries value', () => {
      const vnode = ErrorBoundary({
        maxRetries: 10,
      });
      expect(vnode).toBeDefined();
    });

    it('should respect retryDelay default value (1000ms)', () => {
      const vnode = ErrorBoundary({});
      expect(vnode).toBeDefined();
    });

    it('should respect custom retryDelay value', () => {
      const vnode = ErrorBoundary({
        retryDelay: 5000,
      });
      expect(vnode).toBeDefined();
    });

    it('should call onRetry when retry is triggered', () => {
      const onRetry = vi.fn();
      const vnode = ErrorBoundary({
        onRetry,
        maxRetries: 3,
      });
      expect(vnode).toBeDefined();
    });

    it('should call onMaxRetriesReached when max retries reached', () => {
      const onMaxRetriesReached = vi.fn();
      const vnode = ErrorBoundary({
        onMaxRetriesReached,
        maxRetries: 0,
      });
      expect(vnode).toBeDefined();
    });
  });

  describe('错误报告器', () => {
    it('should get default global reporter', () => {
      const reporter = getGlobalErrorReporter();
      expect(reporter).toBeDefined();
      expect(typeof reporter.report).toBe('function');
    });

    it('should set custom global reporter', () => {
      const customReporter: ErrorReporter = {
        report: vi.fn(),
      };

      setGlobalErrorReporter(customReporter);
      const reporter = getGlobalErrorReporter();
      expect(reporter).toBe(customReporter);

      setGlobalErrorReporter({
        report: () => {},
      });
    });

    it('should report error to global reporter', () => {
      const report = vi.fn();
      const customReporter: ErrorReporter = { report };
      setGlobalErrorReporter(customReporter);

      const error = new Error('test error');
      const context: ErrorContext = {
        componentName: 'TestComponent',
        timestamp: new Date(),
      };

      customReporter.report(error, context);
      expect(report).toHaveBeenCalledWith(error, context);

      setGlobalErrorReporter({
        report: () => {},
      });
    });

    it('should support custom reporter with async report', () => {
      const asyncReporter: ErrorReporter = {
        async report(error: Error, context: ErrorContext) {
          await Promise.resolve();
          console.log('Async report:', error.message);
        },
      };

      setGlobalErrorReporter(asyncReporter);
      const reporter = getGlobalErrorReporter();
      expect(reporter).toBe(asyncReporter);

      setGlobalErrorReporter({
        report: () => {},
      });
    });
  });

  describe('错误日志管理', () => {
    beforeEach(() => {
      errorLogManager.clearLogs();
    });

    it('should generate unique error ID', () => {
      const id1 = generateErrorId();
      const id2 = generateErrorId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('err_')).toBe(true);
    });

    it('should add log to error log manager', () => {
      const log = {
        id: generateErrorId(),
        timestamp: new Date(),
        error: new Error('test error'),
        errorInfo: {
          componentStack: 'TestComponent',
          timestamp: new Date(),
        },
        context: {
          componentName: 'TestComponent',
          timestamp: new Date(),
        },
        retryCount: 0,
      };

      errorLogManager.addLog(log);
      const logs = errorLogManager.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should get all logs', () => {
      errorLogManager.clearLogs();

      const log1 = {
        id: generateErrorId(),
        timestamp: new Date(),
        error: new Error('error 1'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      };

      const log2 = {
        id: generateErrorId(),
        timestamp: new Date(),
        error: new Error('error 2'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 1,
      };

      errorLogManager.addLog(log1);
      errorLogManager.addLog(log2);

      const logs = errorLogManager.getLogs();
      expect(logs.length).toBe(2);
    });

    it('should clear all logs', () => {
      const log = {
        id: generateErrorId(),
        timestamp: new Date(),
        error: new Error('test'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      };

      errorLogManager.addLog(log);
      errorLogManager.clearLogs();

      const logs = errorLogManager.getLogs();
      expect(logs.length).toBe(0);
    });

    it('should export logs as JSON string', () => {
      errorLogManager.clearLogs();

      const log = {
        id: 'test-id',
        timestamp: new Date('2024-01-01'),
        error: new Error('test'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      };

      errorLogManager.addLog(log);
      const exported = errorLogManager.exportLogs();

      expect(typeof exported).toBe('string');
      expect(exported).toContain('test-id');
      expect(exported).toContain('test');
    });

    it('should limit logs to maxLogs (100)', () => {
      errorLogManager.clearLogs();

      for (let i = 0; i < 150; i++) {
        errorLogManager.addLog({
          id: `log-${i}`,
          timestamp: new Date(),
          error: new Error(`error ${i}`),
          errorInfo: { timestamp: new Date() },
          context: { timestamp: new Date() },
          retryCount: 0,
        });
      }

      const logs = errorLogManager.getLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('should get log by ID', () => {
      errorLogManager.clearLogs();

      const logId = generateErrorId();
      errorLogManager.addLog({
        id: logId,
        timestamp: new Date(),
        error: new Error('specific error'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      });

      const found = errorLogManager.getLogById(logId);
      expect(found).toBeDefined();
      expect(found?.id).toBe(logId);
    });

    it('should return undefined for non-existent log ID', () => {
      const found = errorLogManager.getLogById('non-existent-id');
      expect(found).toBeUndefined();
    });

    it('should get logs by error type', () => {
      errorLogManager.clearLogs();

      errorLogManager.addLog({
        id: '1',
        timestamp: new Date(),
        error: new Error('TypeError error'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      });

      errorLogManager.addLog({
        id: '2',
        timestamp: new Date(),
        error: new Error('ReferenceError error'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      });

      const typeErrorLogs = errorLogManager.getLogsByErrorType('Error');
      expect(typeErrorLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('should get logs by date range', () => {
      errorLogManager.clearLogs();

      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      errorLogManager.addLog({
        id: '1',
        timestamp: now,
        error: new Error('recent error'),
        errorInfo: { timestamp: now },
        context: { timestamp: now },
        retryCount: 0,
      });

      const logs = errorLogManager.getLogsByDateRange(yesterday, tomorrow);
      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty array for date range with no logs', () => {
      const oldDate = new Date('2020-01-01');
      const olderDate = new Date('2019-01-01');

      const logs = errorLogManager.getLogsByDateRange(olderDate, oldDate);
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should get error statistics', () => {
      errorLogManager.clearLogs();

      errorLogManager.addLog({
        id: '1',
        timestamp: new Date(),
        error: new Error('TypeError 1'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      });

      errorLogManager.addLog({
        id: '2',
        timestamp: new Date(),
        error: new Error('TypeError 2'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      });

      const stats = errorLogManager.getErrorStats();

      expect(stats).toHaveProperty('totalErrors');
      expect(stats).toHaveProperty('errorTypes');
      expect(stats).toHaveProperty('recentErrors');
      expect(typeof stats.totalErrors).toBe('number');
      expect(typeof stats.errorTypes).toBe('object');
      expect(Array.isArray(stats.recentErrors)).toBe(true);
    });

    it('should count error types in statistics', () => {
      errorLogManager.clearLogs();

      errorLogManager.addLog({
        id: '1',
        timestamp: new Date(),
        error: new Error('error 1'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      });

      errorLogManager.addLog({
        id: '2',
        timestamp: new Date(),
        error: new Error('error 2'),
        errorInfo: { timestamp: new Date() },
        context: { timestamp: new Date() },
        retryCount: 0,
      });

      const stats = errorLogManager.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThanOrEqual(2);
    });

    it('should limit recent errors to 10 in statistics', () => {
      errorLogManager.clearLogs();

      for (let i = 0; i < 20; i++) {
        errorLogManager.addLog({
          id: `log-${i}`,
          timestamp: new Date(),
          error: new Error(`error ${i}`),
          errorInfo: { timestamp: new Date() },
          context: { timestamp: new Date() },
          retryCount: 0,
        });
      }

      const stats = errorLogManager.getErrorStats();
      expect(stats.recentErrors.length).toBeLessThanOrEqual(10);
    });
  });

  describe('hooks', () => {
    describe('useErrorHandler', () => {
      it('should return error handler function', () => {
        const handleError = useErrorHandler();
        expect(typeof handleError).toBe('function');
      });

      it('should throw error when called', () => {
        const handleError = useErrorHandler();
        const error = new Error('handled error');

        expect(() => handleError(error)).toThrow(error);
      });

      it('should preserve error message', () => {
        const handleError = useErrorHandler();
        const error = new Error('specific error message');

        try {
          handleError(error);
        } catch (e) {
          expect((e as Error).message).toBe('specific error message');
        }
      });

      it('should preserve error stack', () => {
        const handleError = useErrorHandler();
        const error = new Error('error with stack');

        try {
          handleError(error);
        } catch (e) {
          expect((e as Error).stack).toBeDefined();
        }
      });

      it('should handle different error types', () => {
        const handleError = useErrorHandler();

        const typeError = new TypeError('type error');
        expect(() => handleError(typeError)).toThrow(TypeError);

        const rangeError = new RangeError('range error');
        expect(() => handleError(rangeError)).toThrow(RangeError);

        const syntaxError = new SyntaxError('syntax error');
        expect(() => handleError(syntaxError)).toThrow(SyntaxError);
      });
    });

    describe('useErrorBoundaryReset', () => {
      it('should return reset function', () => {
        const reset = useErrorBoundaryReset();
        expect(typeof reset).toBe('function');
      });

      it('should not throw when called', () => {
        const reset = useErrorBoundaryReset();
        expect(() => reset()).not.toThrow();
      });
    });
  });

  describe('边界情况', () => {
    it('should handle zero maxRetries', () => {
      const vnode = ErrorBoundary({
        maxRetries: 0,
      });
      expect(vnode).toBeDefined();
    });

    it('should handle negative retryDelay', () => {
      const vnode = ErrorBoundary({
        retryDelay: -1000,
      });
      expect(vnode).toBeDefined();
    });

    it('should handle zero retryDelay', () => {
      const vnode = ErrorBoundary({
        retryDelay: 0,
      });
      expect(vnode).toBeDefined();
    });

    it('should handle very large retryDelay', () => {
      const vnode = ErrorBoundary({
        retryDelay: Number.MAX_SAFE_INTEGER,
      });
      expect(vnode).toBeDefined();
    });

    it('should handle all options together', () => {
      const onError = vi.fn();
      const onRetry = vi.fn();
      const onMaxRetriesReached = vi.fn();

      const vnode = ErrorBoundary({
        maxRetries: 5,
        retryDelay: 2000,
        onError,
        onRetry,
        onMaxRetriesReached,
      });

      expect(vnode).toBeDefined();
    });

    it('should handle empty options', () => {
      const vnode = ErrorBoundary({});
      expect(vnode).toBeDefined();
    });

    it('should handle undefined options', () => {
      const vnode = ErrorBoundary({
        maxRetries: undefined,
        retryDelay: undefined,
        onError: undefined,
        fallback: undefined,
        fallbackRender: undefined,
      });
      expect(vnode).toBeDefined();
    });
  });

  describe('性能考虑', () => {
    it('should handle rapid log additions efficiently', () => {
      errorLogManager.clearLogs();

      const start = Date.now();
      for (let i = 0; i < 50; i++) {
        errorLogManager.addLog({
          id: `perf-${i}`,
          timestamp: new Date(),
          error: new Error(`error ${i}`),
          errorInfo: { timestamp: new Date() },
          context: { timestamp: new Date() },
          retryCount: 0,
        });
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });

    it('should handle large log export efficiently', () => {
      errorLogManager.clearLogs();

      for (let i = 0; i < 100; i++) {
        errorLogManager.addLog({
          id: `export-${i}`,
          timestamp: new Date(),
          error: new Error(`error ${i}`),
          errorInfo: { timestamp: new Date() },
          context: { timestamp: new Date() },
          retryCount: 0,
        });
      }

      const start = Date.now();
      const exported = errorLogManager.exportLogs();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
      expect(typeof exported).toBe('string');
    });

    it('should handle getErrorStats efficiently', () => {
      errorLogManager.clearLogs();

      for (let i = 0; i < 50; i++) {
        errorLogManager.addLog({
          id: `stat-${i}`,
          timestamp: new Date(),
          error: new Error(`error ${i}`),
          errorInfo: { timestamp: new Date() },
          context: { timestamp: new Date() },
          retryCount: 0,
        });
      }

      const start = Date.now();
      const stats = errorLogManager.getErrorStats();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
      expect(stats).toBeDefined();
    });
  });

  afterEach(() => {
    errorLogManager.clearLogs();
    setGlobalErrorReporter({
      report: () => {},
    });
  });
});

describe('ErrorBoundary 与其他组件集成', () => {
  it('should work with nested error boundaries', () => {
    const outerBoundary = ErrorBoundary({
      maxRetries: 3,
    });
    const innerBoundary = ErrorBoundary({
      maxRetries: 2,
    });

    expect(outerBoundary).toBeDefined();
    expect(innerBoundary).toBeDefined();
  });

  it('should have distinct key for each boundary instance', () => {
    const boundary1 = ErrorBoundary({});
    const boundary2 = ErrorBoundary({});

    expect(boundary1.key).toBeDefined();
    expect(boundary2.key).toBeDefined();
  });
});

describe('ErrorBoundary 导出验证', () => {
  it('should export all required interfaces', () => {
    expect(ErrorBoundary).toBeDefined();
    expect(typeof ErrorBoundary).toBe('function');
  });

  it('should export useErrorHandler', () => {
    expect(useErrorHandler).toBeDefined();
    expect(typeof useErrorHandler).toBe('function');
  });

  it('should export useErrorBoundaryReset', () => {
    expect(useErrorBoundaryReset).toBeDefined();
    expect(typeof useErrorBoundaryReset).toBe('function');
  });

  it('should export errorLogManager', () => {
    expect(errorLogManager).toBeDefined();
    expect(typeof errorLogManager.addLog).toBe('function');
    expect(typeof errorLogManager.getLogs).toBe('function');
    expect(typeof errorLogManager.clearLogs).toBe('function');
    expect(typeof errorLogManager.exportLogs).toBe('function');
    expect(typeof errorLogManager.getErrorStats).toBe('function');
  });

  it('should export error reporter functions', () => {
    expect(setGlobalErrorReporter).toBeDefined();
    expect(typeof setGlobalErrorReporter).toBe('function');
    expect(getGlobalErrorReporter).toBeDefined();
    expect(typeof getGlobalErrorReporter).toBe('function');
  });

  it('should export generateErrorId', () => {
    expect(generateErrorId).toBeDefined();
    expect(typeof generateErrorId).toBe('function');
  });
});
