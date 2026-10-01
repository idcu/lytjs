/**
 * common/error 覆盖率电池（Task C）：补齐未覆盖分支
 *   - warnOnce 的 FIFO 淘汰分支（需 >= ERROR_MAX_WARNED_MESSAGES=1000 条）
 *   - error() 生产模式分支
 *   - formatError 的 string / code=0 分支
 *   - printFormattedError 的 location / suggestion 分支
 *   - createEnhancedError 全选项 / 无选项 / 非 Error cause
 *   - safeExecWithRecovery 全矩阵（成功 / onError / onRecover 命中 / 未命中 / 重试 busy-wait）
 *   - safeExecWithRecoveryAsync 全矩阵
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ErrorCategory,
  getCategory,
  LytError,
  formatError,
  printFormattedError,
  setDevMode,
  error,
  warnOnce,
  resetWarnedMessages,
  createEnhancedError,
  safeExecWithRecovery,
  safeExecWithRecoveryAsync,
  type SourceLocation,
} from '../src/index';

const loc: SourceLocation = {
  start: { line: 3, column: 5, offset: 10 },
  end: { line: 3, column: 20, offset: 25 },
  source: 'foo.ts',
};

let warnSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetWarnedMessages();
  setDevMode(true);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  errSpy.mockRestore();
  setDevMode(true);
  resetWarnedMessages();
});

describe('common-error battery: warnOnce FIFO eviction', () => {
  it('evicts oldest when reaching the size cap', () => {
    // 写满并超过上限，触发 `warnedMessages.size >= MAX` 分支与 FIFO 删除
    for (let i = 0; i < 1005; i++) {
      warnOnce(`msg-${i}`);
    }
    expect(warnSpy.mock.calls.length).toBe(1005);
    // 重复已淘汰的最早消息应能再次输出
    const before = warnSpy.mock.calls.length;
    warnOnce('msg-0');
    expect(warnSpy.mock.calls.length).toBe(before + 1);
    // 重复最近的应被抑制
    const before2 = warnSpy.mock.calls.length;
    warnOnce('msg-1004');
    expect(warnSpy.mock.calls.length).toBe(before2);
  });

  it('suppresses duplicates without eviction', () => {
    warnOnce('dup');
    warnOnce('dup');
    expect(warnSpy.mock.calls.length).toBe(1);
  });
});

describe('common-error battery: prod-mode branches', () => {
  it('error() uses prod format when dev mode off', () => {
    setDevMode(false);
    error('boom');
    expect(errSpy).toHaveBeenCalledWith('[LytJS]: boom');
    setDevMode(true);
    error('boom2');
    expect(errSpy).toHaveBeenCalledWith(
      '[LytJS] Error: boom2\n  (dev mode - see stack trace above for details)',
    );
  });

  it('warn() is silent in prod mode', () => {
    setDevMode(false);
    warnOnce('x');
    expect(warnSpy).not.toHaveBeenCalled();
  });
});

describe('common-error battery: formatError variants', () => {
  it('formats a plain string (code 0 → title "Error")', () => {
    const f = formatError('plain failure');
    expect(f.title).toBe('Error');
    expect(f.code).toBe(0);
    expect(f.message).toBe('plain failure');
    expect(f.stack).toBeUndefined();
    expect(f.location).toBeUndefined();
  });

  it('formats a LytError with location + suggestion', () => {
    const e = new LytError(1001, 'bad syntax', loc);
    const f = formatError(e);
    expect(f.code).toBe(1001);
    expect(f.category).toBe('Compiler');
    expect(f.location).toBe('line 3, column 5');
    expect(f.stack).toBeDefined();
  });

  it('printFormattedError prints location and suggestion', () => {
    const e = new LytError(1001, 'bad syntax', loc);
    printFormattedError(e);
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  it('printFormattedError handles Error without loc/suggestion', () => {
    printFormattedError(new Error('generic'));
    expect(errSpy).toHaveBeenCalledTimes(1);
  });

  it('getCategory boundary values', () => {
    expect(getCategory(2000)).toBe(ErrorCategory.RUNTIME);
    expect(getCategory(3500)).toBe(ErrorCategory.RENDERER);
    expect(getCategory(4500)).toBe(ErrorCategory.COMPONENT);
    expect(getCategory(9999)).toBe(ErrorCategory.RUNTIME);
  });
});

describe('common-error battery: createEnhancedError', () => {
  it('creates error with no options', () => {
    const e = createEnhancedError('plain');
    expect(e.message).toBe('plain');
    expect(e.code).toBeUndefined();
    expect(e.context).toBeUndefined();
    expect(e.recoverable).toBeUndefined();
    expect(e.recoverySuggestion).toBeUndefined();
  });

  it('creates error with all options', () => {
    const cause = new Error('cause');
    const e = createEnhancedError('rich', {
      code: 42,
      cause,
      context: { a: 1 },
      recoverable: true,
      recoverySuggestion: 'do X',
    });
    expect(e.code).toBe(42);
    expect(e.context).toEqual({ a: 1 });
    expect(e.recoverable).toBe(true);
    expect(e.recoverySuggestion).toBe('do X');
    expect((e as Error & { cause?: unknown }).cause).toBe(cause);
  });
});

describe('common-error battery: safeExecWithRecovery', () => {
  it('returns result on success', () => {
    expect(safeExecWithRecovery(() => 7, { defaultValue: 0 })).toBe(7);
  });

  it('returns default and calls onError on failure', () => {
    const onError = vi.fn();
    const r = safeExecWithRecovery(
      () => {
        throw new Error('fail');
      },
      { defaultValue: -1, onError, context: 'op' },
    );
    expect(r).toBe(-1);
    expect(onError).toHaveBeenCalled();
  });

  it('returns recovered value when onRecover yields one', () => {
    const r = safeExecWithRecovery(
      () => {
        throw new Error('fail');
      },
      {
        defaultValue: -1,
        maxRetries: 2,
        onRecover: () => 99,
      },
    );
    expect(r).toBe(99);
  });

  it('falls through when onRecover returns undefined', () => {
    const r = safeExecWithRecovery(
      () => {
        throw 'string-throw';
      },
      {
        defaultValue: -1,
        maxRetries: 1,
        retryDelay: 1,
        onRecover: () => undefined,
      },
    );
    expect(r).toBe(-1);
  });

  it('handles non-Error throw with no callbacks and no retries', () => {
    const r = safeExecWithRecovery(
      () => {
        throw 42;
      },
      { defaultValue: 'd' },
    );
    expect(r).toBe('d');
  });
});

describe('common-error battery: safeExecWithRecoveryAsync', () => {
  it('returns result on success', async () => {
    expect(await safeExecWithRecoveryAsync(async () => 'ok', { defaultValue: 'no' })).toBe('ok');
  });

  it('recovers async value', async () => {
    const r = await safeExecWithRecoveryAsync(
      async () => {
        throw new Error('async fail');
      },
      {
        defaultValue: 'no',
        maxRetries: 2,
        retryDelay: 1,
        onError: async () => {},
        onRecover: async () => 'recovered',
        context: 'async-op',
      },
    );
    expect(r).toBe('recovered');
  });

  it('returns default when recovery undefined', async () => {
    const r = await safeExecWithRecoveryAsync(
      async () => {
        throw 'x';
      },
      {
        defaultValue: 'no',
        maxRetries: 1,
        onRecover: async () => undefined,
      },
    );
    expect(r).toBe('no');
  });

  it('returns default when fn is sync-throwing', async () => {
    const r = await safeExecWithRecoveryAsync(
      () => {
        throw new Error('sync');
      },
      { defaultValue: 'fallback' },
    );
    expect(r).toBe('fallback');
  });
});
