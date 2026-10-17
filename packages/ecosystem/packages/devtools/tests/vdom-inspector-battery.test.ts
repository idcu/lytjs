// @vitest-environment jsdom
/**
 * 行为级判据：`@lytjs/devtools` 的 **VDOM 节点树检查器**（`src/vdomInspector.ts`，381 行）
 *
 * ## 为什么要有这条
 *
 * 该模块 14 个函数此前**一条判据都没有**；而 `devtools.ts`（854 行的 `DevTools` 主类）
 * 在 VDOM 标签页里用了 `getVDOMTree` / `getVDOMStats` / `serializeVDOMTree`，
 * 面板文案还写着「Use `registerVDOMRoot()` to register your VDOM roots.」
 * ⇒ 它是**活代码**，且被面板**明确承诺**给用户。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Text, Fragment } from '@lytjs/vdom';
import {
  registerVDOMRoot,
  unregisterVDOMRoot,
  getVDOMRoots,
  getVDOMNodeById,
  getVDOMTree,
  findVDOMNodesByTag,
  findVDOMNodesByProp,
  getVDOMStats,
  clearVDOMRegistry,
  serializeVDOMNode,
  serializeVDOMTree,
  getVDOMPath,
  inspectVDOMNode,
  highlightVDOMNode,
} from '../src/vdomInspector';
import type { VDOMNodeInfo } from '../src/vdomInspector';

beforeEach(() => {
  clearVDOMRegistry();
});

// ==================== 造 vnode 的小工具 ====================

const text = (s: string) => ({
  type: Text,
  children: s,
  props: null,
  el: null,
  key: null,
  ref: null,
});

const el = (tag: string, props: Record<string, unknown> | null, children: unknown[]) => ({
  type: tag,
  props,
  children,
  el: null,
  key: null,
  ref: null,
});

const comp = (name: string, children: unknown[] = []) => ({
  type: { name },
  props: null,
  children,
  el: null,
  key: null,
  ref: null,
});

// ==================== 注册与结构 ====================

describe('registerVDOMRoot / 树结构', () => {
  it('返回 id，且根节点可从 roots / nodes 取到', () => {
    const id = registerVDOMRoot(el('div', null, []) as never);

    expect(id).toMatch(/^vdom-/);
    expect(getVDOMRoots()).toHaveLength(1);
    expect(getVDOMNodeById(id)!.tagName).toBe('div');
    expect(getVDOMTree()).toHaveLength(1);
  });

  it('★ 根节点的 parentId 必须为 undefined（否则 getVDOMPath 会沿自身无限回溯）', () => {
    const id = registerVDOMRoot(el('div', null, []) as never);

    expect(getVDOMNodeById(id)!.parentId).toBeUndefined();
  });

  it('子节点带 parentId 与递增 depth', () => {
    const id = registerVDOMRoot(el('div', null, [el('span', null, [])]) as never);
    const root = getVDOMNodeById(id)!;
    const child = root.children[0]!;

    expect(child.parentId).toBe(id);
    expect(root.depth).toBe(0);
    expect(child.depth).toBe(1);
  });

  it('element / component / text 三种类型都能识别', () => {
    const id = registerVDOMRoot(el('div', null, [comp('MyComp'), text('hi')]) as never);
    const root = getVDOMNodeById(id)!;

    expect(root.type).toBe('element');
    expect(root.isComponent).toBe(false);
    expect(root.children[0]!.type).toBe('component');
    expect(root.children[0]!.isComponent).toBe(true);
    expect(root.children[0]!.tagName).toBe('MyComp');
    // ★ 真实 Text vnode 的 type 是 **symbol**，必须归类为 text（修复前是 unknown）
    expect(root.children[1]!.type).toBe('text');
    expect(root.children[1]!.text).toBe('hi');
  });

  it('props 里过滤掉事件与函数值', () => {
    const id = registerVDOMRoot(el('div', { id: 'x', onClick: () => {}, title: 't' }, []) as never);
    const props = getVDOMNodeById(id)!.props!;

    expect(props.id).toBe('x');
    expect(props.title).toBe('t');
    expect(props.onClick).toBeUndefined();
  });

  it('key / ref 被保留（symbol key 视为无 key）', () => {
    const withKey = { ...el('li', null, []), key: 7, ref: 'myRef' };
    const id = registerVDOMRoot(withKey as never);
    const node = getVDOMNodeById(id)!;

    expect(node.key).toBe(7);
    expect(node.ref).toBe('myRef');
  });

  it('el 是 HTMLElement 时记录 domElement', () => {
    const dom = document.createElement('div');
    const vnode = { ...el('div', null, []), el: dom };
    const id = registerVDOMRoot(vnode as never);

    expect(getVDOMNodeById(id)!.domElement).toBe(dom);
  });
});

// ==================== 注销与清理 ====================

describe('unregisterVDOMRoot / clearVDOMRegistry', () => {
  it('注销根节点会**连带**清理所有后代', () => {
    const id = registerVDOMRoot(el('div', null, [el('span', null, [text('a')])]) as never);
    const root = getVDOMNodeById(id)!;
    const childId = root.children[0]!.id;
    const grandChildId = root.children[0]!.children[0]!.id;

    unregisterVDOMRoot(id);

    expect(getVDOMRoots()).toHaveLength(0);
    expect(getVDOMNodeById(id)).toBeUndefined();
    expect(getVDOMNodeById(childId)).toBeUndefined();
    expect(getVDOMNodeById(grandChildId)).toBeUndefined();
  });

  it('clearVDOMRegistry 清空全部并重置统计', () => {
    registerVDOMRoot(el('div', null, []) as never);
    clearVDOMRegistry();

    expect(getVDOMRoots()).toHaveLength(0);
    expect(getVDOMStats().totalNodes).toBe(0);
  });
});

// ==================== 查询 ====================

describe('findVDOMNodesByTag / findVDOMNodesByProp', () => {
  it('按标签名查找（跨层级）', () => {
    registerVDOMRoot(el('div', null, [el('span', null, []), el('span', null, [])]) as never);

    expect(findVDOMNodesByTag('span')).toHaveLength(2);
    expect(findVDOMNodesByTag('div')).toHaveLength(1);
    expect(findVDOMNodesByTag('nope')).toHaveLength(0);
  });

  it('按 prop 名查找；给 value 时还要求值相等', () => {
    registerVDOMRoot(
      el('div', null, [el('a', { href: '/x' }, []), el('a', { href: '/y' }, [])]) as never,
    );

    expect(findVDOMNodesByProp('href')).toHaveLength(2);
    expect(findVDOMNodesByProp('href', '/x')).toHaveLength(1);
    expect(findVDOMNodesByProp('href', '/z')).toHaveLength(0);
  });

  it('★ 只认**自有属性**：原型链上的名字（如 toString）不得命中', () => {
    registerVDOMRoot(el('div', { id: 'x' }, []) as never);

    expect(findVDOMNodesByProp('toString')).toHaveLength(0);
    expect(findVDOMNodesByProp('constructor')).toHaveLength(0);
  });
});

// ==================== 统计 ====================

describe('getVDOMStats', () => {
  it('分类计数与 maxDepth 正确', () => {
    registerVDOMRoot(el('div', null, [el('span', null, [text('a')]), comp('C')]) as never);

    const s = getVDOMStats();
    expect(s.rootCount).toBe(1);
    expect(s.maxDepth).toBe(2);
    expect(s.componentCount).toBe(1);
    expect(s.elementCount).toBe(2); // div + span
    expect(s.textCount).toBe(1);
    // 4 = div + span + text + C（修复前根会被注册**两次** ⇒ 这里会是 5）
    expect(s.totalNodes).toBe(4);
  });

  it('空注册表时全 0', () => {
    expect(getVDOMStats()).toEqual({
      totalNodes: 0,
      rootCount: 0,
      maxDepth: 0,
      componentCount: 0,
      elementCount: 0,
      textCount: 0,
    });
  });
});

// ==================== 序列化 ====================

describe('serializeVDOMNode / serializeVDOMTree', () => {
  it('文本节点输出其内容', () => {
    const id = registerVDOMRoot(el('div', null, [text('hello')]) as never);
    const node = getVDOMNodeById(id)!;

    expect(serializeVDOMNode(node)).toContain('hello');
  });

  it('元素节点输出标签名与 key', () => {
    const id = registerVDOMRoot({ ...el('div', { id: 'x' }, []), key: 'k1' } as never);

    const out = serializeVDOMNode(getVDOMNodeById(id)!);
    expect(out).toContain('<div');
    expect(out).toContain('key="k1"');
  });

  it('空元素标注 (empty)', () => {
    const id = registerVDOMRoot(el('div', null, []) as never);

    expect(serializeVDOMNode(getVDOMNodeById(id)!)).toContain('(empty)');
  });

  it('无根时给出占位文案', () => {
    expect(serializeVDOMTree()).toBe('No VDOM roots registered.');
  });

  it('整树序列化含统计信息', () => {
    registerVDOMRoot(el('div', null, [text('hi')]) as never);

    const out = serializeVDOMTree();
    expect(out).toContain('VDOM Tree');
    expect(out).toContain('Stats:');
    expect(out).toContain('Max depth:');
  });
});

// ==================== 路径 / 检视 / 高亮 ====================

describe('getVDOMPath / inspectVDOMNode / highlightVDOMNode', () => {
  it('★ 根节点路径长度为 1（修复前根 parentId 指向自身 ⇒ 会无限回溯）', () => {
    const id = registerVDOMRoot(el('div', null, [el('span', null, [])]) as never);

    expect(getVDOMPath(id).map((n) => n.tagName)).toEqual(['div']);
  });

  it('子节点路径为 [根, …, 自身]', () => {
    const id = registerVDOMRoot(el('div', null, [el('span', null, [])]) as never);
    const childId = getVDOMNodeById(id)!.children[0]!.id;

    expect(getVDOMPath(childId).map((n) => n.tagName)).toEqual(['div', 'span']);
  });

  it('inspectVDOMNode 返回节点 + 路径 + domElement', () => {
    const dom = document.createElement('div');
    const id = registerVDOMRoot({ ...el('div', null, []), el: dom } as never);

    const info = inspectVDOMNode(id);
    expect(info!.node.id).toBe(id);
    expect(info!.path).toHaveLength(1);
    expect(info!.domElement).toBe(dom);
  });

  it('inspectVDOMNode 对未知 id 返回 null', () => {
    expect(inspectVDOMNode('nope')).toBeNull();
  });

  it('highlightVDOMNode 设置描边并在 2s 后还原', () => {
    vi.useFakeTimers();
    const dom = document.createElement('div');
    const id = registerVDOMRoot({ ...el('div', null, []), el: dom } as never);

    highlightVDOMNode(id);
    expect(dom.style.outline).toContain('2px solid');

    vi.advanceTimersByTime(2000);
    expect(dom.style.outline).toBe('');
    vi.useRealTimers();
  });

  it('无 domElement 的节点高亮时不应抛', () => {
    const id = registerVDOMRoot(el('div', null, []) as never);

    expect(() => highlightVDOMNode(id)).not.toThrow();
  });
});

// ==================== Fragment ====================

describe('Fragment 等 symbol 类型', () => {
  it('Fragment 不应导致崩溃，且其子节点仍被收录', () => {
    const id = registerVDOMRoot({
      type: Fragment,
      props: null,
      children: [el('span', null, [])],
      el: null,
      key: null,
      ref: null,
    } as never);

    const root = getVDOMNodeById(id) as VDOMNodeInfo;
    expect(root).toBeDefined();
    expect(root.children).toHaveLength(1);
  });
});

// ==================== 包入口可达性 ====================

describe('包入口必须可达（面板文案承诺的 API）', () => {
  // `devtools.ts` 的 VDOM 标签页写着「Use registerVDOMRoot() to register your VDOM roots.」，
  // 而 `package.json` 只暴露 `.`（无深路径入口）+ `treeshake` ⇒ 未转出 = 用户根本拿不到。
  const VDOM_FNS = [
    'registerVDOMRoot',
    'unregisterVDOMRoot',
    'getVDOMRoots',
    'getVDOMNodeById',
    'getVDOMTree',
    'findVDOMNodesByTag',
    'findVDOMNodesByProp',
    'getVDOMStats',
    'clearVDOMRegistry',
    'serializeVDOMNode',
    'serializeVDOMTree',
    'getVDOMPath',
    'highlightVDOMNode',
    'inspectVDOMNode',
  ];

  it('★ index.ts 必须转出 vdomInspector 的 14 个函数（与 registerSignal / registerStore 对齐）', async () => {
    const pkg = (await import('../src/index')) as unknown as Record<string, unknown>;

    const missing = VDOM_FNS.filter((n) => typeof pkg[n] !== 'function');
    expect(missing).toEqual([]);
  });

  it('★ index.ts 必须转出 signalsInspector 里漏掉的两个', async () => {
    const pkg = (await import('../src/index')) as unknown as Record<string, unknown>;

    expect(typeof pkg.getSnapshot).toBe('function');
    expect(typeof pkg.recordPerformance).toBe('function');
  });
});
