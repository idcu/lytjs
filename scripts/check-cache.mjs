#!/usr/bin/env node
/**
 * 门禁：缓存正确性（`@lytjs/cache`）
 *
 * ## 为什么需要这一项
 *
 * 缓存是**最容易"看起来在工作"的组件**：`get`/`set` 都能跑通，单测全绿，
 * 但它的价值全在**边界**上 —— 容量、过期、失效、多层回写。
 * 这些边界出错时不会抛异常，只会**静默地**：
 *   · 缓存永久失效（每次都 miss，只是变慢）
 *   · 返回已被 invalidate 的陈旧数据
 *   · 容量上限被突破（内存无限增长）
 *
 * 本包此前测试行数 / 源码行数 ≈ 0.28，是仓里覆盖最薄的一批。
 *
 * ## 2026-11-03 首次运行抓到的 3 个缺陷
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | `set` 覆盖同一 key 时 `totalSize` **只增不减** | 1KB 值覆盖 10 次：1002 → **11022** |
 * | 2 | 单条超过 `maxSize` 时不拒绝，**直接突破上限** | maxSize=100 写入 1KB ⇒ totalSize=**1002** |
 * | 3 | `MultiLayerCache` 回写丢 tags ⇒ `invalidateTag` **清不掉上层副本** | `local has=true`（陈旧数据） |
 *
 * 缺陷 1 的后果不只是"统计不准"：`totalSize` 被撑大后**每次 set 都会触发淘汰**，
 * 刚写进去的条目立刻被淘汰 ⇒ 缓存永久失效，而调用方完全看不出来。
 */

const ROOT = process.cwd();
const { MemoryCache, MultiLayerCache, createCache, getDefaultCache } = await import(
  `${ROOT}/packages/ecosystem/packages/ssr-kit/packages/cache/dist/index.mjs`
);

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`   ✅ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`   ❌ ${name}`);
    if (detail !== undefined) {
      console.log(`         → ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }
  }
};
const section = (t) => console.log(`\n${t}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ══════════════════════════════════════════════════════════
section('[1] 覆盖同一个 key：容量统计只算一次');
{
  const c = new MemoryCache();
  const v = 'x'.repeat(1000);
  await c.set('k', v);
  const s1 = (await c.getStats()).totalSize;
  for (let i = 0; i < 10; i++) await c.set('k', v);
  const s2 = (await c.getStats()).totalSize;
  check('覆盖 10 次后 totalSize 不增长', s2 === s1, `首次=${s1} 之后=${s2}`);
  check('size 仍是 1', (await c.getStats()).size === 1, (await c.getStats()).size);
}

// ══════════════════════════════════════════════════════════
section('[2] 容量上限必须真的成立');
{
  const c = new MemoryCache({ maxSize: 5000 });
  const v = 'y'.repeat(1000);
  for (let i = 0; i < 20; i++) await c.set('key' + (i % 5), v);
  const s = await c.getStats();
  check('写过 20 次后仍有缓存条目（未被全部淘汰）', s.size > 0, `size=${s.size}`);
  check('最近写入的条目能读回来', (await c.get('key4')) !== undefined, '读不到');
  check('totalSize 不超过 maxSize', s.totalSize <= 5000, `totalSize=${s.totalSize}`);
}

{
  const c = new MemoryCache({ maxSize: 100 });
  await c.set('big', 'z'.repeat(1000));
  const s = await c.getStats();
  check(
    '单条超过 maxSize ⇒ 不缓存（而不是突破上限）',
    s.totalSize <= 100 && s.size === 0,
    `totalSize=${s.totalSize} size=${s.size}`,
  );
  check('被拒绝的条目 get 为 undefined', (await c.get('big')) === undefined, '读到了');
}

// ══════════════════════════════════════════════════════════
section('[3] 淘汰顺序：最旧的先走');
{
  const c = new MemoryCache({ maxSize: 3000 });
  await c.set('a', 'x'.repeat(1000));
  await sleep(5);
  await c.set('b', 'x'.repeat(1000));
  await sleep(5);
  await c.set('c', 'x'.repeat(1000)); // 触发淘汰
  const [hasA, hasB, hasC] = [await c.has('a'), await c.has('b'), await c.has('c')];
  check('最旧的 a 被淘汰', hasA === false, `hasA=${hasA}`);
  check('b 仍在', hasB === true, `hasB=${hasB}`);
  check('新写入的 c 仍在', hasC === true, `hasC=${hasC}`);
}

// ══════════════════════════════════════════════════════════
section('[4] 标签失效');
{
  const c = new MemoryCache();
  await c.set('a', 1, { tags: ['t1'] });
  await c.set('b', 2, { tags: ['t1', 't2'] });
  await c.set('c', 3, { tags: ['t2'] });
  await c.invalidateTag('t1');
  check('t1 的 a 被清', (await c.has('a')) === false, 'a 仍在');
  check('t1 的 b 被清', (await c.has('b')) === false, 'b 仍在');
  check('只属于 t2 的 c 保留', (await c.has('c')) === true, 'c 被误删');

  await c.invalidateTags(['t2']);
  check('invalidateTags 清掉 c', (await c.has('c')) === false, 'c 仍在');
}

{
  // 覆盖同一个 key 换了 tag：旧 tag 不应再能命中新条目
  const c = new MemoryCache();
  await c.set('k', 1, { tags: ['old'] });
  await c.set('k', 2, { tags: ['new'] });
  await c.invalidateTag('old');
  check('旧 tag 失效不影响被覆盖的新条目', (await c.get('k')) === 2, `get=${await c.get('k')}`);
  await c.invalidateTag('new');
  check('新 tag 能清掉它', (await c.has('k')) === false, '仍在');
}

// ══════════════════════════════════════════════════════════
section('[5] 过期语义');
{
  const c = new MemoryCache();
  await c.set('t', 'v', { ttl: 20 });
  await sleep(40);
  check('过期后 get 为 undefined', (await c.get('t')) === undefined, '读到了');
  check('过期后 has 为 false', (await c.has('t')) === false, 'has=true');
  check('过期条目被移除（size 归零）', (await c.getStats()).size === 0, (await c.getStats()).size);
}

// ══════════════════════════════════════════════════════════
section('[6] clear 重置一切');
{
  const c = new MemoryCache();
  await c.set('a', 1, { tags: ['t'] });
  await c.get('missing');
  await c.clear();
  const s = await c.getStats();
  check('clear 后 size 归零', s.size === 0, s.size);
  check('clear 后 totalSize 归零', s.totalSize === 0, s.totalSize);
  check('clear 后命中率归零', s.hitRate === 0, s.hitRate);
  await c.set('b', 2, { tags: ['t'] });
  await c.invalidateTag('t');
  check('clear 后标签索引也已重建（invalidateTag 仍可用）', (await c.has('b')) === false, '仍在');
}

// ══════════════════════════════════════════════════════════
section('[7] 多层缓存：写入与回写');
{
  const local = new MemoryCache();
  const remote = new MemoryCache();
  const mlc = new MultiLayerCache({ memory: false, extraLayers: [local, remote] });

  await mlc.set('k', 'v', { ttl: 5000, tags: ['t1'] });
  check('set 写入所有层（local）', (await local.has('k')) === true, 'local 没有');
  check('set 写入所有层（remote）', (await remote.has('k')) === true, 'remote 没有');

  // 只存在于下层 ⇒ 读到后回写上层，且保留 tags
  await local.clear();
  const got = await mlc.get('k');
  check('能读到底层数据', got === 'v', got);
  check('已回写到上层', (await local.has('k')) === true, '没回写');

  await mlc.invalidateTag('t1');
  check('invalidateTag 清掉上层回写副本', (await local.has('k')) === false, 'local 仍在');
  check('invalidateTag 清掉底层', (await remote.has('k')) === false, 'remote 仍在');
}

{
  // 回写必须保留原 TTL：下层快过期的数据不能在上层被"续命"成默认 1 小时
  const local = new MemoryCache();
  const remote = new MemoryCache();
  const mlc = new MultiLayerCache({ memory: false, extraLayers: [local, remote] });

  await remote.set('short', 'v', { ttl: 60 });
  await mlc.get('short'); // 回写
  await sleep(90);
  check(
    '回写后的副本按原 TTL 过期（未被续命）',
    (await local.has('short')) === false,
    'local 仍在',
  );
}

// ══════════════════════════════════════════════════════════
section('[8] 工厂与默认实例');
{
  check('createCache 默认返回 MemoryCache', createCache() instanceof MemoryCache, '类型不符');
  check(
    'createCache({type:"multi"}) 返回 MultiLayerCache',
    createCache({ type: 'multi' }) instanceof MultiLayerCache,
    '类型不符',
  );
  check('getDefaultCache 是单例', getDefaultCache() === getDefaultCache(), '不是同一实例');
  check(
    '默认实例是进程级的（语义记录：SSR 下 key 必须含用户维度，否则跨用户串数据）',
    getDefaultCache() instanceof MemoryCache,
    '类型不符',
  );
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
