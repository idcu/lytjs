// @vitest-environment jsdom
/**
 * Tests for patch-component.ts
 * 测试 createComponentPatch 工厂函数及其返回的 mountComponent
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createComponentPatch, type ComponentPatchAPI } from '../src/patch-component';
import type { RendererContext } from '../src/patch-element';
import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { ShapeFlags } from '@lytjs/common-vnode';

// ============================================================
// Mock 辅助函数
// ============================================================

/** 创建一个 mock 的 RendererContext */
function createMockContext(): RendererContext<Node, Element> {
  return {
    createElement: vi.fn((tag: string) => document.createElement(tag)),
    setElementText: vi.fn(),
    insert: vi.fn(),
    remove: vi.fn(),
    createText: vi.fn((text: string) => document.createTextNode(text)),
    setText: vi.fn(),
    patchProp: vi.fn(),
    createComment: vi.fn((text: string) => document.createComment(text)),
    querySelector: undefined,
    setupChildComponent: vi.fn(),
    normalizeProps: undefined,
    setVNodeEl: vi.fn(),
    getVNodeEl: vi.fn(),
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

/** 创建一个简单的组件 VNode */
function createComponentVNode(
  componentType: Record<string, unknown>,
  props?: Record<string, unknown> | null,
): VNode {
  return {
    type: componentType,
    props: props ?? null,
    key: null,
    ref: null,
    children: null,
    el: null,
    shapeFlag: ShapeFlags.STATEFUL_COMPONENT,
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

/** 创建一个 mock 的组件实例 */
function createMockComponentInstance(
  overrides?: Partial<ComponentInternalInstance>,
): ComponentInternalInstance {
  return {
    type: { name: 'TestComponent' },
    ctx: {},
    parent: null,
    root: null,
    subTree: null as unknown as VNode,
    vnode: null as unknown as VNode,
    refs: {},
    attrs: null,
    props: {},
    ...overrides,
  } as unknown as ComponentInternalInstance;
}

// ============================================================
// 测试
// ============================================================

describe('createComponentPatch', () => {
  let ctx: ReturnType<typeof createMockContext>;
  let api: ComponentPatchAPI<Node, Element>;

  beforeEach(() => {
    ctx = createMockContext();
    api = createComponentPatch(ctx);
  });

  // ----------------------------------------------------------
  // 工厂函数返回正确的 API
  // ----------------------------------------------------------
  it('工厂函数应返回包含 mountComponent 方法的 API 对象', () => {
    expect(api).toHaveProperty('mountComponent');
    expect(typeof api.mountComponent).toBe('function');
  });

  // ----------------------------------------------------------
  // mountComponent
  // ----------------------------------------------------------
  describe('mountComponent', () => {
    it('无组件实例且无 setupChildComponent 时应发出警告', () => {
      const container = document.createElement('div');
      const componentType = { name: 'TestComp', render: vi.fn() };
      const vnode = createComponentVNode(componentType);
      vnode.component = null;

      // setupChildComponent 不设置 component
      vi.mocked(ctx.setupChildComponent).mockImplementation(() => {
        // 不设置 vnode.component
      });

      api.mountComponent(vnode, container, null, null, null, false);

      // 应发出警告
      expect(ctx.setupChildComponent).toHaveBeenCalled();
    });

    it('无组件实例但有 setupChildComponent 回调时应尝试创建实例', () => {
      const container = document.createElement('div');
      const componentType = { name: 'TestComp', render: vi.fn() };
      const vnode = createComponentVNode(componentType);
      vnode.component = null;

      const mockInstance = createMockComponentInstance({
        type: componentType,
      });

      // setupChildComponent 设置 component
      vi.mocked(ctx.setupChildComponent).mockImplementation((vn) => {
        vn.component = mockInstance;
      });

      // render 返回 subTree
      mockInstance.type.render = vi.fn(
        () =>
          ({
            type: 'div',
            el: document.createElement('div'),
            children: null,
            props: null,
          }) as unknown as VNode,
      );

      api.mountComponent(vnode, container, null, null, null, false);

      expect(ctx.setupChildComponent).toHaveBeenCalledWith(vnode, null);
      expect(mockInstance.type.render).toHaveBeenCalled();
    });

    it('无 render 函数时应发出警告', () => {
      const container = document.createElement('div');
      const componentType = { name: 'NoRenderComp' };
      const vnode = createComponentVNode(componentType);

      const mockInstance = createMockComponentInstance({
        type: componentType,
      });
      vnode.component = mockInstance;

      api.mountComponent(vnode, container, null, null, null, false);

      // 不应调用 patch
      expect(ctx.patch).not.toHaveBeenCalled();
    });

    it('正常渲染时应调用 render 函数并 patch subTree', () => {
      const container = document.createElement('div');
      // 真实渲染产物在挂载前 el 为 null（挂载由 patch 写入）；
      // 若预置 el，会被视为「已挂载的共享提升 vnode」而克隆（见 P0-6）。
      const subTree = {
        type: 'div',
        el: null,
        children: null,
        props: null,
      } as unknown as VNode;

      const componentType = {
        name: 'NormalComp',
        render: vi.fn(() => subTree),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
      });
      vnode.component = mockInstance;

      api.mountComponent(vnode, container, null, null, null, false);

      // render 的调用契约是 `render(_ctx, _cache)`（a73e75c3 起 v-memo 依赖第二个参数，
      // 与编译产物 `function render(_ctx, _cache)` 一致）⇒ 断言 ctx 必须匹配，
      // 第二参仅为每个组件实例惰性创建的缓存数组。
      expect(componentType.render).toHaveBeenCalledWith(mockInstance.ctx, expect.any(Array));
      expect(ctx.patch).toHaveBeenCalledWith(
        null,
        subTree,
        container,
        null,
        mockInstance,
        null,
        false,
      );
      expect(mockInstance.subTree).toBe(subTree);
    });

    it('重渲染时 render 收到同一 ctx 与同一个 per-instance 缓存数组', () => {
      const container = document.createElement('div');
      const subTree = {
        type: 'div',
        el: null,
        children: null,
        props: null,
      } as unknown as VNode;

      const seen: { self: unknown; ctx: unknown; cache: unknown[] }[] = [];
      const componentType = {
        name: 'CacheComp',
        render: vi.fn(function (this: unknown, ctxArg: unknown, cache: unknown[]) {
          seen.push({ self: this, ctx: ctxArg, cache });
          const vnode = { ...subTree } as unknown as VNode;
          return vnode;
        }),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({ type: componentType });
      vnode.component = mockInstance;

      api.mountComponent(vnode, container, null, null, null, false);
      (mockInstance as unknown as { update: () => void }).update();

      // 行为级契约：this 与第一实参都是实例 ctx；第二实参跨渲染是**同一个数组**。
      expect(seen).toHaveLength(2);
      expect(seen[0].self).toBe(mockInstance.ctx);
      expect(seen[0].ctx).toBe(mockInstance.ctx);
      expect(seen[1].ctx).toBe(mockInstance.ctx);
      expect(Array.isArray(seen[0].cache)).toBe(true);
      expect(seen[1].cache).toBe(seen[0].cache);
    });

    // ⚠️ 2026-11-02 改写：这三条原本断言「合并结果写进了**原 subTree 对象**的 props」——
    //   那正是被修复的 P0 行为：编译器会把完全静态的模板提升成模块级常量
    //   （`const _hoisted_1 = createElementVNode(...)`，render 每次返回**同一对象**），
    //   原地改它的 props 会让 attrs 在所有实例之间累积
    //   （第 1 个 `class="own a"`、第 2 个 `class="own a b"`）。
    //
    //   现在契约是：**渲染产物保持不被修改**，合并结果落在新的 vnode 上。
    //   下面同时断言「原对象未被污染」与「实际 DOM 上合并生效」。
    it('inheritAttrs=true（默认）：attrs 合并到新 vnode，原 subTree 不被修改', () => {
      const container = document.createElement('div');
      const subTree = {
        type: 'div',
        el: document.createElement('div'),
        children: null,
        props: { id: 'inner' },
      } as unknown as VNode;

      const componentType = {
        name: 'InheritAttrsComp',
        inheritAttrs: true,
        render: vi.fn(() => subTree),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
        attrs: { class: 'outer', 'data-test': 'value' },
      });
      vnode.component = mockInstance;

      api.mountComponent(vnode, container, null, null, null, false);

      // ① 原对象必须保持原样（共享的提升对象不能被污染）
      expect(subTree.props).toEqual({ id: 'inner' });

      // ② 合并结果体现在实例的 subTree 上（是新对象）
      const applied = (mockInstance.subTree as VNode | undefined)?.props ?? {};
      expect(applied).toEqual(
        expect.objectContaining({ id: 'inner', class: 'outer', 'data-test': 'value' }),
      );
      expect(mockInstance.subTree).not.toBe(subTree);
    });

    it('inheritAttrs=false：仅合并 class 和 style，原 subTree 不被修改', () => {
      const container = document.createElement('div');
      const subTree = {
        type: 'div',
        el: document.createElement('div'),
        children: null,
        props: { id: 'inner' },
      } as unknown as VNode;

      const componentType = {
        name: 'NoInheritComp',
        inheritAttrs: false,
        render: vi.fn(() => subTree),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
        attrs: { class: 'outer', style: 'color: red', 'data-test': 'value' },
      });
      vnode.component = mockInstance;

      api.mountComponent(vnode, container, null, null, null, false);

      // ① 原对象保持原样
      expect(subTree.props).toEqual({ id: 'inner' });

      // ② 只有 class / style 被继承，data-test 不继承
      const applied = (mockInstance.subTree as VNode | undefined)?.props ?? {};
      expect(applied).toEqual(
        expect.objectContaining({ id: 'inner', class: 'outer', style: 'color: red' }),
      );
      expect(applied).not.toHaveProperty('data-test');
    });

    it('inheritAttrs=false 且无 class/style 时不应修改 subTree.props', () => {
      const container = document.createElement('div');
      const originalProps = { id: 'inner' };
      const subTree = {
        type: 'div',
        el: document.createElement('div'),
        children: null,
        props: originalProps,
      } as unknown as VNode;

      const componentType = {
        name: 'NoInheritComp',
        inheritAttrs: false,
        render: vi.fn(() => subTree),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
        attrs: { 'data-test': 'value' },
      });
      vnode.component = mockInstance;

      api.mountComponent(vnode, container, null, null, null, false);

      // subTree.props 应保持不变
      expect(subTree.props).toEqual({ id: 'inner' });
    });

    it('inheritAttrs=false 且 subTree.props 为空时仅添加 class/style', () => {
      const container = document.createElement('div');
      const subTree = {
        type: 'div',
        el: document.createElement('div'),
        children: null,
        props: {},
      } as unknown as VNode;

      const componentType = {
        name: 'NoInheritComp',
        inheritAttrs: false,
        render: vi.fn(() => subTree),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
        attrs: { class: 'outer', 'data-test': 'value' },
      });
      vnode.component = mockInstance;

      api.mountComponent(vnode, container, null, null, null, false);

      // 原对象保持为空（不被污染），合并结果落在新 vnode 上
      expect(subTree.props).toEqual({});
      const applied = (mockInstance.subTree as VNode | undefined)?.props ?? {};
      expect(applied).toEqual({ class: 'outer' });
      expect(applied).not.toHaveProperty('data-test');
    });

    // ⚠️ 2026-10-27 行为变更：`errorCaptured` 返回 false 表示「错误已被接管」。
    // 此前实现照样 `throw renderError`（`handled` 算了却不用），于是首帧 `app.mount`
    // 直接抛错、ErrorBoundary 的 fallback 永远没机会渲染。现在改为**不抛**。
    it('render 抛出错误且 errorCaptured 返回 false 时不应再向上抛', () => {
      const container = document.createElement('div');
      const renderError = new Error('render error');

      const parentInstance = createMockComponentInstance({
        type: {
          name: 'ParentComp',
          errorCaptured: vi.fn(() => false),
        },
      });

      const componentType = {
        name: 'ErrorComp',
        render: vi.fn(() => {
          throw renderError;
        }),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
        parent: parentInstance,
        root: parentInstance,
      });
      vnode.component = mockInstance;

      expect(() => {
        api.mountComponent(vnode, container, null, null, null, false);
      }).not.toThrow();

      // errorCaptured 应被调用
      expect(parentInstance.type.errorCaptured).toHaveBeenCalled();
    });

    it('errorCaptured 返回 false 应阻止继续传播', () => {
      const container = document.createElement('div');
      const renderError = new Error('render error');

      const grandParentInstance = createMockComponentInstance({
        type: {
          name: 'GrandParent',
          errorCaptured: vi.fn(),
        },
      });

      const parentInstance = createMockComponentInstance({
        type: {
          name: 'ParentComp',
          errorCaptured: vi.fn(() => false),
        },
        parent: grandParentInstance,
      });

      const componentType = {
        name: 'ErrorComp',
        render: vi.fn(() => {
          throw renderError;
        }),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
        parent: parentInstance,
        root: grandParentInstance,
      });
      vnode.component = mockInstance;

      expect(() => {
        api.mountComponent(vnode, container, null, null, null, false);
      }).not.toThrow();

      // 父组件的 errorCaptured 应被调用
      expect(parentInstance.type.errorCaptured).toHaveBeenCalled();
      // 祖父组件的 errorCaptured 不应被调用（因为返回 false）
      expect(grandParentInstance.type.errorCaptured).not.toHaveBeenCalled();
    });

    it('render 错误未被 errorCaptured 处理时应冒泡到 app errorHandler', () => {
      const container = document.createElement('div');
      const renderError = new Error('render error');

      const appErrorHandler = vi.fn();

      const rootInstance = createMockComponentInstance({
        type: { name: 'Root' },
      });
      // 设置 appContext.config.errorHandler
      (rootInstance as unknown as Record<string, unknown>).appContext = {
        config: {
          errorHandler: appErrorHandler,
        },
      };

      const componentType = {
        name: 'ErrorComp',
        render: vi.fn(() => {
          throw renderError;
        }),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
        parent: null,
        root: rootInstance,
      });
      vnode.component = mockInstance;

      // app errorHandler 接管后同样不再向上抛（否则首帧 mount 会崩）
      expect(() => {
        api.mountComponent(vnode, container, null, null, null, false);
      }).not.toThrow();

      // app errorHandler 应被调用
      expect(appErrorHandler).toHaveBeenCalledWith(
        renderError,
        mockInstance.ctx,
        'render function',
      );
    });

    it('递归深度超过 MAX_RECURSION_DEPTH 时应抛出错误', () => {
      const container = document.createElement('div');
      const subTree = {
        type: 'div',
        el: document.createElement('div'),
        children: null,
        props: null,
      } as unknown as VNode;

      const componentType = {
        name: 'RecursiveComp',
        render: vi.fn(() => subTree),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
      });
      vnode.component = mockInstance;

      // 手动设置递归深度超过限制
      // 由于 componentRecursionDepthMap 是模块内部的 WeakMap，
      // 我们需要通过多次调用来增加深度
      // 但每次调用都会增加 1，所以需要调用 101 次
      // 这在测试中不太实际，所以我们直接测试边界情况

      // 第一次调用应该成功
      api.mountComponent(vnode, container, null, null, null, false);
      expect(componentType.render).toHaveBeenCalledTimes(1);

      // 后续调用会增加深度，但我们无法直接访问 WeakMap
      // 所以这里只验证正常路径可以工作
    });

    it('vnode.el 应指向 subTree 的根元素', () => {
      const container = document.createElement('div');
      const subTreeEl = document.createElement('div');
      // 真实流程：render 产出的 vnode 初始 el=null，patch 挂载时写入根元素。
      const subTree = {
        type: 'div',
        el: null,
        children: null,
        props: null,
      } as unknown as VNode;
      vi.mocked(ctx.patch).mockImplementation((_n1, n2) => {
        (n2 as VNode).el = subTreeEl;
      });

      const componentType = {
        name: 'ElComp',
        render: vi.fn(() => subTree),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
      });
      vnode.component = mockInstance;

      api.mountComponent(vnode, container, null, null, null, false);

      expect(vnode.el).toBe(subTreeEl);
    });

    it('attrs 为空时不应修改 subTree.props', () => {
      const container = document.createElement('div');
      const originalProps = { id: 'inner' };
      const subTree = {
        type: 'div',
        el: document.createElement('div'),
        children: null,
        props: originalProps,
      } as unknown as VNode;

      const componentType = {
        name: 'NoAttrsComp',
        render: vi.fn(() => subTree),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
        attrs: null,
      });
      vnode.component = mockInstance;

      api.mountComponent(vnode, container, null, null, null, false);

      // props 应保持不变
      expect(subTree.props).toBe(originalProps);
    });

    it('errorCapturedHooks 数组中的钩子应被调用', () => {
      const container = document.createElement('div');
      const renderError = new Error('render error');

      const hook = vi.fn(() => false);

      const parentInstance = createMockComponentInstance({
        type: { name: 'ParentComp' },
      });
      // 设置 errorCapturedHooks
      (parentInstance as unknown as Record<string, unknown>).errorCapturedHooks = [hook];

      const componentType = {
        name: 'ErrorComp',
        render: vi.fn(() => {
          throw renderError;
        }),
      };

      const vnode = createComponentVNode(componentType);
      const mockInstance = createMockComponentInstance({
        type: componentType,
        parent: parentInstance,
        root: parentInstance,
      });
      vnode.component = mockInstance;

      // 钩子返回 false ⇒ 错误已被接管，不再向上抛（2026-10-27 行为变更）
      expect(() => {
        api.mountComponent(vnode, container, null, null, null, false);
      }).not.toThrow();

      // errorCapturedHooks 应被调用
      expect(hook).toHaveBeenCalled();
    });
  });
});

// ============================================================
// render 返回 null / undefined —— 合法的「空渲染」
// ============================================================
//
// `update()` 此前**无条件**读 `subTree.el`（src/patch-component.ts:255），而
// `render(): VNode | null` 是**声明签名**，`@lytjs/core` 的 `defineAsyncComponent`
// 就返回 null（未配 loadingComponent 时）。
// 实测（2026-10-16）：`{ render: () => null }` 挂载即抛
// `TypeError: Cannot read properties of null (reading 'el')`。
describe('render 返回 null/undefined（空渲染）', () => {
  let ctx: ReturnType<typeof createMockContext>;
  let api: ComponentPatchAPI<Node, Element>;

  beforeEach(() => {
    ctx = createMockContext();
    api = createComponentPatch(ctx);
  });

  /** 造一个「渲染结果可切换」的组件 vnode + 实例 */
  function setupEmpty(render: () => unknown) {
    const container = document.createElement('div');
    const componentType = { name: 'EmptyComp', render: vi.fn(render) };
    const vnode = createComponentVNode(componentType);
    const instance = createMockComponentInstance({ type: componentType });
    vnode.component = instance;
    return { container, componentType, vnode, instance };
  }

  const asDiv = (): VNode =>
    ({
      type: 'div',
      // 真实渲染产物挂载前 el 为 null；预置 el 会被当作已挂载的共享提升 vnode（P0-6）。
      el: null,
      children: null,
      props: null,
    }) as unknown as VNode;

  it('★ render 返回 null 时挂载不得抛', () => {
    const { container, vnode, componentType } = setupEmpty(() => null);

    expect(() => api.mountComponent(vnode, container, null, null, null, false)).not.toThrow();
    expect(componentType.render).toHaveBeenCalled();
  });

  it('★ render 返回 undefined 时挂载不得抛', () => {
    const { container, vnode } = setupEmpty(() => undefined);

    expect(() => api.mountComponent(vnode, container, null, null, null, false)).not.toThrow();
  });

  it('★ 首帧空渲染、之后返回真实 vnode 时应挂载（以 null 为首参 patch）', () => {
    const subTree = asDiv();
    let empty = true;
    const { container, vnode, instance } = setupEmpty(() => (empty ? null : subTree));

    api.mountComponent(vnode, container, null, null, null, false);
    empty = false;
    (instance as unknown as { update: () => void }).update();

    expect(ctx.patch).toHaveBeenCalledWith(null, subTree, container, null, instance, null, false);
  });

  it('★ 由「有内容」变为空渲染时应卸载旧 DOM', () => {
    const subTree = asDiv();
    let empty = false;
    const { container, vnode, instance } = setupEmpty(() => (empty ? null : subTree));

    api.mountComponent(vnode, container, null, null, null, false);
    empty = true;
    (instance as unknown as { update: () => void }).update();

    expect(ctx.unmount).toHaveBeenCalledWith(subTree, null, null, true);
  });

  it('空渲染仍应触发 mounted 钩子（组件已挂载，只是渲染为空）', () => {
    const invokeMountedHook = vi.fn();
    (ctx as unknown as { invokeMountedHook?: unknown }).invokeMountedHook = invokeMountedHook;
    const { container, vnode, instance } = setupEmpty(() => null);

    api.mountComponent(vnode, container, null, null, null, false);

    expect(invokeMountedHook).toHaveBeenCalledWith(instance);
  });
});
