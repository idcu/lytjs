// @vitest-environment jsdom
/**
 * `@lytjs/adapter-web` 的 `createHydrationFunctions` —— 组件 vnode 水合。
 *
 * 背景（2026-10-02）：`hydrateNode` 的分发链原先只覆盖
 * Fragment / Text / Comment / Element，**没有组件分支** ⇒ 组件 vnode
 * （shapeFlag = STATEFUL_COMPONENT = 4，与 ELEMENT = 1 按位与为 0）
 * 一律落到 `warn('Hydration: unrecognized node type, skipping.')` 被跳过：
 * SSR 出的 DOM 既不复用也不更新、`vnode.el` 恒为 null。已用探针实测确认。
 *
 * ⚠️ 判据设计要点：**不能只测「匹配场景」**。若 SSR DOM 与组件产物恰好一致，
 * 缺陷版（完全跳过）与修复版（复用节点）产出**相同的 DOM**，测试会假绿。
 * 因此每个用例都让「组件产物」与「SSR DOM」不同，以真实 DOM 文本为判据。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createVNode, Fragment } from '@lytjs/vdom';
import { createHydrationFunctions } from '@lytjs/adapter-web';

type AnyVNode = ReturnType<typeof createVNode>;

describe('组件 vnode 水合', () => {
  let container: HTMLElement;
  let hydrate: (vnode: AnyVNode, container: HTMLElement) => void;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    hydrate = createHydrationFunctions({}).hydrate;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    container.remove();
  });

  // ---------------------------------------------------------------
  // 1. setup 返回 VNode（最常见形态）
  // ---------------------------------------------------------------
  it('组件（setup 返回 VNode）应水合，并更新不匹配的既有 DOM 文本', () => {
    container.innerHTML = '<div id="app">ssr-old</div>';
    const Comp = {
      setup() {
        return createVNode('div', { id: 'app' }, 'from-setup');
      },
    };

    hydrate(createVNode(Comp as never, {}), container);

    // 缺陷版会保留 'ssr-old'（被整体跳过）
    expect(container.querySelector('div')!.textContent).toBe('from-setup');
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('unrecognized node type'));
  });

  it('组件产物与 SSR DOM 匹配时应复用同一 DOM 节点（而非重建）', () => {
    container.innerHTML = '<div id="app">same</div>';
    const existing = container.querySelector('div');
    const Comp = {
      setup() {
        return createVNode('div', { id: 'app' }, 'same');
      },
    };
    const vnode = createVNode(Comp as never, {});

    hydrate(vnode, container);

    // ⚠️ 本用例的「复用同一节点」单独看**不具备判别性**：缺陷版整体跳过时
    // DOM 恰好不变、`querySelector` 仍命中同一节点（反向验证时实测到的假绿）。
    // 故额外断言组件 vnode 的 el 被回填 —— 缺陷版恒为 null。
    expect((vnode as { el?: Node | null }).el).toBe(existing);
    expect(container.querySelector('div')).toBe(existing);
    expect(container.childElementCount).toBe(1);
  });

  // ---------------------------------------------------------------
  // 2. setup 返回对象 ⇒ 作为 render 的 ctx
  // ---------------------------------------------------------------
  it('setup 返回对象时应作为 ctx 传给 render', () => {
    container.innerHTML = '<span>ssr-old</span>';
    const Comp = {
      setup() {
        return { msg: 'from-ctx' };
      },
      render(ctx: Record<string, unknown>) {
        return createVNode('span', null, `msg=${String(ctx.msg)}`);
      },
    };

    hydrate(createVNode(Comp as never, {}), container);

    expect(container.querySelector('span')!.textContent).toBe('msg=from-ctx');
  });

  // ---------------------------------------------------------------
  // 3. 无 setup、仅 render ⇒ props 作为 ctx
  // ---------------------------------------------------------------
  it('无 setup 时应用 props 作为 render 的 ctx', () => {
    container.innerHTML = '<span>ssr-old</span>';
    const Comp = {
      render(ctx: Record<string, unknown>) {
        return createVNode('span', null, `p=${String(ctx.value)}`);
      },
    };

    hydrate(createVNode(Comp as never, { value: 'prop-ctx' }), container);

    expect(container.querySelector('span')!.textContent).toBe('p=prop-ctx');
  });

  // ---------------------------------------------------------------
  // 4. setup 返回 VNode 时不应再调用 render（优先级）
  // ---------------------------------------------------------------
  it('setup 返回 VNode 时应跳过 render（优先级正确）', () => {
    container.innerHTML = '<span>ssr-old</span>';
    const render = vi.fn(() => createVNode('span', null, 'from-render'));
    const Comp = {
      setup() {
        return createVNode('span', null, 'from-setup');
      },
      render,
    };

    hydrate(createVNode(Comp as never, {}), container);

    expect(container.querySelector('span')!.textContent).toBe('from-setup');
    expect(render).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------
  // 5. 组件渲染 Fragment（多根）
  // ---------------------------------------------------------------
  it('组件渲染 Fragment 多根时应逐个子节点水合', () => {
    container.innerHTML = '<p>old-1</p><p>old-2</p>';
    const Comp = {
      setup() {
        return createVNode(Fragment, null, [
          createVNode('p', null, 'new-1'),
          createVNode('p', null, 'new-2'),
        ]);
      },
    };

    hydrate(createVNode(Comp as never, {}), container);

    const ps = container.querySelectorAll('p');
    expect(ps.length).toBe(2);
    expect(ps[0]!.textContent).toBe('new-1');
    expect(ps[1]!.textContent).toBe('new-2');
  });

  // ---------------------------------------------------------------
  // 6. 组件嵌套组件
  // ---------------------------------------------------------------
  it('组件内嵌组件应递归水合到最内层元素', () => {
    container.innerHTML = '<em>ssr-old</em>';
    const Inner = {
      setup() {
        return createVNode('em', null, 'inner-content');
      },
    };
    const Outer = {
      setup() {
        return createVNode(Inner as never, {});
      },
    };

    hydrate(createVNode(Outer as never, {}), container);

    expect(container.querySelector('em')!.textContent).toBe('inner-content');
  });

  // ---------------------------------------------------------------
  // 7. 组件产物在 DOM 中不存在 ⇒ 新建并插入
  // ---------------------------------------------------------------
  it('组件产物在 DOM 中不存在时应创建新节点插入', () => {
    // 容器本为空
    const Comp = {
      setup() {
        return createVNode('section', { id: 'created' }, 'brand-new');
      },
    };

    hydrate(createVNode(Comp as never, {}), container);

    const section = container.querySelector('section');
    expect(section).not.toBeNull();
    expect(section!.id).toBe('created');
    expect(section!.textContent).toBe('brand-new');
  });

  // ---------------------------------------------------------------
  // 8. 组件 vnode 的 el 指向子树根
  // ---------------------------------------------------------------
  it('组件 vnode 的 el 应指向其子树根节点', () => {
    container.innerHTML = '<div id="root">x</div>';
    const Comp = {
      setup() {
        return createVNode('div', { id: 'root' }, 'x');
      },
    };
    const vnode = createVNode(Comp as never, {});

    hydrate(vnode, container);

    expect((vnode as { el?: Node | null }).el).toBe(container.querySelector('div'));
  });

  // ---------------------------------------------------------------
  // 9. 组件既无 setup 也无 render ⇒ 告警且不抛错（记录现状缺口）
  // ---------------------------------------------------------------
  it('组件既无 setup 也无 render 时应告警而非抛错，DOM 保持不变', () => {
    container.innerHTML = '<div>untouched</div>';
    const Comp = {}; // 空组件

    expect(() => hydrate(createVNode(Comp as never, {}), container)).not.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('could not resolve component vnode'),
    );
    expect(container.querySelector('div')!.textContent).toBe('untouched');
  });

  // ---------------------------------------------------------------
  // 10. 函数式 type（函数）：形状位仍进组件分支，但无 setup/render ⇒ 告警
  //     ⚠️ 实测事实：本仓 `isObject()` 把函数视为对象 ⇒ getShapeFlag(fn) = 4
  //     （STATEFUL_COMPONENT），故**不会**走 unrecognized 分支，而是走组件分支后告警。
  // ---------------------------------------------------------------
  it('函数式 type 因无 setup/render 而告警（形状位实为 STATEFUL_COMPONENT）', () => {
    container.innerHTML = '<div>untouched</div>';
    const fnComp = () => createVNode('div', null, 'fn');

    hydrate(createVNode(fnComp as never, {}), container);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('could not resolve component vnode'),
    );
    expect(container.querySelector('div')!.textContent).toBe('untouched');
  });

  // ---------------------------------------------------------------
  // 11. 回归：既有元素水合路径不受影响
  // ---------------------------------------------------------------
  it('回归：普通元素水合路径不受组件分支影响', () => {
    container.innerHTML = '<div><span>ssr-old</span></div>';
    hydrate(createVNode('div', null, [createVNode('span', null, 'updated')]), container);

    expect(container.querySelector('span')!.textContent).toBe('updated');
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('unrecognized node type'));
  });

  // ---------------------------------------------------------------
  // 12. 回归：真实未识别类型仍会走 unrecognized 告警分支
  //     （用 Symbol 作 type ⇒ getShapeFlag 返回 0）
  // ---------------------------------------------------------------
  it('回归：未识别 type 仍应触发 unrecognized 告警', () => {
    container.innerHTML = '<div>untouched</div>';
    const weird = Symbol('weird');

    hydrate(createVNode(weird as never, {}), container);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unrecognized node type'));
  });
});
