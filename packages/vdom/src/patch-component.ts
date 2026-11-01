/**
 * @lytjs/vdom - patch-component
 *
 * Component vnode 的挂载逻辑。
 * 包含 mountComponent 函数，负责组件实例创建、渲染、inheritAttrs 处理等。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { Fragment, ShapeFlags } from '@lytjs/common-vnode';
import { warn, error } from '@lytjs/common-error';
import { effect } from '@lytjs/reactivity';
import { queuePreFlushCb } from '@lytjs/common-scheduler';
import type { SuspenseBoundary } from './types';
import type { RendererContext } from './patch-element';
import { createVNode, createTextVNode } from './vnode';

// ============================================================
// 组件递归深度限制
// ============================================================

// FIX: P1-L4 组件递归深度无限制 - 添加递归深度限制（100层）
const MAX_RECURSION_DEPTH = 100;
const componentRecursionDepthMap = new WeakMap<ComponentInternalInstance, number>();

/**
 * 多根组件（render 返回数组）的 children 预处理：**只**把裸字符串 / 数字换成文本 vnode。
 *
 * 为什么不做完整「规范化」：数组里可能有**嵌套数组**（槽函数返回 `[vnode]`，
 * 组件再包一层 `[[vnode]]`），`createVNode` 的 `normalizeChildren` 会正确展平它们；
 * 若在这里按「非 VNode 一律 String()」处理，就会得到 `[object Object]`。
 *
 * 只在真的改了内容时新建数组，避免无谓分配（也保持 `result` 的身份）。
 */
function normalizeFragmentScalars(children: unknown[]): unknown[] {
  let changed = false;
  const out = children.map((child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      changed = true;
      return createTextVNode(String(child));
    }
    return child;
  });
  return changed ? out : children;
}

// ============================================================
// 组件 patch 工厂
// ============================================================

// FIX: P1-09 定义 ComponentInternalRuntimeProps 接口替代 as unknown as Record，
// 提供更精确的类型安全访问组件内部属性
interface ComponentInternalRuntimeProps {
  render?: (ctx: Record<string, unknown>) => VNode;
  name?: string;
  inheritAttrs?: boolean;
  errorCaptured?: (err: Error, instance: unknown, info: string) => boolean | void;
  [key: string]: unknown;
}

export interface ComponentPatchAPI<HN, _HE extends HN> {
  mountComponent: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
}

/**
 * 创建 component 相关的 patch 函数集合。
 */
export function createComponentPatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): ComponentPatchAPI<HN, HE> {
  const { setupChildComponent, patch } = ctx;

  // ============================================================
  // mountComponent
  // ============================================================

  function mountComponent(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    let component = vnode.component as ComponentInternalInstance | null | undefined;

    // ============================================================
    // KeepAlive 激活分支
    // ============================================================
    // 当子 vnode 携带 `COMPONENT_KEPT_ALIVE`（由 KeepAlive 的 render 在缓存命中时
    // 打上）时，组件实例已存在且其 DOM 保存在隐藏仓库里 —— 不应重新 mount，
    // 而应调用 KeepAlive 暴露的 `activate` 把既有 DOM 移回容器、触发 activated 钩子。
    //
    // ⚠️ 2026-09-27 补齐：此前 vdom **从不消费**这个 flag，KeepAlive 退化为
    // pass-through（切回时重新 mount、状态丢失）。访问路径：`vnode.component.parent`
    // 必为 KeepAlive 实例（KeepAlive 在 render 中把子 vnode 作为自己的 subTree，
    // patch 时以自身为 parentComponent 创建子实例），其 `setupState` 暴露了
    // `activate` / `deactivate`（见 keep-alive.ts）。
    if (vnode.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE && component) {
      const ka = (component.parent?.setupState ?? {}) as Record<string, unknown>;
      const activate = ka.activate as ((v: VNode, c: unknown, a: unknown) => void) | undefined;
      activate?.(vnode, container, anchor);
      return;
    }

    // ★ 2026-10-29：把所在 suspense 边界记到 vnode 上，**必须在 setupChildComponent 之前**。
    //
    // 子组件的 `setupComponent` 会在「setup 返回 Promise」时调
    // `registerSuspensePendingChild(vnode)` 登记等待；那时它只能靠 `vnode.suspense`
    // 找回边界。写晚了就登记不上 ⇒ `<Suspense>` 的 fallback 永不出现。
    if (parentSuspense) {
      vnode.suspense = parentSuspense;
    }

    if (!component) {
      // 尝试使用提供的回调创建和 setup 组件实例
      if (setupChildComponent) {
        setupChildComponent(vnode, parentComponent);
        component = vnode.component as ComponentInternalInstance | null | undefined;
      }
      if (!component) {
        warn(
          `mountComponent received a component vnode without a component instance. ` +
            `Ensure setupComponent has been called before mounting.`,
        );
        return;
      }
    }

    // FIX: P1-L4 组件递归深度无限制 - 检查递归深度
    const currentDepth = componentRecursionDepthMap.get(component) ?? 0;
    if (currentDepth > MAX_RECURSION_DEPTH) {
      throw new Error(
        `Component recursion depth exceeded (${MAX_RECURSION_DEPTH}). ` +
          `Possible infinite recursion detected in component "${(component.type as ComponentInternalRuntimeProps).name || 'anonymous'}". ` +
          `Check for circular component references or missing termination conditions.`,
      );
    }
    componentRecursionDepthMap.set(component, currentDepth + 1);

    // 调用 render 函数获取 subTree：优先使用 instance.render（来自 setup 函数的返回值）
    //
    // ⚠️ 2026-11-01 修（P0）：**每次 update 都要重新取 render**，不能在这里捕获一次。
    //
    //   `async setup` 在首帧时 `instance.render` 还是 undefined（Promise 未兑现），
    //   此前这里直接 `return`（只 warn 一句）⇒ 渲染 effect 从未建立 ⇒
    //   `instance.update` 也不存在 ⇒ Promise 兑现后 `handleSetupResult` 填好了 render，
    //   却**没有任何东西会重跑** ⇒ 组件永远渲染成空（实测：不套 Suspense 也是空）。
    //
    //   现在：没有 render 时不再 return，而是继续建立 effect（首帧渲染 null）；
    //   update 里每次按当前 `component.render` 取值 —— 兑现后 update() 就能拿到真 render。
    const resolveRenderFn = ():
      | ((ctx: Record<string, unknown>) => VNode | VNode[] | null | undefined)
      | undefined =>
      (component as unknown as { render?: (ctx: Record<string, unknown>) => VNode }).render ??
      (component.type as ComponentInternalRuntimeProps).render;

    const renderFn = resolveRenderFn();
    if (!renderFn && !vnode.isAsyncPlaceholder) {
      // 非异步组件却没有 render：真缺陷，保持原有语义（告警 + 不建立 effect）。
      // ⚠️ 只有 `async setup` 的组件（`isAsyncPlaceholder`）才走「先建 effect、兑现后再渲染」。
      warn(
        `Component "${(component.type as ComponentInternalRuntimeProps).name || 'anonymous'}" has no render function.`,
      );
      return;
    }

    let isMounted = false;
    let initialSubTree: VNode | null = null;

    const update = () => {
      // ⚠️ 声明为 `VNode | null`：`render()` 可以合法地返回 null/undefined（空渲染），
      //    下方有专门分支处理（此前这里声明为 `VNode`，把 null 当成不可能 ⇒ 见该分支注释）。
      let subTree: VNode | null;
      try {
        // ⚠️ 2026-10-31 新增：渲染期把「当前实例」交回上层（core 注入 setCurrentInstance）。
        //   否则 `resolveComponent` / `resolveDirective` 在渲染期一律拿到 null，
        //   `<div v-focus>` 的指令对象解析成 undefined，指令**永远不会执行**。
        let result: VNode | VNode[] | null | undefined;
        ctx.setRenderingInstance?.(component as ComponentInternalInstance);
        try {
          const currentRender = resolveRenderFn();
          if (!currentRender) {
            // 异步 setup 尚未兑现：首帧渲染空，等 `instance.update()` 再来
            result = null;
          } else {
            result = currentRender.call(component!.ctx, component!.ctx) as
              | VNode
              | VNode[]
              | null
              | undefined;
          }
        } finally {
          ctx.setRenderingInstance?.(null);
        }
        // ⚠️ 2026-10-01 修复：渲染函数返回**数组**（多根组件）时必须**包一层 Fragment**。
        // 否则 `subTree` 是一个数组，后续 patch / unmount 会按单个 vnode 处理 ⇒ **渲染为空**。
        // 触发者：`Transition` / `Suspense` 的渲染函数是 `() => slots.default?.()`，
        // 而插槽契约就是 `{default:()=>[vnode]}` ⇒ 天然返回数组（此前它们一律渲染为空）。
        //
        // ★ 2026-10-30 补：包 Fragment 之前要把**裸字符串 / 数字**换成文本 vnode ——
        //   `mountFragment` 直接对每个子项 `patch(null, child, …)`，而 `patch` 对
        //   标量**无分支命中**，于是 `() => [h('div','A'), 'text', h('div','B')]`
        //   里的文本被**静默丢弃**（实测 `textContent === 'AB'`）。
        //   元素数组子节点走的是 `mountChildren`，那里早就有等价的一步。
        //
        //   ⚠️ 只转换标量：嵌套数组（槽函数返回 `[vnode]`，组件再包一层 `[[vnode]]`）
        //   由 `createVNode` 的 `normalizeChildren` 展平 —— 在这里先「规范化」会把
        //   数组当非法值 stringify 成 `[object Object]`（第一版就是这么写坏的，
        //   signal 的作用域插槽用例立刻变红）。
        subTree = Array.isArray(result)
          ? (createVNode(
              Fragment as never,
              null,
              normalizeFragmentScalars(result) as never,
            ) as unknown as VNode)
          : (result as VNode);
      } catch (err) {
        // 通过父链的 errorCaptured 传播错误
        const renderError = err instanceof Error ? err : new Error(String(err));
        let handled = false;
        let current: ComponentInternalInstance | null = component!.parent;
        while (current) {
          const type = current.type as ComponentInternalRuntimeProps;
          const errorHandler = type.errorCaptured;
          if (errorHandler) {
            try {
              const result = errorHandler.call(
                current.ctx,
                renderError,
                current,
                'render function',
              );
              if (result === false) {
                handled = true;
                break;
              }
            } catch (e) {
              error(`Error in errorCaptured hook: ${e}`);
            }
          }
          // 同时检查 errorCapturedHooks（来自 onErrorCaptured API）
          const hooks = (current as unknown as Record<string, unknown>).errorCapturedHooks as
            | Array<(err: Error, instance: unknown, info: string) => boolean | void>
            | undefined;
          if (hooks && hooks.length > 0) {
            for (const hook of hooks) {
              try {
                const result = hook(renderError, current, 'render function');
                if (result === false) {
                  handled = true;
                  break;
                }
              } catch (e) {
                error(`Error in errorCaptured hook: ${e}`);
              }
            }
            if (handled) break;
          }
          current = current.parent;
        }

        // 如果没有被任何组件处理，尝试应用级 errorHandler
        if (!handled && component!.root) {
          const rootAny = component!.root as unknown as Record<string, unknown>;
          const appContext = rootAny.appContext as Record<string, unknown> | undefined;
          const appErrorHandler = appContext?.config as Record<string, unknown> | undefined;
          if (appErrorHandler && typeof appErrorHandler.errorHandler === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            (appErrorHandler.errorHandler as Function)(
              renderError,
              component!.ctx,
              'render function',
            );
            // 应用级 errorHandler 已接管 ⇒ 视为已处理
            handled = true;
          }
        }

        // ⚠️ 2026-10-27 修（P0）：此前这里**无条件** `throw renderError`，
        //   把上面辛苦算出来的 `handled` 完全忽略。后果：
        //   · ErrorBoundary 已经把错误态写好、fallback 也备好了，却仍向上抛；
        //   · `watchEffect(update)` 没有 onError，effect 捕获后 rethrow
        //     （reactivity/src/effect.ts:447-452）⇒ **首帧 app.mount 直接抛错**、
        //     更新期该次 patch 中断、控制台留下未捕获异常。
        //   现在：已处理 ⇒ 用空 Fragment 顶替失败的子树（边界自己会渲染 fallback）；
        //         未处理 ⇒ 保持原语义，继续向上抛（让用户看得见）。
        if (handled) {
          subTree = createVNode(Fragment as never, null, [] as never) as unknown as VNode;
        } else {
          throw renderError;
        }
      }

      // 应用 inheritAttrs：将实例的 attrs 合并到根 VNode props
      const componentType = component!.type as ComponentInternalRuntimeProps;
      if (component!.attrs && subTree) {
        const attrs = component!.attrs;
        const attrsKeys = Object.keys(attrs);
        if (attrsKeys.length > 0) {
          // 获取现有的 props，如果没有则使用空对象
          const existingProps = subTree.props ?? {};

          if (componentType.inheritAttrs !== false) {
            // inheritAttrs !== false: 合并所有 attrs
            // 只有当 existingProps 不为空或需要合并时才创建新对象
            if (Object.keys(existingProps).length > 0 || attrsKeys.length > 0) {
              // ⚠️ 2026-11-01 修（P0）：`class` / `style` 必须**合并**，不能覆盖。
              //
              //   此前是裸 `Object.assign({}, existingProps, attrs)` ⇒ 父组件传的
              //   `<Child class="extra" />` 会把子组件根元素**自己的** `class="inner"`
              //   整个顶掉（实测客户端渲染出 `class="extra"`，`inner` 消失）。
              //   样式因此错乱，而且 SSR/客户端还可能不一致。
              //
              //   与 Vue 一致：class / style 拼接成数组（`normalizeClass` / `patchStyle`
              //   都支持数组），其余属性仍然后者覆盖前者。
              const merged = Object.assign({}, existingProps, attrs);
              if (existingProps['class'] != null && attrs['class'] != null) {
                merged['class'] = [existingProps['class'], attrs['class']];
              }
              if (existingProps['style'] != null && attrs['style'] != null) {
                merged['style'] = [existingProps['style'], attrs['style']];
              }
              subTree.props = merged;
            } else {
              subTree.props = attrs;
            }
          } else {
            // inheritAttrs === false: 仅合并 class 和 style（Vue 3 行为）
            // class 和 style 是视觉相关属性，即使 inheritAttrs 为 false 也应继承到根元素
            const hasClass = 'class' in attrs;
            const hasStyle = 'style' in attrs;

            if (hasClass || hasStyle) {
              // 只有当需要合并时才创建新对象
              if (Object.keys(existingProps).length > 0) {
                const rootProps = Object.assign({}, existingProps);
                // 同样必须合并而不是覆盖（`inheritAttrs: false` 时 class/style 仍会继承）
                if (hasClass) {
                  rootProps.class =
                    existingProps['class'] != null
                      ? [existingProps['class'], attrs.class]
                      : attrs.class;
                }
                if (hasStyle) {
                  rootProps.style =
                    existingProps['style'] != null
                      ? [existingProps['style'], attrs.style]
                      : attrs.style;
                }
                subTree.props = rootProps;
              } else {
                // existingProps 为空，直接创建包含 class/style 的对象
                subTree.props = {
                  ...(hasClass && { class: attrs.class }),
                  ...(hasStyle && { style: attrs.style }),
                };
              }
            }
          }
        }
      }

      // ★ 2026-10-16：`render()` 返回 null / undefined 是**合法的空渲染**。
      //
      // 声明签名就是 `render(): VNode | null`（`component/src/define-component.ts`
      // 与本包注释均如此），而 `@lytjs/core` 的 `defineAsyncComponent` 在**未配
      // loadingComponent** 时首帧正是返回 null（`render(){ … return null }`）。
      //
      // 缺陷（实测，最小复现 `{ render: () => null }`）：此前这里**无条件**执行
      // `vnode.el = subTree.el` ⇒ 挂载即抛
      // `TypeError: Cannot read properties of null (reading 'el')`
      // ⇒ 应用**整个挂载失败**（`Failed to mount app`）。返回 undefined 同样命中
      // （`render` 抛错被 errorCaptured 处理后 subTree 也未赋值）。
      //
      // 守卫：`tests/patch-component.test.ts` 的「render 返回 null/undefined（空渲染）」组。
      if (subTree === null || subTree === undefined) {
        // 由「有内容」变为「空」⇒ 必须**主动卸载**旧 DOM：
        // `patch(n1, null)` 只在 DEV 下 warn 一句就 return（见 patch.ts:418），不会卸载。
        if (initialSubTree) {
          ctx.unmount(initialSubTree, null, null, true);
          initialSubTree = null;
        }
        component!.subTree = null as unknown as VNode;
        vnode.el = null;
        // 空渲染也算「已挂载 / 已更新」：否则 `invokeMountedHook` 永不触发，
        // 而 `instance.isMounted` 由 `callMountedHook` 置位
        // （component/src/lifecycle.ts）⇒ 依赖 `isMounted` 的逻辑（如
        // `forceComponentUpdate` 的回退路径）会静默失效。
        if (!isMounted) {
          isMounted = true;
          ctx.invokeMountedHook?.(component!);
        } else {
          ctx.invokeUpdatedHook?.(component!);
        }
        return;
      }

      component!.subTree = subTree;

      // ============================================================
      // ★ 2026-10-30 新增：把过渡钩子**下沉**到组件的根元素 vnode
      // ============================================================
      //
      // `<Transition>` / `<TransitionGroup>` 把钩子挂在**子 vnode** 上，而
      // `mountElement` / `unmount` 只在**元素** vnode 上读它 ⇒ 子节点写成组件时
      // （`<Transition><MyComp/></Transition>`，最常见的真实用法）**enter / leave 全都不发生**，
      // 且不报错：
      //
      //   <Transition name="fade"><p v-if="on">X</p></Transition>     → 有动画
      //   <Transition name="fade"><MyComp v-if="on" /></Transition>   → 没动画
      //
      // 修法：挂载根元素之前把它写上去 —— `mountElement` 随后自然会消费（enter），
      // `unmount(instance.subTree)` 也会消费（leave）。与 Vue 的
      // `setTransitionHooks(vnode, hooks)` 同一思路。
      //
      // 只处理**根是元素**的情况：多根（Fragment）没有唯一的宿主元素，钩子无处可挂
      // （已记在报告 §29.5）。
      //
      // ★ 2026-10-30 补：**多根组件**（render 返回数组 ⇒ subTree 是 Fragment）此前
      //   直接把钩子丢掉 ⇒ `<Transition><MultiRoot/></Transition>` 静默无动画。
      //   现在把同一份钩子**分发给 Fragment 里每个能承载过渡的子节点**：
      //   · 元素 → 挂上去（mountElement / unmount 会消费）；
      //   · 组件 → 也挂上去，它自己的 mountComponent 会继续往下沉到它的根。
      //   文本 / 注释节点没有 DOM 过渡语义，跳过（`v-if` 的注释占位、纯文本根都会出现）。
      //
      //   ⚠️ 残留：`mode="out-in"` 下 `finishLeave()` 是**每个元素各调一次**，
      //   多根时第一个元素 leave 结束就会把排队的子节点扶正（其余根元素还在 leave）。
      //   单根（绝大多数用法）不受影响 —— 见报告 §34.4。
      if (vnode.transition) {
        if (subTree.shapeFlag & ShapeFlags.ELEMENT) {
          subTree.transition = vnode.transition;
        } else if (subTree.type === Fragment && Array.isArray(subTree.children)) {
          for (const kid of subTree.children as VNode[]) {
            if (!kid || typeof kid !== 'object') continue;
            const isElement = (kid.shapeFlag & ShapeFlags.ELEMENT) !== 0;
            const isComponent =
              (kid.shapeFlag &
                (ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT)) !==
              0;
            if (isElement || isComponent) kid.transition = vnode.transition;
          }
        }
      }

      // ⚠️ 2026-10-31 新增：**组件标签上的自定义指令**。
      //   编译器为 `<Child v-focus />` 生成 `withDirectives(createBlock(Child, …), [[…]])`，
      //   但指令钩子只能作用在**真实元素**上（`el.focus()` 之类）。
      //   这里把指令转移到子组件的**根元素 vnode**（单根场景）—— 与 Vue 的
      //   `renderComponentRoot` 里 `subTree.dirs = vnode.dirs` 同一做法。
      //   多根（Fragment）组件暂不转移：没有唯一的 el 可承载，会显式告警。
      {
        const parentDirs = (vnode as { _directives?: unknown[] })._directives;
        if (parentDirs && parentDirs.length > 0) {
          const rootVNode = subTree as { type?: unknown; _directives?: unknown[] } | null;
          if (rootVNode && typeof rootVNode.type === 'string') {
            if (!rootVNode._directives) rootVNode._directives = parentDirs;
          } else if (__DEV__) {
            warn(
              `组件 "<${String((component.type as { name?: string }).name ?? 'anonymous')}>" 上的自定义指令` +
                `无法应用：多根组件没有唯一的根元素。请把指令写在根元素上。`,
            );
          }
        }
      }

      if (!isMounted) {
        // 首次挂载
        patch(null, subTree, container, anchor, component, parentSuspense, isSVG);
        vnode.el = subTree.el;
        isMounted = true;
        initialSubTree = subTree;
        // ⚠️ 2026-09-26 新增：此前 vdom **从不调用** mounted 钩子 ——
        // `callMountedHook` 的调用点只存在于 component 的导出/文档/测试里，
        // 于是 `onMounted` 在生产 VNode 路径**永不执行**（依赖它的代码静默失效）。
        // 现通过回调注入（与 setupChildComponent 同模式）由 core 提供实现。
        ctx.invokeMountedHook?.(component!);
      } else {
        // 更新
        patch(initialSubTree, subTree, container, anchor, component, parentSuspense, isSVG);
        vnode.el = subTree.el;
        initialSubTree = subTree;
        ctx.invokeUpdatedHook?.(component!);
      }
    };

    // Set up the update function on the component instance
    //
    // ⚠️ 2026-10-29 修（P0）：这里必须指向**渲染 effect 的 runner**，而不是裸 `update`。
    //
    // 裸 `update` 的问题：调用它等于在 effect **外面**执行渲染 ⇒ 读到的响应式依赖
    // **不会被收集**。对同步组件无害（首次渲染发生在 effect 内，依赖已收集），
    // 但对 `async setup` 致命：
    //   · 首次渲染时 setupState 还是空的 ⇒ 什么都没读到 ⇒ 依赖表为空；
    //   · Promise 兑现后 `component-setup.ts` 调 `instance.update()` 重渲染一次
    //     ⇒ **DOM 对了，但依赖表仍是空的**；
    //   · 之后任何 `ref.value = x` 都不再触发重渲染 ⇒ 页面冻结在兑现那一刻的内容。
    // 实测（`core/tests/e2e-suspense-fallback.test.ts` 的「切回 default 后仍是活的」）：
    // 兑现后 `n=0` 正确，改成 `n=7` 后**永不更新**。
    //
    // 修法：让 `instance.update` 指向 `effect(...)` 返回的 runner —— 调用它会在
    // effect 内重跑渲染，**顺便重新收集依赖**（这也是 Vue 的做法：
    // `instance.update = effect(...)`）。effect 尚未建立时退回裸 `update`（首帧用）。
    let renderEffect: (() => void) | null = null;
    (component as unknown as { update: () => void }).update = () => {
      if (renderEffect) renderEffect();
      else update();
    };

    // ============================================================
    // 把「渲染器的 unmount」暴露到组件实例上
    // ============================================================
    // ⚠️ 2026-09-29 新增：KeepAlive 淘汰缓存条目时需要**真正卸载**该组件
    // （递归处理其 subTree 内的嵌套组件、移除 DOM、触发 beforeUnmount/unmounted），
    // 但 `@lytjs/component` **拿不到渲染器实例**（vdom 不能反向依赖 component，
    // 而 component 依赖 vdom —— 只能由 vdom 主动把能力交出去）。
    //
    // 与上方 `component.update` 同款：vdom 在挂载时把渲染器能力写到实例上，
    // 组件（KeepAlive）按需读取。用 `doRemove = true` 保证 DOM 一并移除。
    (component as unknown as { __rendererUnmount?: (vnode: VNode) => void }).__rendererUnmount = (
      v: VNode,
    ) => ctx.unmount(v, null, null, true);

    // 组件首次挂载的调试信息：仅在 DEV 且开启调试开关时输出
    if (__DEV__) {
      debugMount(component);
    }

    // Run the initial update (mount)
    //
    // 调度器与 `watchEffect` 的默认 `flush: 'pre'` 保持一致（同一个 `queuePreFlushCb`），
    // 所以「多次改数据只重渲染一次」的批处理行为不变；区别只在于**我们拿到了 runner**。
    renderEffect = effect(update, {
      scheduler: () => queuePreFlushCb(() => renderEffect?.()),
    });
  }

  return {
    mountComponent,
  };
}

/**
 * DEV 下的组件挂载调试输出（此前这里是一段只赋值不使用的死代码）
 */
function debugMount(component: { type: unknown }): void {
  if (!__DEV__) return;
  const name = (component.type as ComponentInternalRuntimeProps).name || 'anonymous';
  // eslint-disable-next-line no-console
  console.debug(`[LytJS] component mounted: ${name}`);
}
