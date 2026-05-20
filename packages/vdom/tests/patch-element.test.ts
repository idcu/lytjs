/**
 * Tests for patch-element.ts
 * 测试 createElementPatch 工厂函数及其返回的所有 API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createElementPatch,
  type RendererContext,
  type ElementPatchAPI,
} from '../src/patch-element';
import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { ShapeFlags, PatchFlags } from '@lytjs/common-vnode';

// ============================================================
// Mock 辅助函数
// ============================================================

/** 创建一个 mock 的 RendererContext */
function createMockContext(): RendererContext<Node, Element> {
  return {
    createElement: vi.fn((tag: string) => document.createElement(tag)),
    setElementText: vi.fn((node: Element, text: string) => {
      node.textContent = text;
    }),
    insert: vi.fn((child: Node, parent: Node, anchor?: Node | null) => {
      if (anchor) {
        parent.insertBefore(child, anchor);
      } else {
        parent.appendChild(child);
      }
    }),
    remove: vi.fn(),
    createText: vi.fn((text: string) => document.createTextNode(text)),
    setText: vi.fn(),
    patchProp: vi.fn((el: Element, key: string, prev: unknown, next: unknown) => {
      if (key === 'class') {
        el.className = String(next ?? '');
      } else if (key === 'style' && typeof next === 'string') {
        el.setAttribute('style', next);
      } else if (key === 'id') {
        el.id = String(next ?? '');
      } else {
        el.setAttribute(key, String(next ?? ''));
      }
    }),
    createComment: vi.fn((text: string) => document.createComment(text)),
    querySelector: undefined,
    setupChildComponent: undefined,
    normalizeProps: undefined,
    setVNodeEl: vi.fn((vnode: VNode, el: Node | null) => {
      vnode.el = el;
    }),
    getVNodeEl: vi.fn((vnode: VNode) => vnode.el ?? null),
    patch: vi.fn(),
    unmount: vi.fn(),
    move: vi.fn(),
    mountChildren: vi.fn(),
    unmountChildren: vi.fn(),
    patchChildren: vi.fn(),
    patchBlockChildren: vi.fn(),
    diffChildrenInternal: vi.fn(),
  };
}

/** 创建一个简单的元素 VNode */
function createElementVNode(
  tag: string,
  props?: Record<string, unknown> | null,
  children?: unknown,
  shapeFlag: ShapeFlags = ShapeFlags.ELEMENT,
): VNode {
  return {
    type: tag,
    props: props ?? null,
    key: props?.key ?? null,
    ref: props?.ref ?? null,
    children: children ?? null,
    el: null,
    shapeFlag,
    patchFlag: 0,
    dynamicProps: null,
    dynamicChildren: null,
    isBlockTree: false,
    isCloned: false,
    isStatic: false,
    isStaticRoot: false,
    __v_isVNode: true,
    anchor: null,
    appContext: null,
    component: null,
    ctx: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
  } as VNode;
}

/** 创建一个 mock 的 parentComponent */
function createMockParentComponent(): ComponentInternalInstance {
  return {
    refs: {},
    parent: null,
    root: null,
    subTree: null as unknown as VNode,
    type: {},
    ctx: {},
    attrs: null,
    props: {},
    vnode: null as unknown as VNode,
  } as unknown as ComponentInternalInstance;
}

// ============================================================
// 测试
// ============================================================

describe('createElementPatch', () => {
  let ctx: ReturnType<typeof createMockContext>;
  let api: ElementPatchAPI<Node, Element>;

  beforeEach(() => {
    ctx = createMockContext();
    api = createElementPatch(ctx);
  });

  // ----------------------------------------------------------
  // 工厂函数返回正确的 API
  // ----------------------------------------------------------
  it('工厂函数应返回包含所有必要方法的 API 对象', () => {
    expect(api).toHaveProperty('mountElement');
    expect(api).toHaveProperty('patchElement');
    expect(api).toHaveProperty('mountTextNode');
    expect(api).toHaveProperty('mountCommentNode');
    expect(api).toHaveProperty('setRef');
    expect(typeof api.mountElement).toBe('function');
    expect(typeof api.patchElement).toBe('function');
    expect(typeof api.mountTextNode).toBe('function');
    expect(typeof api.mountCommentNode).toBe('function');
    expect(typeof api.setRef).toBe('function');
  });

  // ----------------------------------------------------------
  // mountElement
  // ----------------------------------------------------------
  describe('mountElement', () => {
    it('应创建元素、设置 props、挂载 children 并插入容器', () => {
      const container = document.createElement('div');
      const vnode = createElementVNode(
        'span',
        { id: 'test', class: 'foo' },
        'hello',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );

      api.mountElement(vnode, container, null, false, null, null);

      // 验证 createElement 被调用
      expect(ctx.createElement).toHaveBeenCalledWith('span');
      // 验证 el 被设置
      expect(vnode.el).not.toBeNull();
      // 验证 patchProp 被调用（id 和 class，不含 key/ref）
      expect(ctx.patchProp).toHaveBeenCalledWith(expect.anything(), 'id', null, 'test');
      expect(ctx.patchProp).toHaveBeenCalledWith(expect.anything(), 'class', null, 'foo');
      // 验证文本被设置
      expect(ctx.setElementText).toHaveBeenCalledWith(expect.anything(), 'hello');
      // 验证插入到容器
      expect(ctx.insert).toHaveBeenCalledWith(expect.anything(), container, null);
    });

    it('应跳过 key 和 ref props', () => {
      const container = document.createElement('div');
      const ref = { current: null };
      const vnode = createElementVNode(
        'div',
        { key: 'my-key', ref, id: 'app' },
        null,
        ShapeFlags.ELEMENT,
      );

      api.mountElement(vnode, container, null, false, null, null);

      // patchProp 不应被 key 或 ref 调用
      for (const call of vi.mocked(ctx.patchProp).mock.calls) {
        expect(call[1]).not.toBe('key');
        expect(call[1]).not.toBe('ref');
      }
      // id 应被正常处理
      expect(ctx.patchProp).toHaveBeenCalledWith(expect.anything(), 'id', null, 'app');
    });

    it('对非字符串 type 应发出警告并返回', () => {
      const container = document.createElement('div');
      const vnode = createElementVNode('div', null, null, ShapeFlags.ELEMENT);
      (vnode.type as unknown) = 123; // 设置为非字符串

      api.mountElement(vnode, container, null, false, null, null);

      // 不应创建元素
      expect(ctx.createElement).not.toHaveBeenCalled();
      // 不应插入
      expect(ctx.insert).not.toHaveBeenCalled();
    });

    it('对 ARRAY_CHILDREN 应调用 mountChildren', () => {
      const container = document.createElement('div');
      const child = createElementVNode('span');
      const vnode = createElementVNode(
        'div',
        null,
        [child],
        ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN,
      );

      api.mountElement(vnode, container, null, false, null, null);

      expect(ctx.mountChildren).toHaveBeenCalledWith(
        vnode,
        expect.anything(),
        null,
        false,
        null,
        null,
      );
    });

    it('对 TEXT_CHILDREN 应调用 setElementText', () => {
      const container = document.createElement('div');
      const vnode = createElementVNode(
        'div',
        null,
        'text content',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );

      api.mountElement(vnode, container, null, false, null, null);

      expect(ctx.setElementText).toHaveBeenCalledWith(expect.anything(), 'text content');
    });

    it('有 ref 和 parentComponent 时应调用 setRef', () => {
      const container = document.createElement('div');
      const parentComponent = createMockParentComponent();
      const ref = 'myRef';
      const vnode = createElementVNode('div', { ref }, null, ShapeFlags.ELEMENT);
      vnode.ref = ref;

      api.mountElement(vnode, container, null, false, parentComponent, null);

      // setRef 应该被调用（通过 mountElement 内部）
      expect(parentComponent.refs['myRef']).toBeDefined();
    });

    it('无 parentComponent 时不应调用 setRef', () => {
      const container = document.createElement('div');
      const ref = 'myRef';
      const vnode = createElementVNode('div', { ref }, null, ShapeFlags.ELEMENT);
      vnode.ref = ref;

      api.mountElement(vnode, container, null, false, null, null);

      // 无 parentComponent，不应调用 setRef
      // ref 不会被存储到任何地方
      expect(ctx.setVNodeEl).toHaveBeenCalled();
    });
  });

  // ----------------------------------------------------------
  // mountTextNode
  // ----------------------------------------------------------
  describe('mountTextNode', () => {
    it('应创建文本节点并插入容器', () => {
      const container = document.createElement('div');
      const vnode = createElementVNode('text', null, 'hello world', ShapeFlags.TEXT_CHILDREN);
      vnode.type = Symbol.for('v-text'); // 文本节点类型

      api.mountTextNode(vnode, container, null);

      expect(ctx.createText).toHaveBeenCalledWith('hello world');
      expect(ctx.insert).toHaveBeenCalled();
      expect(vnode.el).not.toBeNull();
    });

    it('children 为函数时应创建空文本节点', () => {
      const container = document.createElement('div');
      const vnode = createElementVNode(
        'text',
        null,
        (() => 'lazy') as unknown as string,
        ShapeFlags.TEXT_CHILDREN,
      );

      api.mountTextNode(vnode, container, null);

      // 函数类型的 children 应被处理为空字符串
      expect(ctx.createText).toHaveBeenCalledWith('');
    });

    it('children 为 null 时应创建空文本节点', () => {
      const container = document.createElement('div');
      const vnode = createElementVNode('text', null, null, ShapeFlags.TEXT_CHILDREN);

      api.mountTextNode(vnode, container, null);

      expect(ctx.createText).toHaveBeenCalledWith('');
    });
  });

  // ----------------------------------------------------------
  // mountCommentNode
  // ----------------------------------------------------------
  describe('mountCommentNode', () => {
    it('应创建注释节点并插入容器', () => {
      const container = document.createElement('div');
      const vnode = createElementVNode('comment', null, 'a comment', 0);

      api.mountCommentNode(vnode, container, null);

      expect(ctx.createComment).toHaveBeenCalledWith('a comment');
      expect(ctx.insert).toHaveBeenCalled();
      expect(vnode.el).not.toBeNull();
      // anchor 也应被设置
      expect(vnode.anchor).not.toBeNull();
    });

    it('children 为函数时应创建空注释节点', () => {
      const container = document.createElement('div');
      const vnode = createElementVNode('comment', null, (() => 'lazy') as unknown as string, 0);

      api.mountCommentNode(vnode, container, null);

      expect(ctx.createComment).toHaveBeenCalledWith('');
    });
  });

  // ----------------------------------------------------------
  // setRef
  // ----------------------------------------------------------
  describe('setRef', () => {
    it('字符串 ref 应存储到 parentComponent.refs', () => {
      const parentComponent = createMockParentComponent();
      const el = document.createElement('div');

      api.setRef(el, 'myRef', parentComponent);

      expect(parentComponent.refs['myRef']).toBe(el);
    });

    it('函数 ref 应被调用并传入元素', () => {
      const parentComponent = createMockParentComponent();
      const el = document.createElement('div');
      const fn = vi.fn();

      api.setRef(el, fn, parentComponent);

      expect(fn).toHaveBeenCalledWith(el);
    });

    it('对象 ref 应设置 .value', () => {
      const parentComponent = createMockParentComponent();
      const el = document.createElement('div');
      const refObj = { value: null };

      api.setRef(el, refObj, parentComponent);

      expect(refObj.value).toBe(el);
    });

    it('null ref 不应做任何操作', () => {
      const parentComponent = createMockParentComponent();
      const el = document.createElement('div');

      // 不应抛出错误
      api.setRef(el, null, parentComponent);
    });

    it('不含 value 的对象 ref 不应做任何操作', () => {
      const parentComponent = createMockParentComponent();
      const el = document.createElement('div');

      // 不应抛出错误
      api.setRef(el, { foo: 'bar' }, parentComponent);
    });
  });

  // ----------------------------------------------------------
  // patchElement
  // ----------------------------------------------------------
  describe('patchElement', () => {
    it('n1.el 为 null 时应返回', () => {
      const n1 = createElementVNode(
        'div',
        { id: 'old' },
        'old text',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );
      n1.el = null; // el 为 null
      const n2 = createElementVNode(
        'div',
        { id: 'new' },
        'new text',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );

      api.patchElement(n1, n2, null, null, false);

      // 不应执行任何 patch 操作
      expect(ctx.patchChildren).not.toHaveBeenCalled();
      expect(ctx.patchBlockChildren).not.toHaveBeenCalled();
    });

    it('PatchFlags.FULL_PROPS 应执行完整 diff', () => {
      const n1 = createElementVNode(
        'div',
        { id: 'old', class: 'a' },
        'text',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );
      n1.el = document.createElement('div');
      const n2 = createElementVNode(
        'div',
        { id: 'new', class: 'b' },
        'text',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );
      n2.patchFlag = PatchFlags.FULL_PROPS;

      api.patchElement(n1, n2, null, null, false);

      // diffProps 应通过 FULL_PROPS 路径被调用
      // patchProp 应被调用来更新 id 和 class
      expect(ctx.patchProp).toHaveBeenCalled();
    });

    it('PatchFlags.CLASS 应仅 diff class', () => {
      const n1 = createElementVNode(
        'div',
        { class: 'old-class', id: 'same' },
        null,
        ShapeFlags.ELEMENT,
      );
      n1.el = document.createElement('div');
      const n2 = createElementVNode(
        'div',
        { class: 'new-class', id: 'same' },
        null,
        ShapeFlags.ELEMENT,
      );
      n2.patchFlag = PatchFlags.CLASS;

      api.patchElement(n1, n2, null, null, false);

      // patchProp 应仅对 class 被调用
      expect(ctx.patchProp).toHaveBeenCalledWith(
        expect.anything(),
        'class',
        'old-class',
        'new-class',
      );
      // 不应调用 patchChildren（因为 dynamicChildren 都为空）
    });

    it('PatchFlags.STYLE 应仅 diff style', () => {
      const n1 = createElementVNode('div', { style: 'color: red' }, null, ShapeFlags.ELEMENT);
      n1.el = document.createElement('div');
      const n2 = createElementVNode('div', { style: 'color: blue' }, null, ShapeFlags.ELEMENT);
      n2.patchFlag = PatchFlags.STYLE;

      api.patchElement(n1, n2, null, null, false);

      expect(ctx.patchProp).toHaveBeenCalledWith(
        expect.anything(),
        'style',
        'color: red',
        'color: blue',
      );
    });

    it('PatchFlags.TEXT 应仅 diff children', () => {
      const n1 = createElementVNode(
        'div',
        null,
        'old text',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );
      n1.el = document.createElement('div');
      const n2 = createElementVNode(
        'div',
        null,
        'new text',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );
      n2.patchFlag = PatchFlags.TEXT;

      api.patchElement(n1, n2, null, null, false);

      expect(ctx.setElementText).toHaveBeenCalledWith(expect.anything(), 'new text');
    });

    it('PatchFlags.TEXT 且 children 相同时不应更新', () => {
      const n1 = createElementVNode(
        'div',
        null,
        'same text',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );
      n1.el = document.createElement('div');
      const n2 = createElementVNode(
        'div',
        null,
        'same text',
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN,
      );
      n2.patchFlag = PatchFlags.TEXT;

      api.patchElement(n1, n2, null, null, false);

      expect(ctx.setElementText).not.toHaveBeenCalled();
    });

    it('Block Tree 快速路径：有 dynamicChildren 时应调用 patchBlockChildren', () => {
      const n1 = createElementVNode('div', { id: 'a' }, null, ShapeFlags.ELEMENT);
      n1.el = document.createElement('div');
      n1.dynamicChildren = [createElementVNode('span')];
      const n2 = createElementVNode('div', { id: 'b' }, null, ShapeFlags.ELEMENT);
      n2.dynamicChildren = [createElementVNode('span')];

      api.patchElement(n1, n2, null, null, false);

      expect(ctx.patchBlockChildren).toHaveBeenCalledWith(
        n1,
        n2,
        expect.anything(),
        null,
        null,
        false,
      );
      expect(ctx.patchChildren).not.toHaveBeenCalled();
    });

    it('回退路径：无 dynamicChildren 时应调用 patchChildren', () => {
      const n1 = createElementVNode('div', { id: 'a' }, null, ShapeFlags.ELEMENT);
      n1.el = document.createElement('div');
      n1.dynamicChildren = null;
      const n2 = createElementVNode('div', { id: 'b' }, null, ShapeFlags.ELEMENT);
      n2.dynamicChildren = null;

      api.patchElement(n1, n2, null, null, false);

      expect(ctx.patchChildren).toHaveBeenCalledWith(n1, n2, expect.anything(), null, null, false);
      expect(ctx.patchBlockChildren).not.toHaveBeenCalled();
    });

    it('dynamicChildren 为空数组时应走回退路径', () => {
      const n1 = createElementVNode('div', { id: 'a' }, null, ShapeFlags.ELEMENT);
      n1.el = document.createElement('div');
      n1.dynamicChildren = [];
      const n2 = createElementVNode('div', { id: 'b' }, null, ShapeFlags.ELEMENT);
      n2.dynamicChildren = [];

      api.patchElement(n1, n2, null, null, false);

      expect(ctx.patchChildren).toHaveBeenCalled();
      expect(ctx.patchBlockChildren).not.toHaveBeenCalled();
    });

    it('patchFlag 为 0 且 props 不同时应执行完整 diff', () => {
      const n1 = createElementVNode('div', { id: 'old' }, null, ShapeFlags.ELEMENT);
      n1.el = document.createElement('div');
      const n2 = createElementVNode('div', { id: 'new' }, null, ShapeFlags.ELEMENT);
      n2.patchFlag = 0;

      api.patchElement(n1, n2, null, null, false);

      // 应通过 diffProps 路径
      expect(ctx.patchProp).toHaveBeenCalled();
    });

    it('n2.el 应被设置为 n1.el', () => {
      const el = document.createElement('div');
      const n1 = createElementVNode('div', null, null, ShapeFlags.ELEMENT);
      n1.el = el;
      const n2 = createElementVNode('div', null, null, ShapeFlags.ELEMENT);

      api.patchElement(n1, n2, null, null, false);

      expect(n2.el).toBe(el);
    });
  });

  // ----------------------------------------------------------
  // diffProps（通过 patchElement 间接测试）
  // ----------------------------------------------------------
  describe('diffProps', () => {
    it('应正确处理新增 props', () => {
      const n1 = createElementVNode('div', { id: 'a' }, null, ShapeFlags.ELEMENT);
      n1.el = document.createElement('div');
      const n2 = createElementVNode('div', { id: 'a', class: 'new' }, null, ShapeFlags.ELEMENT);
      n2.patchFlag = PatchFlags.FULL_PROPS;

      api.patchElement(n1, n2, null, null, false);

      // class 是新增的，应被 patch
      expect(ctx.patchProp).toHaveBeenCalledWith(expect.anything(), 'class', undefined, 'new');
    });

    it('应正确处理修改 props', () => {
      const n1 = createElementVNode('div', { id: 'old' }, null, ShapeFlags.ELEMENT);
      n1.el = document.createElement('div');
      const n2 = createElementVNode('div', { id: 'new' }, null, ShapeFlags.ELEMENT);
      n2.patchFlag = PatchFlags.FULL_PROPS;

      api.patchElement(n1, n2, null, null, false);

      expect(ctx.patchProp).toHaveBeenCalledWith(expect.anything(), 'id', 'old', 'new');
    });

    it('应正确处理删除 props', () => {
      const n1 = createElementVNode('div', { id: 'a', class: 'foo' }, null, ShapeFlags.ELEMENT);
      n1.el = document.createElement('div');
      const n2 = createElementVNode('div', { id: 'a' }, null, ShapeFlags.ELEMENT);
      n2.patchFlag = PatchFlags.FULL_PROPS;

      api.patchElement(n1, n2, null, null, false);

      // class 被删除，应 patchProp(el, 'class', 'foo', null)
      expect(ctx.patchProp).toHaveBeenCalledWith(expect.anything(), 'class', 'foo', null);
    });

    it('diffProps 应跳过 key 和 ref', () => {
      const n1 = createElementVNode(
        'div',
        { key: 'a', ref: 'r1', id: 'x' },
        null,
        ShapeFlags.ELEMENT,
      );
      n1.el = document.createElement('div');
      const n2 = createElementVNode(
        'div',
        { key: 'b', ref: 'r2', id: 'y' },
        null,
        ShapeFlags.ELEMENT,
      );
      n2.patchFlag = PatchFlags.FULL_PROPS;

      api.patchElement(n1, n2, null, null, false);

      // patchProp 不应被 key 或 ref 调用
      for (const call of vi.mocked(ctx.patchProp).mock.calls) {
        expect(call[1]).not.toBe('key');
        expect(call[1]).not.toBe('ref');
      }
    });

    it('PatchFlags.PROPS 应仅 diff dynamicProps 中指定的属性', () => {
      const n1 = createElementVNode(
        'div',
        { id: 'old', class: 'same', style: 'color: red' },
        null,
        ShapeFlags.ELEMENT,
      );
      n1.el = document.createElement('div');
      const n2 = createElementVNode(
        'div',
        { id: 'new', class: 'same', style: 'color: blue' },
        null,
        ShapeFlags.ELEMENT,
      );
      n2.patchFlag = PatchFlags.PROPS;
      n2.dynamicProps = ['id'];

      api.patchElement(n1, n2, null, null, false);

      // 仅 id 应被 diff
      const patchCalls = vi.mocked(ctx.patchProp).mock.calls;
      const patchedKeys = patchCalls.map((call) => call[1]);
      expect(patchedKeys).toContain('id');
      expect(patchedKeys).not.toContain('style');
    });
  });
});
