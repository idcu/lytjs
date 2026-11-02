/**
 * 行为级判据：`@lytjs/cache` 的**容量与失效边界**
 *
 * ## 为什么单独写一个文件
 *
 * 缓存是**最容易"看起来在工作"**的组件：`get`/`set` 都能跑通，单测全绿，
 * 但它的价值全在**边界**上 —— 容量、过期、失效、多层回写。
 * 这些边界出错时**不抛异常**，只会静默地：
 *
 *   · 让缓存永久失效（每次 set 都触发淘汰 ⇒ 每次都 miss，只是变慢）
 *   · 返回已被 invalidate 的陈旧数据
 *   · 突破容量上限（内存无限增长）
 *
 * 本文件守 2026-11-03 修掉的 4 个边界缺陷；端到端由门禁
 * `scripts/check-cache.mjs`（34 条断言）守。
 */

import { describe, it, expect } from 'vitest';
import { MemoryCache, MultiLayerCache } from '../src';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('MemoryCache · 容量边界', () => {
  it('覆盖同一个 key 时 totalSize 只算一次', async () => {
    const c = new MemoryCache();
    const v = 'x'.repeat(1000);
    await c.set('k', v);
    const first = (await c.getStats()).totalSize;

    for (let i = 0; i < 10; i++) await c.set('k', v);
    const after = (await c.getStats()).totalSize;

    expect(after).toBe(first);
    expect((await c.getStats()).size).toBe(1);
  });

  it('单条超过 maxSize 时不缓存（不突破上限）', async () => {
    const c = new MemoryCache({ maxSize: 100 });
    await c.set('big', 'z'.repeat(1000));

    const stats = await c.getStats();
    expect(stats.totalSize).toBeLessThanOrEqual(100);
    expect(stats.size).toBe(0);
    expect(await c.get('big')).toBeUndefined();
  });

  it('持续写入时 totalSize 始终不超过 maxSize', async () => {
    const c = new MemoryCache({ maxSize: 5000 });
    const v = 'y'.repeat(1000);
    for (let i = 0; i < 20; i++) await c.set('key' + (i % 5), v);

    const stats = await c.getStats();
    expect(stats.totalSize).toBeLessThanOrEqual(5000);
    expect(stats.size).toBeGreaterThan(0);
    // 用具体值断言（`toBeDefined()` 是门禁明令禁止的弱断言：`false` / `0` / `''` 都算"已定义"）
    expect(await c.get('key4')).toBe(v);
  });

  it('淘汰顺序：最旧的先走', async () => {
    const c = new MemoryCache({ maxSize: 3000 });
    await c.set('a', 'x'.repeat(1000));
    await sleep(5);
    await c.set('b', 'x'.repeat(1000));
    await sleep(5);
    await c.set('c', 'x'.repeat(1000)); // 触发淘汰

    expect(await c.has('a')).toBe(false);
    expect(await c.has('b')).toBe(true);
    expect(await c.has('c')).toBe(true);
  });
});

describe('MemoryCache · 标签失效', () => {
  it('覆盖同一个 key 换 tag 后，旧 tag 不再能失效新条目', async () => {
    const c = new MemoryCache();
    await c.set('k', 1, { tags: ['old'] });
    await c.set('k', 2, { tags: ['new'] });

    await c.invalidateTag('old');
    expect(await c.get('k')).toBe(2);

    await c.invalidateTag('new');
    expect(await c.has('k')).toBe(false);
  });

  it('invalidateTags 逐个生效', async () => {
    const c = new MemoryCache();
    await c.set('a', 1, { tags: ['t1'] });
    await c.set('b', 2, { tags: ['t2'] });
    await c.invalidateTags(['t1', 't2']);
    expect(await c.has('a')).toBe(false);
    expect(await c.has('b')).toBe(false);
  });
});

describe('MultiLayerCache · 回写', () => {
  it('回写保留 tags，invalidateTag 能清掉上层副本', async () => {
    const local = new MemoryCache();
    const remote = new MemoryCache();
    const mlc = new MultiLayerCache({ memory: false, extraLayers: [local, remote] });

    await remote.set('k', 'v', { ttl: 5000, tags: ['t1'] });
    expect(await mlc.get('k')).toBe('v');
    expect(await local.has('k')).toBe(true); // 已回写

    await mlc.invalidateTag('t1');
    expect(await local.has('k')).toBe(false);
    expect(await remote.has('k')).toBe(false);
  });

  it('回写保留原 TTL（不会把快过期的数据续命成默认 1 小时）', async () => {
    const local = new MemoryCache();
    const remote = new MemoryCache();
    const mlc = new MultiLayerCache({ memory: false, extraLayers: [local, remote] });

    await remote.set('short', 'v', { ttl: 60 });
    await mlc.get('short'); // 触发回写
    expect(await local.has('short')).toBe(true);

    await sleep(90);
    expect(await local.has('short')).toBe(false);
  });

  it('set 写入所有层', async () => {
    const local = new MemoryCache();
    const remote = new MemoryCache();
    const mlc = new MultiLayerCache({ memory: false, extraLayers: [local, remote] });

    await mlc.set('k', 'v', { tags: ['t'] });
    expect(await local.has('k')).toBe(true);
    expect(await remote.has('k')).toBe(true);
  });
});

describe('MemoryCache · 过期与清理', () => {
  it('过期条目会被移除，size 归零', async () => {
    const c = new MemoryCache();
    await c.set('t', 'v', { ttl: 20 });
    await sleep(40);

    expect(await c.get('t')).toBeUndefined();
    expect(await c.has('t')).toBe(false);
    expect((await c.getStats()).size).toBe(0);
  });

  it('clear 重置统计与标签索引', async () => {
    const c = new MemoryCache();
    await c.set('a', 1, { tags: ['t'] });
    await c.get('missing');
    await c.clear();

    const stats = await c.getStats();
    expect(stats.size).toBe(0);
    expect(stats.totalSize).toBe(0);
    expect(stats.hitRate).toBe(0);

    // 索引仍然可用
    await c.set('b', 2, { tags: ['t'] });
    await c.invalidateTag('t');
    expect(await c.has('b')).toBe(false);
  });
});
