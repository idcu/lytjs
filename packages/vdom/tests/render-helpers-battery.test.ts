// @vitest-environment node
/**
 * `vdom/src/render-helpers.ts` 行为电池。
 *
 * 该文件是「编译期 ↔ 运行期」契约的运行期一侧：编译器产物会
 * `import { toDisplayString, renderList, … } from '@lytjs/core'`。
 * 此前 **135/148 语句未覆盖（9%）**，等于这条契约只有「名字存在」被守过，
 * **语义一条都没验**。
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { Fragment } from '@lytjs/common-vnode';
import {
  createElementVNode,
  createStaticVNode,
  renderList,
  toDisplayString,
  normalizeProps,
  guardReactiveProps,
  toHandlerKey,
  createSlots,
  withCtx,
} from '../src/render-helpers';
import { isBlockTrackingEnabled } from '../src/block';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createElementVNode', () => {
  it('与 createVNode 同形：type / props / children 透传', () => {
    const vnode = createElementVNode('div', { id: 'a' }, 'text');

    expect(vnode.type).toBe('div');
    expect(vnode.props).toEqual({ id: 'a' });
    expect(vnode.children).toBe('text');
  });

  it('省略可选参数时 props / children 归一为 null，patchFlag 为 0', () => {
    const vnode = createElementVNode('span');

    expect(vnode.props).toBeNull();
    expect(vnode.children).toBeNull();
    expect(vnode.patchFlag).toBe(0);
  });

  it('透传 patchFlag / dynamicProps', () => {
    const vnode = createElementVNode('div', null, null, 8, ['class']);

    expect(vnode.patchFlag).toBe(8);
    expect(vnode.dynamicProps).toEqual(['class']);
  });
});

describe('createStaticVNode', () => {
  it('单节点：Fragment + 一个文本子节点 + isStatic 标记', () => {
    const vnode = createStaticVNode('<b>hi</b>');

    expect(vnode.type).toBe(Fragment);
    expect((vnode as unknown as { isStatic: boolean }).isStatic).toBe(true);
    expect((vnode.children as unknown[]).length).toBe(1);
  });

  it('多节点：按 numberOfNodes 生成对应数量的子节点', () => {
    const vnode = createStaticVNode('a  b  c', 3);

    expect((vnode.children as unknown[]).length).toBe(3);
  });

  it('★ 内容切出的段数多于 numberOfNodes 时，节点数必须**严格等于** numberOfNodes', () => {
    // 静态节点的「节点数」是编译期算好的，服务端按它输出、客户端按它水合；
    // 多造节点 ⇒ 两端结构不一致（水合错位）。
    const vnode = createStaticVNode('a  b  c  d', 2);

    expect((vnode.children as unknown[]).length).toBe(2);
  });

  it('内容段数少于 numberOfNodes 时补空节点', () => {
    const vnode = createStaticVNode('only', 3);

    expect((vnode.children as unknown[]).length).toBe(3);
  });
});

describe('renderList', () => {
  it('数组：value / key / index 三个参数', () => {
    const seen: unknown[][] = [];

    const out = renderList(['x', 'y'], (v, k, i) => {
      seen.push([v, k, i]);
      return v;
    });

    expect(out).toEqual(['x', 'y']);
    expect(seen).toEqual([
      ['x', 0, 0],
      ['y', 1, 1],
    ]);
  });

  it('字符串：逐字符渲染', () => {
    expect(renderList('abc', (c) => c)).toEqual(['a', 'b', 'c']);
  });

  it('数字 n：渲染 1..n', () => {
    expect(renderList(3, (v) => v)).toEqual([1, 2, 3]);
  });

  it('对象：value / key / index', () => {
    const seen: unknown[][] = [];

    const out = renderList({ a: 1, b: 2 }, (v, k, i) => {
      seen.push([v, k, i]);
      return `${k}=${v}`;
    });

    expect(out).toEqual(['a=1', 'b=2']);
    expect(seen).toEqual([
      [1, 'a', 0],
      [2, 'b', 1],
    ]);
  });

  it('null / undefined ⇒ 空数组', () => {
    expect(renderList(null, (v) => v)).toEqual([]);
    expect(renderList(undefined, (v) => v)).toEqual([]);
  });

  it('结果数组带 _isVList 标记', () => {
    const out = renderList([1], (v) => v);

    expect((out as unknown as { _isVList: boolean })._isVList).toBe(true);
  });

  it('★ 负数 / 小数 source 不得抛 RangeError（与参考语义一致：得到空数组）', () => {
    // `new Array(-1)` / `new Array(1.5)` 都会抛 RangeError: Invalid array length
    expect(() => renderList(-1, (v) => v)).not.toThrow();
    expect(renderList(-1, (v) => v)).toEqual([]);
    expect(() => renderList(1.5, (v) => v)).not.toThrow();
    // `for (i = 0; i < 1.5; i++)` ⇒ 跑两次（与参考实现一致，不额外 floor）
    expect(renderList(1.5, (v) => v)).toEqual([1, 2]);
  });
});

describe('toDisplayString', () => {
  it('null / undefined ⇒ 空串；字符串原样', () => {
    expect(toDisplayString(null)).toBe('');
    expect(toDisplayString(undefined)).toBe('');
    expect(toDisplayString('abc')).toBe('abc');
  });

  it('数字 / 布尔 / 普通对象字符串化', () => {
    expect(toDisplayString(0)).toBe('0');
    expect(toDisplayString(false)).toBe('false');
    expect(toDisplayString({ a: 1 })).toContain('"a": 1');
  });

  it('数组与 Map / Set / RegExp 走紧凑 JSON', () => {
    expect(toDisplayString([1, 2])).toBe('[1,2]');
    expect(toDisplayString(new Map([['k', 1]]))).toBe('[["k",1]]');
    expect(toDisplayString(new Set([1, 2]))).toBe('[1,2]');
    expect(toDisplayString(/ab/g)).toBe('"/ab/g"');
  });

  it('symbol / bigint 转成字符串而不是抛错', () => {
    expect(toDisplayString(Symbol('s'))).toContain('Symbol(s)');
    // 根位置的 bigint：replacer 返回 '10' 后，顶层结果不再加引号
    expect(toDisplayString(10n)).toBe('10');
  });

  it('★ Signal 品牌（Symbol.for）在插值位置被调用取值', () => {
    const sig = (() => 42) as unknown as Record<symbol, unknown>;
    sig[Symbol.for('lytjs:signal')] = true;

    expect(toDisplayString(sig)).toBe('42');
  });

  it('computedSignal 品牌同样被调用', () => {
    const sig = (() => 'computed') as unknown as Record<symbol, unknown>;
    sig[Symbol.for('lytjs:computed_signal')] = true;

    expect(toDisplayString(sig)).toBe('computed');
  });

  it('Signal 抛错 ⇒ 返回空串（不让渲染崩掉）', () => {
    const sig = (() => {
      throw new Error('boom');
    }) as unknown as Record<symbol, unknown>;
    sig[Symbol.for('lytjs:signal')] = true;

    expect(toDisplayString(sig)).toBe('');
  });

  it('循环引用对象 ⇒ 退回 String()，不抛错', () => {
    const a: Record<string, unknown> = {};
    a.self = a;

    expect(() => toDisplayString(a)).not.toThrow();
    expect(toDisplayString(a)).toBe('[object Object]');
  });

  it('普通函数（非 Signal）走 String()', () => {
    expect(toDisplayString(function named() {})).toContain('function named');
  });
});

describe('normalizeProps', () => {
  it('null / undefined ⇒ null', () => {
    expect(normalizeProps(null)).toBeNull();
    expect(normalizeProps(undefined)).toBeNull();
  });

  it('普通对象原样返回（同一引用，零拷贝）', () => {
    const props = { a: 1 };

    expect(normalizeProps(props)).toBe(props);
  });
});

describe('guardReactiveProps', () => {
  it('null / undefined ⇒ null', () => {
    expect(guardReactiveProps(null)).toBeNull();
    expect(guardReactiveProps(undefined)).toBeNull();
  });

  it('普通对象原样返回', () => {
    const props = { a: 1 };

    expect(guardReactiveProps(props)).toBe(props);
  });

  it('★ 响应式代理（__v_isReactive）⇒ 浅拷贝，避免把代理挂到 vnode 上', () => {
    const props = { a: 1, __v_isReactive: true };
    const guarded = guardReactiveProps(props);

    expect(guarded).not.toBe(props);
    expect(guarded).toEqual({ a: 1, __v_isReactive: true });
  });

  it('__v_isReactive 为 1（旧标记）时同样拷贝', () => {
    const props = { a: 1, __v_isReactive: 1 };

    expect(guardReactiveProps(props)).not.toBe(props);
  });
});

describe('toHandlerKey', () => {
  it('空串 ⇒ 空串', () => {
    expect(toHandlerKey('')).toBe('');
  });

  it('普通事件名首字母大写并加 on 前缀', () => {
    expect(toHandlerKey('click')).toBe('onClick');
    expect(toHandlerKey('myEvent')).toBe('onMyEvent');
  });

  it('★ kebab-case 事件名必须先转 camelCase（与 component 的 emit 查找键一致）', () => {
    // `@update:model-value` 编译成 props 键；而 `emit('update:model-value')`
    // 在 component 侧查的是 `onUpdate:modelValue`（它先 kebabToCamel）。
    // 两侧不一致 ⇒ 监听器永远收不到事件。
    expect(toHandlerKey('update:model-value')).toBe('onUpdate:modelValue');
    expect(toHandlerKey('my-event')).toBe('onMyEvent');
  });
});

describe('createSlots', () => {
  it('单个描述符合并进 slots', () => {
    const slots: Record<string, unknown> = {};
    const fn = () => 'x';

    const out = createSlots(slots, [{ name: 'header', fn }]);

    expect(out).toBe(slots);
    expect(out.header).toBe(fn);
  });

  it('数组形式的描述符逐个合并', () => {
    const a = () => 'a';
    const b = () => 'b';

    const out = createSlots({}, [[{ name: 'a', fn: a }], [{ name: 'b', fn: b }]]);

    expect(out.a).toBe(a);
    expect(out.b).toBe(b);
  });

  it('null / undefined / 无 name 的项被跳过', () => {
    const out = createSlots({}, [null, undefined, { name: '', fn: () => 1 }]);

    expect(Object.keys(out)).toEqual([]);
  });

  it('与已有插槽同名时覆盖', () => {
    const oldFn = () => 'old';
    const newFn = () => 'new';

    const out = createSlots({ x: oldFn }, [{ name: 'x', fn: newFn }]);

    expect(out.x).toBe(newFn);
  });
});

describe('withCtx', () => {
  it('透传参数与返回值', () => {
    const wrapped = withCtx((a: number, b: number) => a + b);

    expect(wrapped(1, 2)).toBe(3);
  });

  it('保留 this', () => {
    const obj = {
      v: 7,
      fn: withCtx(function (this: { v: number }) {
        return this.v;
      }),
    };

    expect(obj.fn()).toBe(7);
  });

  it('★ 调用期间关闭 block 追踪，退出后恢复', () => {
    expect(isBlockTrackingEnabled()).toBe(true);

    let inside: boolean | null = null;
    const wrapped = withCtx(() => {
      inside = isBlockTrackingEnabled();
      return 1;
    });
    wrapped();

    expect(inside).toBe(false);
    expect(isBlockTrackingEnabled()).toBe(true);
  });

  it('★ 抛错时也必须恢复 block 追踪（否则后续渲染全乱）', () => {
    const wrapped = withCtx(() => {
      throw new Error('boom');
    });

    expect(() => wrapped()).toThrow('boom');
    expect(isBlockTrackingEnabled()).toBe(true);
  });
});
