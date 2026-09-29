/**
 * @lytjs/common-object —— 补齐「从 index.ts 导出但此前无测试」的公开 API，
 * 以及 deepClone / deepEqual / get / set 的分支盲区。
 *
 * 动机（两重）：
 * 1. **「导出即契约」**：这些函数都从 `src/index.ts` 导出（对外承诺），却没有任何用例
 *    （`shallowClone` / `merge` / `unique` / `chunk` / `flatten` / `groupBy` 此前 **0 测试**）。
 * 2. **分支覆盖**：根 `test:coverage` 的 `branches` 阈值（80%）长期贴着真实值（≈79.99%），
 *    同一命令两次运行会得 80.01% / 79.99% ⇒ 门禁**边界 flaky**。按纪律阈值只许上调，
 *    故正道是补测把真实值顶上去、留出余量。
 */

import { describe, it, expect } from 'vitest';
import {
  deepClone,
  deepEqual,
  get,
  set,
  shallowClone,
  merge,
  unique,
  chunk,
  flatten,
  groupBy,
} from '../src/index';

describe('@lytjs/common-object · 补测未覆盖导出与分支', () => {
  // ==================== deepClone ====================
  describe('deepClone', () => {
    it('基本类型原样返回', () => {
      expect(deepClone(1)).toBe(1);
      expect(deepClone('a')).toBe('a');
      expect(deepClone(null)).toBeNull();
      expect(deepClone(undefined)).toBeUndefined();
    });

    it('复制 Date（内容相等、引用不同）', () => {
      const d = new Date(1234567890);
      const c = deepClone(d);
      expect(c).toBeInstanceOf(Date);
      expect(c.getTime()).toBe(d.getTime());
      expect(c).not.toBe(d);
    });

    it('复制 RegExp（保留 source/flags）', () => {
      const r = /ab+c/gi;
      const c = deepClone(r);
      expect(c).toBeInstanceOf(RegExp);
      expect(c.source).toBe(r.source);
      expect(c.flags).toBe(r.flags);
      expect(c).not.toBe(r);
    });

    it('复制 Map（键与值都深拷贝）', () => {
      const m = new Map<unknown, unknown>([[{ k: 1 }, { v: 2 }]]);
      const c = deepClone(m) as Map<unknown, unknown>;
      expect(c).toBeInstanceOf(Map);
      expect(c).not.toBe(m);
      const [ck, cv] = [...c.entries()][0] as [Record<string, number>, Record<string, number>];
      expect(ck).toEqual({ k: 1 });
      expect(cv).toEqual({ v: 2 });
      expect(ck).not.toBe([...m.keys()][0]); // 深拷贝而非共享引用
    });

    it('复制 Set', () => {
      const s = new Set([{ a: 1 }]);
      const c = deepClone(s) as Set<unknown>;
      expect(c).toBeInstanceOf(Set);
      expect([...c][0]).toEqual({ a: 1 });
      expect([...c][0]).not.toBe([...s][0]);
    });

    it('复制数组', () => {
      const arr = [1, [2, 3], { a: 4 }];
      const c = deepClone(arr);
      expect(c).toEqual(arr);
      expect(c).not.toBe(arr);
      expect(c[1]).not.toBe(arr[1]);
    });

    it('普通对象：深拷贝嵌套值', () => {
      const o = { a: 1, b: { c: { d: 2 } } };
      const c = deepClone(o);
      expect(c).toEqual(o);
      expect(c.b).not.toBe(o.b);
      expect(c.b.c).not.toBe(o.b.c);
    });

    it('普通对象：保留 symbol 键', () => {
      const sym = Symbol('s');
      const o: Record<string | symbol, unknown> = { a: 1, [sym]: { deep: 2 } };
      const c = deepClone(o) as Record<string | symbol, unknown>;
      expect(c[sym]).toEqual({ deep: 2 });
      expect(c[sym]).not.toBe(o[sym]);
    });

    it('保留原型链', () => {
      class Foo {
        x = 1;
      }
      const c = deepClone(new Foo());
      expect(Object.getPrototypeOf(c)).toBe(Foo.prototype);
    });

    it('支持循环引用（不无限递归）', () => {
      const o: Record<string, unknown> = { a: 1 };
      o.self = o;
      const c = deepClone(o) as Record<string, unknown>;
      expect(c.a).toBe(1);
      expect(c.self).toBe(c); // 指向克隆体自身
    });

    it('超过 maxDepth 时回退 JSON 序列化', () => {
      const nested = { a: { b: 1 } };
      const c = deepClone(nested, new WeakMap(), 0);
      expect(c).toEqual({ a: { b: 1 } });
    });

    it('超过 maxDepth 且 JSON 失败时抛错（BigInt 不可序列化）', () => {
      expect(() => deepClone({ a: 10n }, new WeakMap(), 0)).toThrow(/maximum depth/);
    });
  });

  // ==================== deepEqual ====================
  describe('deepEqual', () => {
    it('相同引用 / 基本类型', () => {
      const o = { a: 1 };
      expect(deepEqual(o, o)).toBe(true);
      expect(deepEqual(1, 1)).toBe(true);
    });

    it('NaN 视为相等', () => {
      expect(deepEqual(NaN, NaN)).toBe(true);
    });

    it('一侧为 null/undefined ⇒ false', () => {
      expect(deepEqual({ a: 1 }, null)).toBe(false);
      expect(deepEqual(null, { a: 1 })).toBe(false);
    });

    it('类型不同 ⇒ false', () => {
      expect(deepEqual(1, '1')).toBe(false);
    });

    it('非对象的不同值 ⇒ false', () => {
      expect(deepEqual(1, 2)).toBe(false);
    });

    it('Date', () => {
      expect(deepEqual(new Date(1000), new Date(1000))).toBe(true);
      expect(deepEqual(new Date(1000), new Date(2000))).toBe(false);
    });

    it('RegExp', () => {
      expect(deepEqual(/a/g, /a/g)).toBe(true);
      expect(deepEqual(/a/g, /b/g)).toBe(false);
    });

    it('Map（含 size 不同 / 缺键 / 值不同）', () => {
      expect(deepEqual(new Map([['a', 1]]), new Map([['a', 1]]))).toBe(true);
      expect(deepEqual(new Map([['a', 1]]), new Map())).toBe(false);
      expect(deepEqual(new Map([['a', 1]]), new Map([['b', 1]]))).toBe(false);
      expect(deepEqual(new Map([['a', { v: 1 }]]), new Map([['a', { v: 2 }]]))).toBe(false);
    });

    it('Set（含 size 不同 / 成员不同）', () => {
      expect(deepEqual(new Set([1, 2]), new Set([1, 2]))).toBe(true);
      expect(deepEqual(new Set([1]), new Set([1, 2]))).toBe(false);
      expect(deepEqual(new Set([1]), new Set([2]))).toBe(false);
    });

    it('数组（含长度不同 / 元素不同）', () => {
      expect(deepEqual([1, [2]], [1, [2]])).toBe(true);
      expect(deepEqual([1], [1, 2])).toBe(false);
      expect(deepEqual([1, 2], [1, 3])).toBe(false);
    });

    it('普通对象（含键数不同 / 值不同）', () => {
      expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('两侧结构类型不同（Map vs 普通对象 / 数组 vs 对象）⇒ false', () => {
      // 注意：本仓 `isPlainObject` 以 `Object.prototype.toString` 判定，
      // 因此**类实例也会被判为 plain**；此处改用真正不同 tag 的结构来命中兜底分支。
      expect(deepEqual(new Map([['a', 1]]), { a: 1 })).toBe(false);
      expect(deepEqual([1], { 0: 1 })).toBe(false);
    });
  });

  // ==================== get ====================
  describe('get', () => {
    it('空路径返回对象本身', () => {
      const o = { a: 1 };
      expect(get(o, '')).toBe(o);
    });

    it('按点路径取值', () => {
      expect(get({ a: { b: { c: 3 } } }, 'a.b.c')).toBe(3);
    });

    it('缺失 / 中间为 null ⇒ 返回默认值', () => {
      expect(get({ a: 1 }, 'x.y', 'def')).toBe('def');
      expect(get({ a: null } as Record<string, unknown>, 'a.b', 'def')).toBe('def');
    });

    it('末值为 nullish ⇒ 返回默认值', () => {
      expect(get({ a: null } as Record<string, unknown>, 'a', 'def')).toBe('def');
    });

    it('拒绝原型污染路径（返回默认值）', () => {
      expect(get({ a: 1 }, '__proto__.polluted', 'def')).toBe('def');
      expect(get({ a: 1 }, 'constructor', 'def')).toBe('def');
    });
  });

  // ==================== set ====================
  describe('set', () => {
    it('空路径原样返回', () => {
      const o = { a: 1 };
      expect(set(o, '', 2)).toBe(o);
    });

    it('设置顶层键且不修改原对象', () => {
      const o = { a: 1 };
      const r = set(o, 'b', 2);
      expect(r).toEqual({ a: 1, b: 2 });
      expect(o).toEqual({ a: 1 });
    });

    it('创建缺失的中间对象', () => {
      expect(set({} as Record<string, unknown>, 'a.b.c', 1)).toEqual({ a: { b: { c: 1 } } });
    });

    it('中间值为非对象时替换为对象', () => {
      expect(set({ a: 5 } as Record<string, unknown>, 'a.b', 1)).toEqual({ a: { b: 1 } });
    });

    it('深拷贝已有中间对象（不污染原对象）', () => {
      const o = { a: { b: 1 } };
      const r = set(o as Record<string, unknown>, 'a.c', 2);
      expect(r).toEqual({ a: { b: 1, c: 2 } });
      expect(o.a).toEqual({ b: 1 });
    });

    it('拒绝原型污染键（原样返回）', () => {
      const o = { a: 1 };
      expect(set(o, '__proto__.x', 1)).toBe(o);
      expect(set(o, 'a.__proto__', 1)).toBe(o);
    });
  });

  // ==================== 此前无测试的导出（导出即契约） ====================
  describe('shallowClone', () => {
    it('浅拷贝：顶层独立、嵌套共享', () => {
      const o = { a: 1, b: { c: 2 } };
      const c = shallowClone(o);
      expect(c).toEqual(o);
      expect(c).not.toBe(o);
      expect(c.b).toBe(o.b);
    });
  });

  describe('merge', () => {
    it('后者覆盖前者，且不修改入参', () => {
      const t = { a: 1, b: 2 };
      const s = { b: 3, c: 4 };
      expect(merge(t, s)).toEqual({ a: 1, b: 3, c: 4 });
      expect(t).toEqual({ a: 1, b: 2 });
    });
  });

  describe('unique', () => {
    it('去重（保持首次出现顺序）', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique([])).toEqual([]);
    });
  });

  describe('chunk', () => {
    it('按大小分块（含不整除）', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('size <= 0 时整体作为一块', () => {
      expect(chunk([1, 2], 0)).toEqual([[1, 2]]);
      expect(chunk([1, 2], -1)).toEqual([[1, 2]]);
    });
  });

  describe('flatten', () => {
    it('扁平化一层', () => {
      expect(flatten([[1, 2], [3], []])).toEqual([1, 2, 3]);
    });
  });

  describe('groupBy', () => {
    it('按键分组', () => {
      const users = [
        { role: 'admin', name: 'Alice' },
        { role: 'user', name: 'Bob' },
        { role: 'admin', name: 'Charlie' },
      ];
      expect(groupBy(users, 'role')).toEqual({
        admin: [users[0], users[2]],
        user: [users[1]],
      });
    });

    it('空数组 ⇒ 空对象', () => {
      expect(groupBy([], 'k')).toEqual({});
    });
  });
});
