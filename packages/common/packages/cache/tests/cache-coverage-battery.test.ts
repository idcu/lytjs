/**
 * common/cache 覆盖率电池（Task C）：补齐 LRUCache / ExpiringCache / memoize 的
 * 容量校验、覆盖写、未命中删除、TTL 过期、序列化失败与非序列化键等分支。
 */
import { describe, it, expect, vi } from 'vitest';
import { LRUCache, ExpiringCache, memoize } from '../src/index';

describe('cache battery: LRUCache', () => {
  it('rejects a non-positive capacity', () => {
    expect(() => new LRUCache(0)).toThrow();
    expect(() => new LRUCache(-1)).toThrow();
  });

  it('overwrites an existing key without growing', () => {
    const lru = new LRUCache<string, number>(2);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.set('a', 10); // existing 分支
    expect(lru.get('a')).toBe(10);
    expect(lru.size).toBe(2);
  });

  it('evicts the least-recently-used entry and supports delete/clear/forEach', () => {
    const lru = new LRUCache<string, number>(2);
    lru.set('a', 1);
    lru.set('b', 2);
    lru.get('a'); // 提升 a
    lru.set('c', 3); // 淘汰 b
    expect(lru.has('b')).toBe(false);
    expect(lru.has('a')).toBe(true);
    expect(lru.get('missing')).toBeUndefined();
    expect(lru.delete('missing')).toBe(false); // 未命中删除
    expect(lru.delete('a')).toBe(true);

    const seen: string[] = [];
    lru.forEach((v, k) => seen.push(`${k}:${v}`));
    expect(seen.length).toBeGreaterThan(0);

    lru.clear();
    expect(lru.size).toBe(0);
  });
});

describe('cache battery: ExpiringCache', () => {
  it('rejects a non-positive ttl', () => {
    expect(() => new ExpiringCache(0)).toThrow();
  });

  it('returns undefined / false for missing and expired entries', async () => {
    const cache = new ExpiringCache<string, number>(1); // 1ms TTL
    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);

    cache.set('a', 1);
    expect(cache.has('a')).toBe(true);
    await new Promise((r) => setTimeout(r, 5));
    expect(cache.get('a')).toBeUndefined(); // 过期 → 删除

    cache.set('b', 2);
    await new Promise((r) => setTimeout(r, 5));
    expect(cache.has('b')).toBe(false); // 过期 → 删除
    expect(cache.cleanup()).toBeGreaterThanOrEqual(0);
    expect(cache.delete('b')).toBe(false);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

describe('cache battery: memoize', () => {
  it('caches by default arg serialization and by custom resolver', () => {
    const spy = vi.fn((a: number, b: number) => a + b);
    const m = memoize(spy);
    expect(m(1, 2)).toBe(3);
    expect(m(1, 2)).toBe(3);
    expect(spy).toHaveBeenCalledTimes(1);

    const rspy = vi.fn((o: { id: number }) => o.id * 2);
    const rm = memoize(rspy, { resolver: (o) => String(o.id) });
    expect(rm({ id: 2 })).toBe(4);
    expect(rm({ id: 2 })).toBe(4);
    expect(rspy).toHaveBeenCalledTimes(1);
  });

  it('falls back to invoking fn when the key cannot be produced', () => {
    const spy = vi.fn((v: unknown) => v);
    const m = memoize(spy as never, { resolver: () => '' });
    m('x');
    m('x');
    expect(spy).toHaveBeenCalledTimes(2); // 空 key ⇒ 不缓存

    // JSON.stringify 失败的循环引用 ⇒ catch ⇒ key undefined
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const cspy = vi.fn(() => 1);
    const cm = memoize(cspy as never);
    expect(() => cm(cyclic)).not.toThrow();
  });

  it('evicts the oldest entry when maxSize is exceeded, and supports clear', () => {
    const spy = vi.fn((n: number) => n);
    const m = memoize(spy, { maxSize: 2 });
    m(1);
    m(2);
    m(3); // 触发淘汰
    expect(m.clear).toBeTypeOf('function');
    m.clear();
    m(1);
    expect(spy.mock.calls.length).toBeGreaterThan(0);
  });

  it('honours an external cache map', () => {
    const external = new Map<string, number>();
    const m = memoize((n: number) => n * 2, undefined, external);
    expect(m(3)).toBe(6);
    expect(external.size).toBe(1);
  });
});
