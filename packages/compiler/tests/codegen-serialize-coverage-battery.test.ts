/**
 * compiler/codegen serialize 覆盖率电池（Task C）
 *
 * `codegen-signal.ts` / `codegen-signal-optimized.ts` 里带 `export` 的
 * `serialize*` 系列函数**不属于公开 API**，导出仅为便于单测其「严格模式边界」：
 * 这些 `return null` 早返回分支在正常模板编译路径里几乎无法触达
 * （模板能编译到这里，说明结构本来就合法），因此必须构造**畸形输入**直接调用。
 *
 * 覆盖目标：每个 `if (...) return null` 的两侧 + 各分支形态（无 alternate /
 * VNODE_CALL alternate / 嵌套条件 alternate / 未知类型 alternate）。
 */
import { describe, it, expect } from 'vitest';
import { NodeTypes } from '../src/constants';
import {
  serializeListVNode,
  serializeConditionalVNode,
  serializeVNodeCall,
  serializeVNodeCallChildren,
  serializeVNodeCallChild,
} from '../src/codegen-signal';
import {
  serializeListVNodeOptimized,
  serializeConditionalVNodeOptimized,
  serializeVNodeCallOptimized,
  serializeVNodeCallChildrenOptimized,
  serializeVNodeCallChildOptimized,
  buildItemComponentProps,
} from '../src/codegen-signal-optimized';

const NT = NodeTypes;
const P = '_ctx.';
const NO_LOCALS: ReadonlySet<string> = new Set();

/** 构造一个最小可用 VNODE_CALL */
function mkVNode(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: NT.VNODE_CALL, tag: '"div"', ...extra };
}

/** 构造一个最小可用 ElementNode */
function mkElement(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { type: NT.ELEMENT, tag: 'div', tagType: 0, props: [], children: [], ...extra };
}

/** RENDER_LIST 的合法 arguments[1]（箭头函数体） */
function mkRenderFn(vnodeNode: unknown, head = '(item, i) => { '): Record<string, unknown> {
  return { type: NT.COMPOUND_EXPRESSION, children: [head, vnodeNode, ' }'] };
}

function mkRenderListCall(source: unknown, fn: unknown): Record<string, unknown> {
  return { type: NT.JS_CALL_EXPRESSION, callee: 'RENDER_LIST', arguments: [source, fn] };
}

const OPTS = { mode: 'signal' as const };

// ============================================================
// base: serializeListVNode
// ============================================================
describe('serialize battery (base): serializeListVNode 严格模式边界', () => {
  it('非对象 / 非 JS_CALL_EXPRESSION / callee 不是 RENDER_LIST → null', () => {
    expect(serializeListVNode(null, P, NO_LOCALS)).toBeNull();
    expect(serializeListVNode(undefined, P, NO_LOCALS)).toBeNull();
    expect(serializeListVNode({ type: NT.VNODE_CALL }, P, NO_LOCALS)).toBeNull();
    expect(
      serializeListVNode({ type: NT.JS_CALL_EXPRESSION, callee: 'OTHER' }, P, NO_LOCALS),
    ).toBeNull();
  });

  it('arguments 非数组 / 长度不足 → null', () => {
    const base = { type: NT.JS_CALL_EXPRESSION, callee: 'RENDER_LIST' };
    expect(serializeListVNode(base, P, NO_LOCALS)).toBeNull();
    expect(serializeListVNode({ ...base, arguments: 'nope' }, P, NO_LOCALS)).toBeNull();
    expect(serializeListVNode({ ...base, arguments: [{}] }, P, NO_LOCALS)).toBeNull();
  });

  it('source 无字符串 content → null', () => {
    const call = mkRenderListCall({ content: 123 }, mkRenderFn(mkVNode()));
    expect(serializeListVNode(call, P, NO_LOCALS)).toBeNull();
    const call2 = mkRenderListCall(undefined, mkRenderFn(mkVNode()));
    expect(serializeListVNode(call2, P, NO_LOCALS)).toBeNull();
  });

  it('第二参数不是 COMPOUND_EXPRESSION / children 非数组 → null', () => {
    expect(serializeListVNode(mkRenderListCall({ content: 'list' }, {}), P, NO_LOCALS)).toBeNull();
    expect(
      serializeListVNode(
        mkRenderListCall({ content: 'list' }, { type: NT.COMPOUND_EXPRESSION, children: 'x' }),
        P,
        NO_LOCALS,
      ),
    ).toBeNull();
  });

  it('children 里找不到含 => 的箭头函数头 → null', () => {
    const fn = { type: NT.COMPOUND_EXPRESSION, children: ['no arrow', mkVNode()] };
    expect(serializeListVNode(mkRenderListCall({ content: 'list' }, fn), P, NO_LOCALS)).toBeNull();
  });

  it('箭头函数头无法解析出参数（畸形）→ null', () => {
    const fn = mkRenderFn(mkVNode(), '(a)) => b');
    expect(serializeListVNode(mkRenderListCall({ content: 'list' }, fn), P, NO_LOCALS)).toBeNull();
  });

  it('参数列表为空 → null', () => {
    const fn = mkRenderFn(mkVNode(), '() => { ');
    expect(serializeListVNode(mkRenderListCall({ content: 'list' }, fn), P, NO_LOCALS)).toBeNull();
  });

  it('children 里找不到 VNODE_CALL → null', () => {
    const fn = {
      type: NT.COMPOUND_EXPRESSION,
      children: ['(item) => { ', { type: NT.TEXT }, ' }'],
    };
    expect(serializeListVNode(mkRenderListCall({ content: 'list' }, fn), P, NO_LOCALS)).toBeNull();
  });

  it('内层 vnode 无法序列化 → null', () => {
    const bad = { type: NT.VNODE_CALL, tag: 42 };
    const fn = mkRenderFn(bad);
    expect(serializeListVNode(mkRenderListCall({ content: 'list' }, fn), P, NO_LOCALS)).toBeNull();
  });

  it('合法输入 → 产出 map 表达式', () => {
    const call = mkRenderListCall({ content: 'items' }, mkRenderFn(mkVNode()));
    const out = serializeListVNode(call, P, NO_LOCALS);
    expect(out).toContain('.map((item,i)=>');
    expect(out).toContain('createVNode');
  });
});

// ============================================================
// base: serializeConditionalVNode
// ============================================================
describe('serialize battery (base): serializeConditionalVNode 严格模式边界', () => {
  const cond = (extra: Record<string, unknown>): Record<string, unknown> => ({
    type: NT.JS_CONDITIONAL_EXPRESSION,
    ...extra,
  });

  it('无 test → null', () => {
    expect(serializeConditionalVNode(null, P, NO_LOCALS)).toBeNull();
    expect(serializeConditionalVNode(cond({}), P, NO_LOCALS)).toBeNull();
  });

  it('test 无法取出表达式内容 → null', () => {
    // 非 SIMPLE / 非 COMPOUND 的畸形 test 节点
    const bad = cond({ test: { type: 999 }, consequent: mkVNode() });
    expect(serializeConditionalVNode(bad, P, NO_LOCALS)).toBeNull();
  });

  it('test 为 COMPOUND_EXPRESSION → 拼接内容', () => {
    const node = cond({
      test: {
        type: NT.COMPOUND_EXPRESSION,
        children: ['a', { type: NT.SIMPLE_EXPRESSION, content: '.b' }, 1],
      },
      consequent: mkVNode(),
    });
    const out = serializeConditionalVNode(node, P, NO_LOCALS);
    expect(out).toContain('_ctx.a.b');
  });

  it('consequent 无法序列化 → null', () => {
    const node = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'ok' },
      consequent: { type: NT.VNODE_CALL, tag: 7 },
    });
    expect(serializeConditionalVNode(node, P, NO_LOCALS)).toBeNull();
  });

  it('无 alternate → 三元以 null 收尾', () => {
    const node = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'ok' },
      consequent: mkVNode(),
    });
    const out = serializeConditionalVNode(node, P, NO_LOCALS);
    expect(out).toMatch(/\?.*:null\)$/);
  });

  it('alternate 为 VNODE_CALL 且可序列化 → 用其代码', () => {
    const node = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'ok' },
      consequent: mkVNode(),
      alternate: mkVNode({ tag: '"span"' }),
    });
    const out = serializeConditionalVNode(node, P, NO_LOCALS);
    expect(out).toContain('"span"');
  });

  it('alternate 为 VNODE_CALL 但不可序列化 → null', () => {
    const node = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'ok' },
      consequent: mkVNode(),
      alternate: { type: NT.VNODE_CALL, tag: 1 },
    });
    expect(serializeConditionalVNode(node, P, NO_LOCALS)).toBeNull();
  });

  it('alternate 为嵌套条件表达式 → 递归序列化', () => {
    const nested = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'b' },
      consequent: mkVNode({ tag: '"nested"' }),
    });
    const node = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'a' },
      consequent: mkVNode(),
      alternate: { type: NT.JS_CONDITIONAL_EXPRESSION, ...nested },
    });
    const out = serializeConditionalVNode(node, P, NO_LOCALS);
    expect(out).toContain('"nested"');
  });

  it('alternate 为嵌套条件但递归失败 → null', () => {
    const nested = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'b' },
      consequent: { type: NT.VNODE_CALL, tag: 0 },
    });
    const node = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'a' },
      consequent: mkVNode(),
      alternate: { type: NT.JS_CONDITIONAL_EXPRESSION, ...nested },
    });
    expect(serializeConditionalVNode(node, P, NO_LOCALS)).toBeNull();
  });

  it('alternate 为未知类型 → null', () => {
    const node = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'ok' },
      consequent: mkVNode(),
      alternate: { type: 123 },
    });
    expect(serializeConditionalVNode(node, P, NO_LOCALS)).toBeNull();
  });
});

// ============================================================
// base: serializeVNodeCall / Children / Child
// ============================================================
describe('serialize battery (base): serializeVNodeCall 严格模式边界', () => {
  it('非 VNODE_CALL / tag 非字符串 / tag 为空 → null', () => {
    expect(serializeVNodeCall(null, P, NO_LOCALS)).toBeNull();
    expect(serializeVNodeCall({ type: NT.ELEMENT }, P, NO_LOCALS)).toBeNull();
    expect(serializeVNodeCall({ type: NT.VNODE_CALL, tag: 1 }, P, NO_LOCALS)).toBeNull();
    expect(serializeVNodeCall({ type: NT.VNODE_CALL, tag: '' }, P, NO_LOCALS)).toBeNull();
  });

  it('props 非 JS_OBJECT_EXPRESSION → null', () => {
    expect(serializeVNodeCall(mkVNode({ props: { type: NT.TEXT } }), P, NO_LOCALS)).toBeNull();
    expect(
      serializeVNodeCall(mkVNode({ props: { type: NT.JS_OBJECT_EXPRESSION } }), P, NO_LOCALS),
    ).toBeNull();
  });

  it('props 里出现非 JS_PROPERTY / key-value 缺 content → null', () => {
    const bad1 = mkVNode({
      props: { type: NT.JS_OBJECT_EXPRESSION, properties: [{ type: NT.TEXT }] },
    });
    expect(serializeVNodeCall(bad1, P, NO_LOCALS)).toBeNull();

    const bad2 = mkVNode({
      props: { type: NT.JS_OBJECT_EXPRESSION, properties: [{ type: NT.JS_PROPERTY, key: {} }] },
    });
    expect(serializeVNodeCall(bad2, P, NO_LOCALS)).toBeNull();
  });

  it('合法 props → 生成对象字面量', () => {
    const node = mkVNode({
      props: {
        type: NT.JS_OBJECT_EXPRESSION,
        properties: [{ type: NT.JS_PROPERTY, key: { content: '"id"' }, value: { content: 'x' } }],
      },
    });
    const out = serializeVNodeCall(node, P, NO_LOCALS);
    expect(out).toContain('"id":');
  });

  it('children 无法序列化 → null', () => {
    const node = mkVNode({ children: [{ type: 999 }] });
    expect(serializeVNodeCall(node, P, NO_LOCALS)).toBeNull();
  });

  it('isComponent → tag 前缀化', () => {
    const node = mkVNode({ isComponent: true, tag: 'Inner' });
    const out = serializeVNodeCall(node, P, NO_LOCALS);
    expect(out).toContain('_ctx.Inner');
  });
});

describe('serialize battery (base): serializeVNodeCallChildren 严格模式边界', () => {
  it('undefined / null → "null"', () => {
    expect(serializeVNodeCallChildren(undefined, P, NO_LOCALS)).toBe('null');
    expect(serializeVNodeCallChildren(null, P, NO_LOCALS)).toBe('null');
  });

  it('字符串：空白 → "null"；非空 → Text vnode', () => {
    expect(serializeVNodeCallChildren('   ', P, NO_LOCALS)).toBe('null');
    expect(serializeVNodeCallChildren('hi', P, NO_LOCALS)).toContain('createVNode(Text');
  });

  it('数组：空数组 → "null"；含不可序列化项 → null', () => {
    expect(serializeVNodeCallChildren([], P, NO_LOCALS)).toBe('null');
    expect(serializeVNodeCallChildren([{ type: 999 }], P, NO_LOCALS)).toBeNull();
  });

  it('数组：逐项序列化', () => {
    const child = {
      type: NT.JS_CALL_EXPRESSION,
      callee: 'TO_DISPLAY_STRING',
      arguments: [{ content: 'x' }],
    };
    expect(serializeVNodeCallChildren([child], P, NO_LOCALS)).toContain('createVNode(Text');
  });

  it('单个非数组 child → 包成数组；失败 → null', () => {
    const ok = { type: NT.VNODE_CALL, tag: '"p"' };
    expect(serializeVNodeCallChildren(ok, P, NO_LOCALS)).toContain('createVNode("p"');
    expect(serializeVNodeCallChildren({ type: 999 }, P, NO_LOCALS)).toBeNull();
  });
});

describe('serialize battery (base): serializeVNodeCallChild 严格模式边界', () => {
  it('falsy / 非对象 → null', () => {
    expect(serializeVNodeCallChild(null, P, NO_LOCALS)).toBeNull();
    expect(serializeVNodeCallChild('x', P, NO_LOCALS)).toBeNull();
    expect(serializeVNodeCallChild(42, P, NO_LOCALS)).toBeNull();
  });

  it('TO_DISPLAY_STRING 插值：callee 不匹配 / 无参数 → null', () => {
    expect(
      serializeVNodeCallChild(
        { type: NT.JS_CALL_EXPRESSION, callee: 'OTHER', arguments: [{ content: 'x' }] },
        P,
        NO_LOCALS,
      ),
    ).toBeNull();
    expect(
      serializeVNodeCallChild(
        { type: NT.JS_CALL_EXPRESSION, callee: 'TO_DISPLAY_STRING', arguments: [] },
        P,
        NO_LOCALS,
      ),
    ).toBeNull();
  });

  it('TO_DISPLAY_STRING 插值：合法 → Text vnode', () => {
    const out = serializeVNodeCallChild(
      { type: NT.JS_CALL_EXPRESSION, callee: 'TO_DISPLAY_STRING', arguments: [{ content: 'msg' }] },
      P,
      NO_LOCALS,
    );
    expect(out).toContain('createVNode(Text,null,_ctx.msg)');
  });

  it('嵌套 ELEMENT → 走元素序列化', () => {
    const out = serializeVNodeCallChild(mkElement(), P, NO_LOCALS);
    expect(out).toContain('createVNode(');
  });

  it('嵌套 VNODE_CALL → 递归序列化', () => {
    const out = serializeVNodeCallChild(mkVNode({ tag: '"p"' }), P, NO_LOCALS);
    expect(out).toContain('createVNode("p"');
  });

  it('未知类型 → null', () => {
    expect(serializeVNodeCallChild({ type: 999 }, P, NO_LOCALS)).toBeNull();
  });
});

// ============================================================
// optimized: 与 base 同构，但多出 usedRuntime / options 参数
// ============================================================
describe('serialize battery (opt): serializeListVNodeOptimized 严格模式边界', () => {
  it('非对象 / callee 不匹配 / arguments 不足 → null', () => {
    expect(serializeListVNodeOptimized(null, new Set(), OPTS, NO_LOCALS)).toBeNull();
    expect(
      serializeListVNodeOptimized(
        { type: NT.JS_CALL_EXPRESSION, callee: 'X' },
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
    expect(
      serializeListVNodeOptimized(
        { type: NT.JS_CALL_EXPRESSION, callee: 'RENDER_LIST', arguments: [{}] },
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
  });

  it('source 缺字符串 content → null', () => {
    const call = mkRenderListCall({ content: 1 }, mkRenderFn(mkVNode()));
    expect(serializeListVNodeOptimized(call, new Set(), OPTS, NO_LOCALS)).toBeNull();
  });

  it('第二参数非 COMPOUND / children 非数组 → null', () => {
    expect(
      serializeListVNodeOptimized(
        mkRenderListCall({ content: 'l' }, {}),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
  });

  it('无箭头函数头 / 无法解析参数 / 参数为空 → null', () => {
    const noHead = { type: NT.COMPOUND_EXPRESSION, children: ['x', mkVNode()] };
    expect(
      serializeListVNodeOptimized(
        mkRenderListCall({ content: 'l' }, noHead),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
    expect(
      serializeListVNodeOptimized(
        mkRenderListCall({ content: 'l' }, mkRenderFn(mkVNode(), '(a)) => b')),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
    expect(
      serializeListVNodeOptimized(
        mkRenderListCall({ content: 'l' }, mkRenderFn(mkVNode(), '() => { ')),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
  });

  it('找不到 VNODE_CALL / 内层序列化失败 → null', () => {
    const noVn = {
      type: NT.COMPOUND_EXPRESSION,
      children: ['(item) => { ', { type: NT.TEXT }, ' }'],
    };
    expect(
      serializeListVNodeOptimized(
        mkRenderListCall({ content: 'l' }, noVn),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
    expect(
      serializeListVNodeOptimized(
        mkRenderListCall({ content: 'l' }, mkRenderFn({ type: NT.VNODE_CALL, tag: 3 })),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
  });

  it('合法输入 → usedRuntime 登记 createVNode', () => {
    const used = new Set<string>();
    const out = serializeListVNodeOptimized(
      mkRenderListCall({ content: 'items' }, mkRenderFn(mkVNode())),
      used,
      OPTS,
      NO_LOCALS,
    );
    expect(out).toContain('.map((item,i)=>');
    expect(used.has('createVNode')).toBe(true);
  });
});

describe('serialize battery (opt): serializeConditionalVNodeOptimized 严格模式边界', () => {
  const cond = (extra: Record<string, unknown>) => ({
    type: NT.JS_CONDITIONAL_EXPRESSION,
    ...extra,
  });

  it('无 test / test 无内容 → null', () => {
    expect(serializeConditionalVNodeOptimized(null, new Set(), OPTS, NO_LOCALS)).toBeNull();
    expect(serializeConditionalVNodeOptimized(cond({}), new Set(), OPTS, NO_LOCALS)).toBeNull();
    // 空 COMPOUND test → getExpContent 返回 '' → 触发 `if (!testExp) return null`
    expect(
      serializeConditionalVNodeOptimized(
        cond({ test: { type: NT.COMPOUND_EXPRESSION, children: [] }, consequent: mkVNode() }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
  });

  // ⚠️ 与 base 版的行为分歧（现状记录，非期望行为）：
  // base 的 getExpContent 有 `node.type !== COMPOUND || !Array.isArray(children)` 守卫
  // （注释说明该守卫用于避免局部失败放大为整个编译中断）；
  // opt 版同名助手**没有**该守卫 ⇒ 畸形 test 节点会直接抛 TypeError。
  // 见 opt 文件 getExpContent()。
  it('（现状）畸形 test 节点在 opt 版会抛错，而非返回 null', () => {
    expect(() =>
      serializeConditionalVNodeOptimized(
        cond({ test: { type: 999 }, consequent: mkVNode() }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toThrow();
  });

  it('test 为 COMPOUND → 拼接', () => {
    const node = cond({
      test: {
        type: NT.COMPOUND_EXPRESSION,
        children: ['a', { type: NT.SIMPLE_EXPRESSION, content: '.b' }],
      },
      consequent: mkVNode(),
    });
    expect(serializeConditionalVNodeOptimized(node, new Set(), OPTS, NO_LOCALS)).toContain(
      '_c.a.b',
    );
  });

  it('consequent 失败 → null', () => {
    const node = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'ok' },
      consequent: { type: NT.VNODE_CALL, tag: 0 },
    });
    expect(serializeConditionalVNodeOptimized(node, new Set(), OPTS, NO_LOCALS)).toBeNull();
  });

  it('无 alternate / VNODE_CALL alternate / 嵌套 alternate / 未知 alternate', () => {
    const base = {
      test: { type: NT.SIMPLE_EXPRESSION, content: 'ok' },
      consequent: mkVNode(),
    };
    expect(serializeConditionalVNodeOptimized(cond(base), new Set(), OPTS, NO_LOCALS)).toMatch(
      /:null\)$/,
    );

    expect(
      serializeConditionalVNodeOptimized(
        cond({ ...base, alternate: mkVNode({ tag: '"span"' }) }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toContain('"span"');

    // VNODE_CALL alternate 序列化失败
    expect(
      serializeConditionalVNodeOptimized(
        cond({ ...base, alternate: { type: NT.VNODE_CALL, tag: 0 } }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();

    // 嵌套条件 alternate（成功）
    const nested = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'b' },
      consequent: mkVNode({ tag: '"nested"' }),
    });
    expect(
      serializeConditionalVNodeOptimized(
        cond({ ...base, alternate: { type: NT.JS_CONDITIONAL_EXPRESSION, ...nested } }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toContain('"nested"');

    // 嵌套条件 alternate（递归失败）
    const nestedBad = cond({
      test: { type: NT.SIMPLE_EXPRESSION, content: 'b' },
      consequent: { type: NT.VNODE_CALL, tag: 0 },
    });
    expect(
      serializeConditionalVNodeOptimized(
        cond({ ...base, alternate: { type: NT.JS_CONDITIONAL_EXPRESSION, ...nestedBad } }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();

    // 未知 alternate 类型
    expect(
      serializeConditionalVNodeOptimized(
        cond({ ...base, alternate: { type: 123 } }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
  });
});

describe('serialize battery (opt): serializeVNodeCall/Children/Child 严格模式边界', () => {
  it('serializeVNodeCallOptimized：非法输入链', () => {
    expect(serializeVNodeCallOptimized(null, new Set(), OPTS, NO_LOCALS)).toBeNull();
    expect(
      serializeVNodeCallOptimized({ type: NT.ELEMENT }, new Set(), OPTS, NO_LOCALS),
    ).toBeNull();
    expect(
      serializeVNodeCallOptimized({ type: NT.VNODE_CALL, tag: '' }, new Set(), OPTS, NO_LOCALS),
    ).toBeNull();

    // props 非对象表达式
    expect(
      serializeVNodeCallOptimized(
        mkVNode({ props: { type: NT.TEXT } }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
    expect(
      serializeVNodeCallOptimized(
        mkVNode({ props: { type: NT.JS_OBJECT_EXPRESSION } }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();

    // prop 不是 JS_PROPERTY / key-value 缺 content
    expect(
      serializeVNodeCallOptimized(
        mkVNode({ props: { type: NT.JS_OBJECT_EXPRESSION, properties: [{ type: NT.TEXT }] } }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
    expect(
      serializeVNodeCallOptimized(
        mkVNode({
          props: { type: NT.JS_OBJECT_EXPRESSION, properties: [{ type: NT.JS_PROPERTY, key: {} }] },
        }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();

    // children 失败
    expect(
      serializeVNodeCallOptimized(
        mkVNode({ children: [{ type: 999 }] }),
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
  });

  it('serializeVNodeCallOptimized：合法 props + 组件 tag', () => {
    const used = new Set<string>();
    const node = mkVNode({
      isComponent: true,
      tag: 'Inner',
      props: {
        type: NT.JS_OBJECT_EXPRESSION,
        properties: [{ type: NT.JS_PROPERTY, key: { content: '"id"' }, value: { content: 'x' } }],
      },
    });
    const out = serializeVNodeCallOptimized(node, used, OPTS, NO_LOCALS);
    expect(out).toContain('_c.Inner');
    expect(out).toContain('"id":');
    expect(used.has('createVNode')).toBe(true);
  });

  it('serializeVNodeCallChildrenOptimized：null / 空白串 / 空数组 / 失败数组', () => {
    expect(serializeVNodeCallChildrenOptimized(undefined, new Set(), OPTS, NO_LOCALS)).toBe('null');
    expect(serializeVNodeCallChildrenOptimized(null, new Set(), OPTS, NO_LOCALS)).toBe('null');
    expect(serializeVNodeCallChildrenOptimized('   ', new Set(), OPTS, NO_LOCALS)).toBe('null');

    const used = new Set<string>();
    // 默认 useShortNames=true ⇒ 输出短别名 V(T,...)，但 usedRuntime 登记全名
    expect(serializeVNodeCallChildrenOptimized('hi', used, OPTS, NO_LOCALS)).toContain('V(T');
    expect(used.has('Text')).toBe(true);
    expect(used.has('createVNode')).toBe(true);

    expect(serializeVNodeCallChildrenOptimized([], new Set(), OPTS, NO_LOCALS)).toBe('null');
    expect(
      serializeVNodeCallChildrenOptimized([{ type: 999 }], new Set(), OPTS, NO_LOCALS),
    ).toBeNull();
  });

  it('serializeVNodeCallChildrenOptimized：单 child 成功/失败', () => {
    const ok = { type: NT.VNODE_CALL, tag: '"p"' };
    expect(serializeVNodeCallChildrenOptimized(ok, new Set(), OPTS, NO_LOCALS)).toContain('"p"');
    expect(
      serializeVNodeCallChildrenOptimized({ type: 999 }, new Set(), OPTS, NO_LOCALS),
    ).toBeNull();
  });

  it('serializeVNodeCallChildOptimized：falsy / callee 不匹配 / 无参数 / 合法 / ELEMENT / VNODE_CALL / 未知', () => {
    expect(serializeVNodeCallChildOptimized(null, new Set(), OPTS, NO_LOCALS)).toBeNull();
    expect(serializeVNodeCallChildOptimized(7, new Set(), OPTS, NO_LOCALS)).toBeNull();
    expect(
      serializeVNodeCallChildOptimized(
        { type: NT.JS_CALL_EXPRESSION, callee: 'OTHER', arguments: [{ content: 'x' }] },
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();
    expect(
      serializeVNodeCallChildOptimized(
        { type: NT.JS_CALL_EXPRESSION, callee: 'TO_DISPLAY_STRING', arguments: [] },
        new Set(),
        OPTS,
        NO_LOCALS,
      ),
    ).toBeNull();

    const used = new Set<string>();
    expect(
      serializeVNodeCallChildOptimized(
        {
          type: NT.JS_CALL_EXPRESSION,
          callee: 'TO_DISPLAY_STRING',
          arguments: [{ content: 'msg' }],
        },
        used,
        OPTS,
        NO_LOCALS,
      ),
    ).toContain('_c.msg');

    expect(serializeVNodeCallChildOptimized(mkElement(), new Set(), OPTS, NO_LOCALS)).toContain(
      'V(',
    );
    expect(
      serializeVNodeCallChildOptimized(mkVNode({ tag: '"p"' }), new Set(), OPTS, NO_LOCALS),
    ).toContain('"p"');
    expect(serializeVNodeCallChildOptimized({ type: 999 }, new Set(), OPTS, NO_LOCALS)).toBeNull();
  });
});

// ============================================================
// buildItemComponentProps
// ============================================================
describe('serialize battery (opt): buildItemComponentProps', () => {
  it('无 props → 空对象字面量', () => {
    expect(buildItemComponentProps(mkVNode() as never, NO_LOCALS)).toBe('{}');
  });

  it('props 非 JS_OBJECT_EXPRESSION → 空对象', () => {
    const node = { type: NT.VNODE_CALL, tag: '"C"', props: { type: NT.TEXT } };
    expect(buildItemComponentProps(node as never, NO_LOCALS)).toBe('{}');
  });

  it('properties 非数组 → 空对象', () => {
    const node = {
      type: NT.VNODE_CALL,
      tag: '"C"',
      props: { type: NT.JS_OBJECT_EXPRESSION, properties: 'x' },
    };
    expect(buildItemComponentProps(node as never, NO_LOCALS)).toBe('{}');
  });

  it('跳过非 JS_PROPERTY / key 与 value 均无法取出 → 空对象', () => {
    const noProp = {
      type: NT.VNODE_CALL,
      tag: '"C"',
      props: { type: NT.JS_OBJECT_EXPRESSION, properties: [{ type: NT.TEXT }] },
    };
    expect(buildItemComponentProps(noProp as never, NO_LOCALS)).toBe('{}');

    const noKeyVal = {
      type: NT.VNODE_CALL,
      tag: '"C"',
      props: { type: NT.JS_OBJECT_EXPRESSION, properties: [{ type: NT.JS_PROPERTY }] },
    };
    expect(buildItemComponentProps(noKeyVal as never, NO_LOCALS)).toBe('{}');
  });

  it('普通 prop（key 字符串 + value 字符串）→ 前缀化', () => {
    const node = {
      type: NT.VNODE_CALL,
      tag: '"C"',
      props: {
        type: NT.JS_OBJECT_EXPRESSION,
        properties: [
          { type: NT.JS_PROPERTY, key: { content: 'title' }, value: 'hello' },
          {
            type: NT.JS_PROPERTY,
            key: { content: '"id"' },
            value: { type: NT.SIMPLE_EXPRESSION, content: 'x' },
          },
        ],
      },
    };
    const out = buildItemComponentProps(node as never, NO_LOCALS);
    expect(out).toContain('"title"');
    expect(out).toContain('"id"');
  });

  it('key 为字符串形态 / key 为 key 字面量 → 跳过', () => {
    const node = {
      type: NT.VNODE_CALL,
      tag: '"C"',
      props: {
        type: NT.JS_OBJECT_EXPRESSION,
        properties: [
          { type: NT.JS_PROPERTY, key: 'rawKey', value: 'v' },
          { type: NT.JS_PROPERTY, key: { content: 'key' }, value: 'v' },
        ],
      },
    };
    const out = buildItemComponentProps(node as never, NO_LOCALS);
    expect(out).toContain('"rawKey"');
    expect(out).not.toContain('"key"');
  });

  it('value 非字符串对象且无 content → 前缀化空串', () => {
    const node = {
      type: NT.VNODE_CALL,
      tag: '"C"',
      props: {
        type: NT.JS_OBJECT_EXPRESSION,
        properties: [{ type: NT.JS_PROPERTY, key: { content: 'k' }, value: {} }],
      },
    };
    expect(() => buildItemComponentProps(node as never, NO_LOCALS)).not.toThrow();
  });
});

// ============================================================
// 未覆盖补齐：createVNode 常量别名分支（useShortNames=false）
// ============================================================
describe('serialize battery (opt): useShortNames=false 走全名分支', () => {
  it('serializeVNodeCallOptimized 使用全名 createVNode', () => {
    const out = serializeVNodeCallOptimized(
      mkVNode(),
      new Set(),
      { mode: 'signal', useShortNames: false },
      NO_LOCALS,
    );
    expect(out).toContain('createVNode(');
  });

  it('children 字符串走全名 createVNode/Text', () => {
    const out = serializeVNodeCallChildrenOptimized(
      'hello',
      new Set(),
      { mode: 'signal', useShortNames: false },
      NO_LOCALS,
    );
    expect(out).toContain('createVNode(Text');
  });
});
