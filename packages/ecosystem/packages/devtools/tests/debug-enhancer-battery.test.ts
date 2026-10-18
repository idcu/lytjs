// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/devtools` 的**调试增强**（`src/debugEnhancer.ts`，445 行、20 个导出）
 *
 * ## 为什么要有这条
 *
 * 它是 `@lytjs/devtools` 的公开导出面（日志分级 / 过滤 / 环形缓冲 / 断点 / 性能装饰器 /
 * 状态检查点 / 全局工具），而同包 `tests/index.test.ts`（786 行）**一个符号都没引用**。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initDebugEnhancer,
  log,
  debug,
  info,
  warn,
  error,
  trace,
  getLogs,
  clearLogs,
  onLog,
  onClear,
  createDebugger,
  measurePerformance,
  measureAsyncPerformance,
  createCheckpoint,
  getCheckpoints,
  compareCheckpoints,
  clearCheckpoints,
  installGlobalDebugTools,
  serializeDebugInfo,
} from '../src/debugEnhancer';
import type { LogEntry } from '../src/debugEnhancer';

let consoleSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  clearLogs();
  clearCheckpoints();
  initDebugEnhancer({ consoleOutput: false, maxLogs: 1000 });
  consoleSpies = [
    vi.spyOn(console, 'log').mockImplementation(() => {}),
    vi.spyOn(console, 'warn').mockImplementation(() => {}),
    vi.spyOn(console, 'error').mockImplementation(() => {}),
  ];
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ==================== 日志记录 ====================

describe('log / 便捷方法', () => {
  it('记录后可按顺序读回，字段齐全', () => {
    const e = log('info', 'cat', 'hello', { k: 1 });

    expect(e.id).toMatch(/^log_/);
    expect(e.timestamp).toBeGreaterThan(0);
    expect(e.level).toBe('info');
    expect(e.category).toBe('cat');
    expect(e.message).toBe('hello');
    expect(e.metadata).toEqual({ k: 1 });
    expect(getLogs()).toHaveLength(1);
  });

  it('五个便捷方法各自写入对应 level', () => {
    debug('c', 'd');
    info('c', 'i');
    warn('c', 'w');
    error('c', 'e');
    trace('c', 't');

    expect(getLogs().map((l) => l.level)).toEqual(['debug', 'info', 'warn', 'error', 'trace']);
  });

  it('★ 开关 enabledLevels：被禁用的 level 不写入、也不触发订阅', () => {
    initDebugEnhancer({ consoleOutput: false, enabledLevels: ['error'] });
    const cb = vi.fn();
    onLog(cb);

    debug('c', 'dropped');
    error('c', 'kept');

    expect(getLogs().map((l) => l.level)).toEqual(['error']);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('★ 开关 maxLogs：超出后丢弃最旧的', () => {
    initDebugEnhancer({ consoleOutput: false, maxLogs: 3 });

    for (let i = 1; i <= 5; i++) info('c', `m${i}`);

    expect(getLogs().map((l) => l.message)).toEqual(['m3', 'm4', 'm5']);
  });

  it('★ 开关 consoleOutput：开时输出到对应 console 方法，关时不输出', () => {
    initDebugEnhancer({ consoleOutput: true });
    error('c', 'boom');
    warn('c', 'careful');
    info('c', 'fyi');
    expect(consoleSpies[2]).toHaveBeenCalled();
    expect(consoleSpies[1]).toHaveBeenCalled();
    expect(consoleSpies[0]).toHaveBeenCalled();

    vi.clearAllMocks();
    initDebugEnhancer({ consoleOutput: false });
    error('c', 'silent');
    expect(consoleSpies[2]).not.toHaveBeenCalled();
  });

  it('★ 开关 captureStackTraces：开时记录 stack，关时为 undefined', () => {
    initDebugEnhancer({ consoleOutput: false, captureStackTraces: true });
    info('c', 'with stack');
    expect(getLogs()[0]!.stack).toBeTruthy();

    clearLogs();
    initDebugEnhancer({ consoleOutput: false, captureStackTraces: false });
    info('c', 'no stack');
    expect(getLogs()[0]!.stack).toBeUndefined();
  });
});

// ==================== 查询 ====================

describe('getLogs', () => {
  const seed = (): void => {
    debug('a', 'd1');
    info('a', 'i1');
    error('b', 'e1');
    info('b', 'i2');
  };

  it('按 level 过滤', () => {
    seed();
    expect(getLogs({ level: 'info' }).map((l) => l.message)).toEqual(['i1', 'i2']);
  });

  it('按 category 过滤', () => {
    seed();
    expect(getLogs({ category: 'b' }).map((l) => l.message)).toEqual(['e1', 'i2']);
  });

  it('limit 取**最后** N 条', () => {
    seed();
    expect(getLogs({ limit: 2 }).map((l) => l.message)).toEqual(['e1', 'i2']);
  });

  it('level 与 category 同时生效（且关系）', () => {
    seed();
    expect(getLogs({ level: 'info', category: 'b' }).map((l) => l.message)).toEqual(['i2']);
  });

  it('返回的是快照：改它不影响内部存储', () => {
    seed();
    getLogs().push({ id: 'x' } as LogEntry);
    expect(getLogs()).toHaveLength(4);
  });
});

// ==================== 事件 ====================

describe('onLog / onClear / clearLogs', () => {
  it('onLog 收到每条日志，取消后不再收到', () => {
    const cb = vi.fn();
    const off = onLog(cb);

    info('c', 'a');
    expect(cb).toHaveBeenCalledTimes(1);

    off();
    info('c', 'b');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('clearLogs 清空并触发 onClear', () => {
    const cb = vi.fn();
    onClear(cb);
    info('c', 'a');

    clearLogs();

    expect(getLogs()).toHaveLength(0);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

// ==================== 断点 ====================

describe('createDebugger', () => {
  it('条件满足时记录一条 debug 日志（且可带 metadata）', () => {
    const bp = createDebugger('myCat');

    bp({ extra: 1 });

    const logs = getLogs({ level: 'debug' });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.category).toBe('myCat');
    expect(logs[0]!.metadata).toEqual({ extra: 1 });
  });

  it('condition 返回 false 时不记录', () => {
    const bp = createDebugger('c', () => false);

    bp();

    expect(getLogs()).toHaveLength(0);
  });
});

// ==================== 性能装饰器 ====================

describe('measurePerformance', () => {
  it('透传返回值并记录耗时', () => {
    const wrapped = measurePerformance('calc', 'perf')((a: number, b: number) => a + b) as (
      a: number,
      b: number,
    ) => number;

    expect(wrapped(2, 3)).toBe(5);
    const logs = getLogs({ category: 'perf' });
    expect(logs).toHaveLength(1);
    expect(logs[0]!.message).toContain('calc');
    expect(typeof (logs[0]!.metadata as { duration: number }).duration).toBe('number');
  });

  it('抛错时记录 error 日志并**原样重抛**', () => {
    const boom = new Error('boom');
    const wrapped = measurePerformance('bad')(() => {
      throw boom;
    }) as () => unknown;

    expect(() => wrapped()).toThrow(boom);
    expect(getLogs({ level: 'error' })).toHaveLength(1);
  });

  it('★ 装饰**对象方法**时必须保留 `this`', () => {
    const obj = {
      base: 10,
      add(n: number) {
        return (this as { base: number }).base + n;
      },
    };
    const wrapped = measurePerformance('add')(obj.add) as (n: number) => number;

    // 修复前：`fn(...args)` 丢掉了 receiver ⇒ `this` 为 undefined ⇒ 抛 TypeError
    expect(wrapped.call(obj, 5)).toBe(15);
  });
});

describe('measureAsyncPerformance', () => {
  it('成功时透传结果并记录', async () => {
    const r = await measureAsyncPerformance('task', async () => 42);

    expect(r).toBe(42);
    expect(getLogs({ category: 'performance' })).toHaveLength(1);
  });

  it('失败时记录 error 并重抛', async () => {
    const boom = new Error('x');

    await expect(
      measureAsyncPerformance('task', async () => {
        throw boom;
      }),
    ).rejects.toBe(boom);
    expect(getLogs({ level: 'error' })).toHaveLength(1);
  });
});

// ==================== 检查点 ====================

describe('checkpoints', () => {
  it('创建后可按 id 找回，且 state 是**快照**（后续改动不影响）', () => {
    const state = { n: 1 };
    const id = createCheckpoint('cp1', state);

    state.n = 99;

    const cp = getCheckpoints().find((c) => c.id === id)!;
    expect(cp.name).toBe('cp1');
    expect(cp.state.n).toBe(1);
  });

  it('★ 状态含循环引用时不应抛（devtools 检查的组件状态常带 parent 引用）', () => {
    const state: Record<string, unknown> = { a: 1 };
    state.self = state;

    expect(() => createCheckpoint('cyclic', state)).not.toThrow();
    expect(getCheckpoints()).toHaveLength(1);
  });

  it('compareCheckpoints 识别 added / removed / changed', () => {
    const id1 = createCheckpoint('a', { keep: 1, drop: 2, change: 3 });
    const id2 = createCheckpoint('b', { keep: 1, add: 4, change: 9 });

    expect(compareCheckpoints(id1, id2)).toEqual({
      added: ['add'],
      removed: ['drop'],
      changed: ['change'],
    });
  });

  it('compareCheckpoints 对未知 id 返回空差异', () => {
    expect(compareCheckpoints('nope', 'nope2')).toEqual({ added: [], removed: [], changed: [] });
  });

  it('★ 比较**含循环引用**的检查点也不应抛（存得下就要比得了）', () => {
    const s1: Record<string, unknown> = { a: 1 };
    s1.self = s1;
    const s2: Record<string, unknown> = { a: 2 };
    s2.self = s2;

    const id1 = createCheckpoint('c1', s1);
    const id2 = createCheckpoint('c2', s2);

    expect(() => compareCheckpoints(id1, id2)).not.toThrow();
    expect(compareCheckpoints(id1, id2).changed).toContain('a');
  });

  it('clearCheckpoints 清空', () => {
    createCheckpoint('a', { n: 1 });
    clearCheckpoints();

    expect(getCheckpoints()).toHaveLength(0);
  });
});

// ==================== 全局工具与序列化 ====================

describe('installGlobalDebugTools / serializeDebugInfo', () => {
  it('installGlobalDebugTools 挂到 window.__lytjsDebug 并含关键函数', () => {
    installGlobalDebugTools();

    const g = (window as unknown as Record<string, Record<string, unknown>>).__lytjsDebug;
    expect(g).toBeDefined();
    expect(typeof g.log).toBe('function');
    expect(typeof g.getLogs).toBe('function');
    expect(typeof g.createCheckpoint).toBe('function');
  });

  it('serializeDebugInfo 含日志与检查点摘要', () => {
    info('c', 'hello');
    createCheckpoint('cp', { n: 1 }); // 注意：它自身也会写一条 debug 日志

    const text = serializeDebugInfo();
    expect(text).toContain('Log records');
    expect(text).toContain('hello');
    expect(text).toContain('cp');
  });
});
