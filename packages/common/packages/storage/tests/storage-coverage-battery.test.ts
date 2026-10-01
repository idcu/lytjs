// @vitest-environment jsdom
/**
 * common/storage 覆盖率电池（Task C）：补齐可用性检测 / 反序列化失败 / 监听器错误 / 订阅与 storage 事件分支
 */
import { describe, it, expect, vi } from 'vitest';
import { parseJSON, isStorageAvailable, createStorage, createSessionStorage } from '../src/index';

describe('storage battery: parseJSON / isStorageAvailable', () => {
  it('parses valid and falls back on invalid', () => {
    expect(parseJSON('{"a":1}', {})).toEqual({ a: 1 });
    expect(parseJSON('not-json', { fallback: true })).toEqual({ fallback: true });
  });

  it('detects availability with and without explicit storage', () => {
    expect(isStorageAvailable()).toBe(true);
    expect(isStorageAvailable(window.localStorage)).toBe(true);
    const broken = {
      setItem() {
        throw new Error('quota');
      },
      removeItem() {},
      getItem() {
        return null;
      },
    } as unknown as Storage;
    expect(isStorageAvailable(broken)).toBe(false);
  });
});

describe('storage battery: createStorage adapter', () => {
  it('get default / set / remove / has / onChange', () => {
    const store = createStorage<{ n: number }>({ key: 'cov-store', default: { n: 0 } });
    expect(store.get()).toEqual({ n: 0 });
    store.set({ n: 5 });
    expect(store.get()).toEqual({ n: 5 });
    expect(store.has()).toBe(true);
    const seen: Array<{ n: number } | null> = [];
    const unsub = store.onChange((v) => seen.push(v));
    store.set({ n: 6 });
    store.remove();
    expect(seen.length).toBeGreaterThan(0);
    unsub();
    unsub(); // 幂等 unsubscribe（listeners 为空时不再 removeEventListener）
    expect(store.has()).toBe(false);
  });

  it('tolerates a throwing deserializer', () => {
    const store = createStorage<number>({
      key: 'cov-bad',
      default: -1,
      serializer: () => 'zzz',
      deserializer: () => {
        throw new Error('parse fail');
      },
    });
    expect(store.get()).toBe(-1);
  });

  it('returns default when the backing storage is unavailable', () => {
    // 显式传入 undefined 走 getStorage 的 window 分支已被上面覆盖；
    // 此处用一个「没有 window 语义」的 deserializer 抛错来覆盖 get 的 catch 分支已在上一用例；
    // 这里覆盖 has() 的 false 分支与 get() 的 raw === null 分支。
    const store = createStorage<number>({ key: 'cov-missing', default: 42 });
    store.remove();
    expect(store.get()).toBe(42);
    expect(store.has()).toBe(false);
  });

  it('ignores listener errors', () => {
    const store = createStorage<string>({ key: 'cov-listener', default: '' });
    store.onChange(() => {
      throw new Error('listener boom');
    });
    const ok = store.onChange(() => {});
    expect(() => store.set('x')).not.toThrow();
    ok();
  });

  it('supports custom storage that throws on set/remove/get/has', () => {
    const throwing = {
      getItem: () => {
        throw new Error('nope');
      },
      setItem: () => {
        throw new Error('nope');
      },
      removeItem: () => {
        throw new Error('nope');
      },
    } as unknown as Storage;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createStorage<number>({ key: 'cov-throw', storage: throwing, default: 7 });
    store.set(1);
    store.remove();
    expect(store.get()).toBe(7); // get 的 catch 分支
    expect(store.has()).toBe(false); // has 的 catch 分支
    warnSpy.mockRestore();
  });

  it('reacts to window storage events for the matching key only', () => {
    const store = createStorage<number>({ key: 'cov-evt', default: 0 });
    const seen: Array<number | null> = [];
    const unsub = store.onChange((v) => seen.push(v));

    // 不匹配的 key → 不通知
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: '1' }));
    // 匹配 key + 有值 → 反序列化后通知
    window.dispatchEvent(new StorageEvent('storage', { key: 'cov-evt', newValue: '123' }));
    // 匹配 key + 无值（清除）→ 通知 null
    window.dispatchEvent(new StorageEvent('storage', { key: 'cov-evt', newValue: null }));

    expect(seen).toEqual([123, null]);
    unsub();
  });
});

describe('storage battery: createSessionStorage', () => {
  it('creates a session-scoped adapter', () => {
    const store = createSessionStorage<number>({ key: 'cov-session', default: 0 });
    store.set(9);
    expect(store.get()).toBe(9);
    store.remove();
  });
});
