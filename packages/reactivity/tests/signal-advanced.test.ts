 
import { describe, it, expect, vi } from 'vitest';
import { signal, computed, signalBatch, signalUntrack } from '../src/signal';
import { effect } from '../src/index';

describe('signalBatch', () => {
  it('batch 内多次 set 只触发一次通知', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => {
      s();
      fn();
    });
    expect(fn).toHaveBeenCalledTimes(1);

    signalBatch(() => {
      s.set(1);
      s.set(2);
      s.set(3);
    });

    // effect 应该只被触发一次（batch 结束后统一通知）
    expect(fn).toHaveBeenCalledTimes(2);
    expect(s()).toBe(3);
  });

  it('batch 嵌套应正确工作', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => {
      s();
      fn();
    });

    signalBatch(() => {
      s.set(1);
      signalBatch(() => {
        s.set(2);
      });
      s.set(3);
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(s()).toBe(3);
  });

  it('batch 内异常后通知仍应 flush', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => {
      s();
      fn();
    });

    try {
      signalBatch(() => {
        s.set(1);
        throw new Error('test');
      });
    } catch {
      // expected
    }

    // batch 的 finally 应该 flush 通知
    expect(fn).toHaveBeenCalledTimes(2);
    expect(s()).toBe(1);
  });
});

describe('signalUntrack', () => {
  it('untrack 内读取 signal 不建立依赖', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => {
      signalUntrack(() => {
        s(); // 不应建立依赖
      });
      fn();
    });

    expect(fn).toHaveBeenCalledTimes(1);
    s.set(1);
    // effect 不应被触发
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('untrack 嵌套应正确工作', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => {
      signalUntrack(() => {
        signalUntrack(() => {
          s(); // 仍然不建立依赖
        });
      });
      fn();
    });

    s.set(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('dispose', () => {
  it('dispose 后 set 不触发通知', () => {
    const s = signal(0);
    const fn = vi.fn();
    effect(() => {
      s();
      fn();
    });

    s.dispose();
    s.set(1);

    expect(fn).toHaveBeenCalledTimes(1); // 只有初始执行
  });

  it('dispose 后读取返回最后值', () => {
    const s = signal(42);
    s.dispose();
    expect(s()).toBe(42);
  });

  it('dispose 后 _subscribe 返回空函数', () => {
    const s = signal(0);
    s.dispose();
    const unsub = s._subscribe(() => {});
    expect(typeof unsub).toBe('function');
  });

  it('computed dispose 后依赖被清理', () => {
    const s = signal(1);
    const c = computed(() => s() * 2);
    expect(c()).toBe(2);

    c.dispose();
    s.set(10);
    // computed 已 dispose，不再追踪
    expect(c()).toBe(2); // 返回 dispose 前的缓存值
  });
});

describe('循环依赖检测', () => {
  it('computed 自引用应抛出错误', () => {
    const self = computed(() => self() + 1);
    expect(() => self()).toThrow('Circular dependency');
  });

  it('computed 互相引用应抛出错误', () => {
    // 使用类型断言避免 TypeScript 报错，变量需要先声明后赋值因为它们互相引用
    const a = computed(() => b() + 1);
    const b = computed(() => a() + 1);
    expect(() => a()).toThrow('Circular dependency');
  });
});

describe('错误恢复', () => {
  it('computed getter 抛出异常后 dirty 标记应正确', () => {
    let shouldThrow = true;
    const s = signal(1);
    const c = computed(() => {
      if (shouldThrow) throw new Error('compute error');
      return s() * 2;
    });

    expect(() => c()).toThrow('compute error');

    shouldThrow = false;
    // 恢复后应能正常计算
    expect(c()).toBe(2);
  });
});
