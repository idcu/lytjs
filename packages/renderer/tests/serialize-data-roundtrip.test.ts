/**
 * 行为级判据：`serializeData` / `deserializeData` 的 **Date 往返**
 *
 * ## 为什么要有这条
 *
 * `serializeData` 的 replacer 里写了 `value instanceof Date → {__type:'Date', __value:…}`，
 * 而 `deserializeData` 也实现了对应的 `case 'Date'` 还原分支 —— 但**永远走不到**：
 * `JSON.stringify` 会**先调用值的 `toJSON()`**（Date 恰好有 `toJSON`），replacer 拿到的
 * 已经是 **ISO 字符串** ⇒ `instanceof Date` 恒为 false
 * （登记见 `keel/NOW-history/2026-10-09-覆盖率分批与ADR0005.md` ②）。
 * ⇒ Date 被序列化成**裸字符串**，往返后**不再是 Date**（`__type` 协议对该类型静默失效）。
 *
 * 本电池给出「翻转 ⇒ 变红」的判据（修复前前两条红）。
 */

import { describe, it, expect } from 'vitest';
import { serializeData, deserializeData } from '../src/data/data-fetching';

const ISO = '2026-10-15T00:00:00.000Z';

describe('serializeData / deserializeData — Date 往返', () => {
  it('★ Date 应按 __type 协议序列化（而非裸 ISO 串）', () => {
    const json = serializeData({ at: new Date(ISO) });
    expect(json).toContain('"__type":"Date"');
  });

  it('★ 对象里的 Date 往返后应还原为 Date 实例', () => {
    const back = deserializeData(serializeData({ at: new Date(ISO) })) as { at: unknown };
    expect(back.at).toBeInstanceOf(Date);
    expect((back.at as Date).toISOString()).toBe(ISO);
  });

  it('顶层 Date 也应可往返', () => {
    expect(deserializeData(serializeData(new Date(ISO)))).toBeInstanceOf(Date);
  });

  it('数组里的 Date 也应可往返', () => {
    const back = deserializeData(serializeData([new Date(ISO)])) as unknown[];
    expect(back[0]).toBeInstanceOf(Date);
  });

  it('多层嵌套里的 Date 也应可往返', () => {
    const back = deserializeData(serializeData({ a: { b: new Date(ISO) } })) as {
      a: { b: unknown };
    };
    expect(back.a.b).toBeInstanceOf(Date);
  });

  it('回归：Map / Set / BigInt / undefined 仍按 __type 协议工作', () => {
    const json = serializeData({
      m: new Map([['k', 1]]),
      s: new Set([1]),
      b: 1n,
      u: undefined,
    });
    expect(json).toContain('"__type":"Map"');
    expect(json).toContain('"__type":"Set"');
    expect(json).toContain('"__type":"BigInt"');
    const back = deserializeData(json) as {
      m: Map<string, number>;
      s: Set<number>;
      b: bigint;
      u: unknown;
    };
    expect(back.m).toBeInstanceOf(Map);
    expect(back.s).toBeInstanceOf(Set);
    expect(back.b).toBe(1n);
    expect(back.u).toBeUndefined();
  });
});
