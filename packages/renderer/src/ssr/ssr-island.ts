/**
 * @lytjs/renderer - SSR Island 架构
 * 为 SSR 应用提供基于 Island 的选择性 hydration
 */

import type { VNode } from '@lytjs/vdom';
import { Fragment, Text, ShapeFlags, createVNode } from '@lytjs/vdom';
import { isString, isArray } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import { isOn } from '@lytjs/common-events';
import { patchProp } from '@lytjs/adapter-web';
// ⚠️ 2026-10-28：模板编译器走**注入缝**（`@lytjs/component`，与客户端的
//   `finishComponentSetup` 同一个注入点）。renderer **不**静态 import 编译器 ——
//   那会把 52 KB 拖进每一个用 renderer 的产物（P1-N 的教训）。
import { getTemplateCompiler } from '@lytjs/component';
import { proxyRefs, computed } from '@lytjs/reactivity';
import { escapeHtml } from '../utils';

// ============================================================
// 类型定义
// ============================================================

/**
 * Island 组件的精简接口。
 * 使用简化的结构以避免与完整的 ComponentOptions 紧耦合。
 */
export interface ComponentOptions {
  name?: string;
  props?: Record<string, unknown>;
  setup?: (props: Record<string, unknown>) => Record<string, unknown> | VNode | void;
  render?: (ctx: Record<string, unknown>) => VNode;
  data?: () => Record<string, unknown>;
  [key: string]: unknown;
}

// ============================================================
// Island 注册表
// ============================================================

const islandRegistry = new Map<string, ComponentOptions>();

/**
 * 注册一个命名 Island 组件。
 *
 * 注册的组件后续可以在 `hydrateIsland` 和 `createIslandSSRContent` 中通过名称引用。
 */
export function registerIslandComponent(name: string, component: ComponentOptions): void {
  if (!name || typeof name !== 'string') {
    if (__DEV__) {
      warn(`registerIslandComponent: invalid island name "${String(name)}"`);
    }
    return;
  }
  islandRegistry.set(name, component);
}

/**
 * 根据名称获取已注册的 Island 组件。
 * 如果未找到则返回 undefined。
 */
export function getIslandComponent(name: string): ComponentOptions | undefined {
  return islandRegistry.get(name);
}

// ============================================================
// createIslandSSRContent
// ============================================================

/**
 * 创建服务端渲染的 Island 占位符 HTML。
 *
 * 生成一个带有 `data-island` 和 `data-props` 属性的 `<div>` 元素。
 * props 被序列化为 JSON 并进行 base64 编码，以便安全嵌入 HTML。
 */
export function createIslandSSRContent(name: string, props: Record<string, unknown>): string {
  const encodedProps = encodeProps(props);
  return `<div data-island="${escapeHtml(name)}" data-props="${escapeHtml(encodedProps)}"><!-- island placeholder --></div>`;
}

// ============================================================
// hydrateIsland
// ============================================================

/**
 * 对容器内的 Island 元素执行 hydration。
 *
 * 查找带有 `data-island` 属性的元素，解码序列化的 props，
 * 并使用注册的 Island 组件对它们进行 hydration。
 *
 * @param container - 一个 Element 或 CSS 选择器字符串，用于查找容器
 * @param component - 用于 hydration 的组件选项（覆盖注册表）
 * @param props - 可选的 props 覆盖（覆盖序列化的 props）
 */
export async function hydrateIsland(
  container: Element | string,
  component: ComponentOptions,
  props?: Record<string, unknown>,
): Promise<void> {
  // 解析容器
  let root: Element | null;
  if (isString(container)) {
    root = document.querySelector(container);
  } else {
    root = container;
  }

  if (!root) {
    if (__DEV__) {
      warn(`hydrateIsland: container not found for "${String(container)}"`);
    }
    return;
  }

  // 查找容器内所有 Island 元素
  const islandElements = root.querySelectorAll('[data-island]');

  for (let i = 0; i < islandElements.length; i++) {
    const el = islandElements[i] as HTMLElement;
    const islandName = el.getAttribute('data-island');

    if (!islandName) continue;

    // 确定使用哪个组件：显式参数或注册表查找
    // 仅当 Island 名称与注册组件完全匹配时才匹配；
    // 不要在名称不匹配时回退到传入的组件，以防止错误的 hydration。
    let resolvedComponent = islandRegistry.get(islandName);
    if (!resolvedComponent && islandName === component.name) {
      resolvedComponent = component;
    }
    if (!resolvedComponent) {
      // 没有找到匹配的组件；跳过此 Island
      continue;
    }

    // 确定 props：显式参数或从 data-props 属性解码
    const resolvedProps = props ?? decodeProps(el.getAttribute('data-props') ?? '');

    // 对 Island 元素执行 hydration
    await hydrateIslandElement(el, resolvedComponent, resolvedProps);
  }
}

// ============================================================
// 内部工具函数
// ============================================================

// ============================================================
// 组件 → 根 vnode（无实例解析）
// ============================================================

/**
 * 判定一个值是否为 vnode。
 * 组件 `setup` / `render` 的返回值可能是普通对象（ctx），须先甄别。
 */
function isVNodeLike(value: unknown): value is VNode {
  return !!value && typeof value === 'object' && 'type' in (value as object);
}

/**
 * 把组件选项解析为其**根 vnode**（**不创建组件实例**）。
 *
 * 解析顺序（本仓的**单一真相源**）：
 * 1. `setup(props)` 的返回值若本身是 vnode ⇒ 直接使用（不再调 `render`）；
 * 1.5 若返回值是**函数** ⇒ 视作渲染函数并调用（组合式 API 的标准写法）；
 * 2. 否则若 `setup` 返回了对象 ⇒ 作为 ctx 传给 `render`；
 * 3. `setup` 未返回对象（含根本没有 `setup`）⇒ 以 `props` 作 ctx 传给 `render`。
 *
 * ⚠️ 2026-10-02：本函数由**三份**同族副本合并而来 —— 分别是
 * `hydrateIslandElement`、`hydrateVNode` 的组件分支、`hydrateChildVNode` 的组件分支。
 * 合并前它们语义**不一致**：`hydrateIslandElement` 是「setup 优先、setup 返回值作 render
 * 的 ctx」，而另外两处是「render 优先、且恒以 props 作 ctx」⇒ **同一文件内同一个问题两种答案**。
 * 现统一为 setup 优先，与 `ssr-renderer.ts` 的 `renderComponentToString` 及
 * `adapter-web` 的 `hydrateComponent` 一致。
 *
 * ⚠️ 同族实现**仍未合并**的 3 处，修改本函数时必须一并核对：
 * · `renderer/src/ssr/ssr-renderer.ts` · `renderComponentToString` —— ✅ **2026-10-02 已合并**
 *   （改用下文的 async 版，同时让同步 SSR 首次支持 async setup）
 * · `adapter-web/src/web-hydration.ts` · `hydrateComponent` —— **同语义**（该包不依赖本包，保有等价副本）
 * · `renderer/src/ssr/ssr-stream.ts` · `streamComponentAsync` 与
 *   `renderer/src/ssr/ssr-stream-optimized.ts` · `streamComponent` —— ✅ **2026-10-02 已合并**，
 *   改用下文的 `resolveComponentRootVNodeAsync`（它们额外支持 async setup，
 *   而本同步版无法 `await`）。二者与本节共享同一段「setup 结果 → 根 vnode」逻辑。
 */
export function resolveComponentRootVNode(
  component: ComponentOptions,
  props: Record<string, unknown>,
): VNode | undefined {
  let setupResult: unknown;
  if (typeof component.setup === 'function') {
    setupResult = component.setup(props);
  }
  return resolveFromSetupResult(component, setupResult, props);
}

/**
 * `resolveComponentRootVNode` 的 **async 变体**：额外支持 `setup` 返回 Promise。
 *
 * ⚠️ 为什么需要两份而不是一份：同步版被 `hydrateVNode` / `hydrateChildVNode` 调用，
 * 二者是**同步函数**、无法 `await`；而流式 SSR 必须等待 async setup。
 * 故同步/异步各留一个薄壳，**共享「setup 结果 → 根 vnode」的后半段**
 * （`resolveFromSetupResult`），避免像本轮之前那样再次分叉成两份实现。
 *
 * ⚠️ 一致性由测试保证：`packages/renderer/tests/ssr-stream-component.test.ts`
 * 断言同一组件在**同步入口（`renderToString`）与流式入口（`renderToStream`）**产出一致。
 *
 * ⚠️ **2026-10-02 后续已消除的不对称**：同步 SSR 入口 `renderToString` 原本
 * **不 await async `setup`**（`renderComponentToString` 没有 Promise 分支，会把
 * Promise 对象直接当成 ctx）。现已把 `ssr-renderer.ts` 的递归改为 async 并复用
 * 本函数 ⇒ **同步 / 流式 / 优化流式三个入口对 async setup 的支持面已对齐**，
 * 一致性测试现在**覆盖** async setup（此前该测试刻意回避它）。
 */
export async function resolveComponentRootVNodeAsync(
  component: ComponentOptions,
  props: Record<string, unknown>,
): Promise<VNode | undefined> {
  let setupResult: unknown;
  if (typeof component.setup === 'function') {
    const result = component.setup(props);
    setupResult = result instanceof Promise ? await result : result;
  }
  return resolveFromSetupResult(component, setupResult, props);
}

/**
 * 模板编译产物的缓存（按**组件对象**缓存）。
 *
 * 为什么按组件对象而不是按 template 字符串：同一个 template 字符串被两个不同组件
 * 复用时，产物的 `_ctx` 语义相同、可以共享；但按对象缓存能让「SSR 两次同一组件
 * 产出完全一致」这条判据不受字符串去重策略影响，也不会因字符串表无限增长。
 */
const templateRenderCache = new WeakMap<object, (ctx: unknown) => unknown>();

/**
 * 取（并缓存）组件的模板渲染函数。
 *
 * ⚠️ 2026-10-28 新增（P0）：`resolveFromSetupResult` 此前**只认 `render`**，
 *   于是任何用 `template` 写的组件在 SSR 下都返回 `undefined` ⇒ **渲染成空串**，
 *   且**没有任何告警**。实测：
 *
 * ```
 * { setup(){ return { msg: ref('hi') } }, render: … }   → <div id="app"><span>hi</span></div>
 * { setup(){ return { msg: ref('hi') } }, template: … } → ""        ← 静默空白
 * ```
 *
 * 同一个组件对象在客户端能渲染（`finishComponentSetup` 步骤 7 支持 `template`）、
 * 在服务端渲染成空 —— 这正是本仓反复出现的「**静默**」缺陷：SSR 页面白屏，
 * 而开发者在浏览器里看到的是正常内容。
 *
 * 编译器从 `@lytjs/component` 的注入缝取（`@lytjs/core` 在首次 `createApp` 时注入，
 * `@lytjs/core` 的 `renderToString` 也会注入）。**未注入时给可操作的告警**，
 * 而不是继续静默返回空串。
 */
function getTemplateRender(component: Record<string, unknown>): ((ctx: unknown) => unknown) | null {
  const cached = templateRenderCache.get(component);
  if (cached) return cached;

  const compiler = getTemplateCompiler();
  if (!compiler) {
    if (__DEV__) {
      warn(
        `组件 "${(component.name as string) || '(anonymous)'}" 提供了 template，` +
          `但服务端没有可用的模板编译器，SSR 输出为空。` +
          // ⚠️ 文案里刻意**不**给包名加引号：本仓有一条分层守卫
          // （tests/layering-guard.test.ts）扫源码禁止 renderer 出现带引号的包名，
          // 而它只剥注释、不解析字符串 ⇒ 一句字面量 import 会被当成真违规（咬过两次）。
          `修法：① 从 @lytjs/core（而不是 @lytjs/renderer）导入 renderToString —— 它会注入编译器；` +
          `② 或显式调用 setTemplateCompiler() 注入自己的实现；` +
          `③ 或改用 AOT 预编译的 render 函数。`,
      );
    }
    return null;
  }

  const render = compiler(component.template as string) as (ctx: unknown) => unknown;
  templateRenderCache.set(component, render);
  return render;
}

/**
 * 为「无实例」的 SSR 渲染构造一个**与客户端语义一致**的上下文对象。
 *
 * ⚠️ 2026-10-28 新增（P0）：此前 ctx 要么是 `setup()` 的返回值、要么是 `props`，
 *   于是两类写法在 SSR 下静默失效：
 *   · **选项式 `data()` 完全不执行** ⇒ 模板里 `{{ n }}` 得到 `undefined`；
 *   · **`setup()` 返回的 ref 不解包** ⇒ 模板里 `{{ msg }}` 得到 `[object Object]`
 *     （客户端走公共实例代理会自动解包，服务端不走）。
 *
 * 合并顺序与 Vue 的公共实例一致：`props` < `data` < `setup` 返回值，
 * 最后经 `proxyRefs` 包一层（自动解包 ref / computed），`methods` 绑定到该代理，
 * `computed` 以懒求值方式挂上（其 getter 的 `this` 也是该代理）。
 *
 * ⚠️ 这里**不是**第二套组件实现：它只做「把选项摊平成 ctx」这一件事，
 *   不碰生命周期、不碰错误边界、不碰 props 校验 —— 那些仍由客户端实例负责，
 *   因为 SSR 只渲染一次、不挂载。
 */
function buildSSRContext(
  component: ComponentOptions,
  setupResult: unknown,
  props: Record<string, unknown>,
): Record<string, unknown> {
  // 局部注册的子组件：编译器把 `<Child />` 编成 `createElementVNode(_ctx.Child, …)`，
  // 而客户端的公共实例代理会自动解析 `components` 选项。SSR 没有那个代理，
  // 必须显式摊平 —— 否则嵌套子组件**静默渲染为空**（实测 `<div id="app"></div>`）。
  // 放在最底层：props / data / setup 返回值仍可覆盖同名键。
  const raw: Record<string, unknown> = {};
  if (component.components && typeof component.components === 'object') {
    Object.assign(raw, component.components);
  }
  Object.assign(raw, props);

  if (typeof component.data === 'function') {
    try {
      Object.assign(
        raw,
        (component.data as () => Record<string, unknown> | undefined).call(raw) ?? {},
      );
    } catch (err) {
      if (__DEV__) {
        warn(`SSR: 组件 data() 抛错（该组件的 data 字段全部缺失）：${(err as Error).message}`);
      }
    }
  }

  if (setupResult && typeof setupResult === 'object') {
    Object.assign(raw, setupResult as Record<string, unknown>);
  }

  const ctx = proxyRefs(raw) as Record<string, unknown>;

  if (component.methods && typeof component.methods === 'object') {
    for (const key of Object.keys(component.methods as object)) {
      const fn = (component.methods as Record<string, unknown>)[key];
      if (typeof fn === 'function') raw[key] = (fn as (...a: unknown[]) => unknown).bind(ctx);
    }
  }

  if (component.computed && typeof component.computed === 'object') {
    for (const key of Object.keys(component.computed as object)) {
      const opt = (component.computed as Record<string, unknown>)[key];
      if (typeof opt === 'function') {
        raw[key] = computed(() => (opt as () => unknown).call(ctx));
      } else if (
        opt &&
        typeof opt === 'object' &&
        typeof (opt as { get?: unknown }).get === 'function'
      ) {
        const o = opt as { get: () => unknown; set?: (v: unknown) => void };
        raw[key] = computed({
          get: () => o.get.call(ctx),
          set: o.set ? (v: unknown) => o.set!.call(ctx, v) : undefined,
        } as Parameters<typeof computed>[0]);
      }
    }
  }

  return ctx;
}

/**
 * 「setup 结果 → 根 vnode」的**共享后半段**（同步版与 async 版共用）。
 *
 * 1. `setupResult` 本身是 vnode ⇒ 直接使用（跳过 `render`）；
 * 2. 若它是**函数** ⇒ 视作渲染函数并调用；
 * 3. 否则构造 ctx（`props` + `data` + `setup` 返回值，经 `proxyRefs` 解包），
 *    依次尝试 `component.render` → `component.template`（运行时编译）。
 */
function resolveFromSetupResult(
  component: ComponentOptions,
  setupResult: unknown,
  props: Record<string, unknown>,
): VNode | undefined {
  // setup 直接返回 VNode ⇒ 跳过 render
  if (isVNodeLike(setupResult)) return setupResult;

  // ★ 2026-10-25：`setup()` 返回**渲染函数**（组合式 API 的标准写法
  //   `setup() { return () => h('div') }`）此前被完全忽略 —— 它既不是 vnode、
  //   也不走 `component.render` ⇒ 返回 `undefined` ⇒ **SSR 渲染为空**。
  //   实测：同一组件经同步入口与流式入口都输出 `""`（整棵子树静默消失）。
  if (typeof setupResult === 'function') {
    const rendered = (setupResult as () => unknown)();
    if (isVNodeLike(rendered)) return rendered;
    // 多根：包一层 Fragment（与 vdom 的渲染路径一致）
    if (isArray(rendered)) {
      return createVNode(Fragment, null, rendered as never) as unknown as VNode;
    }
  }

  const ctx = buildSSRContext(component, setupResult, props);

  if (typeof component.render === 'function') {
    const result = component.render(ctx);
    if (isVNodeLike(result)) return result;
    if (isArray(result)) {
      return createVNode(Fragment, null, result as never) as unknown as VNode;
    }
  }

  // ★ 2026-10-28：模板分支（此前 SSR **完全不支持** `template`，见 getTemplateRender）
  if (typeof component.template === 'string' && component.template.length > 0) {
    const render = getTemplateRender(component as Record<string, unknown>);
    if (!render) return undefined;
    const result = render(ctx);
    if (isVNodeLike(result)) return result;
    if (isArray(result)) {
      return createVNode(Fragment, null, result as never) as unknown as VNode;
    }
    if (__DEV__) {
      warn(
        `SSR: 组件 "${component.name || '(anonymous)'}" 的模板编译产物没有返回 vnode ` +
          `（得到 ${typeof result}），该组件输出为空。`,
      );
    }
  }

  return undefined;
}

/**
 * 使用给定的组件和 props 对单个 Island 元素执行 hydration。
 *
 * 与替换 innerHTML 不同，此函数通过遍历 vnode 树并与现有 DOM 节点进行
 * 协调来执行真正的 hydration，复用匹配的节点，仅更新/创建不同的节点。
 */
async function hydrateIslandElement(
  el: HTMLElement,
  component: ComponentOptions,
  props: Record<string, unknown>,
): Promise<void> {
  const vnode = resolveComponentRootVNode(component, props);

  if (vnode) {
    // 移除 Island 元素内的占位符注释节点
    // 但保留现有 DOM 子节点用于 hydration 比较
    const placeholderComments: ChildNode[] = [];
    for (let i = el.childNodes.length - 1; i >= 0; i--) {
      const child = el.childNodes[i];
      if (child && child.nodeType === Node.COMMENT_NODE) {
        placeholderComments.push(child);
      }
    }
    for (const comment of placeholderComments) {
      comment.remove();
    }

    // 执行真正的 hydration：遍历 vnode 树并与现有 DOM 协调
    hydrateVNode(el, vnode);
  }
}

/**
 * 对父元素的现有 DOM 子节点执行 VNode hydration。
 *
 * 并行遍历 vnode 树和 DOM 树：
 * - 文本节点：比较 textContent，匹配则复用，不同则更新
 * - 元素节点：比较 tagName 和 key 属性，匹配则复用，
 *   递归 hydrate 子节点，无匹配则创建新节点
 * - Fragment 节点：对每个子 vnode 与兄弟 DOM 节点进行 hydration
 * - 未匹配的 DOM 节点被移除；未匹配的 vnode 创建新的 DOM 节点
 */
export function hydrateVNode(parent: Element, vnode: VNode): void {
  const { type, children } = vnode;

  // 处理 Fragment：对每个子 vnode 与兄弟 DOM 节点进行 hydration
  if (type === Fragment) {
    if (isArray(children)) {
      let domIndex = 0;
      const existingChildren = Array.from(parent.childNodes);
      for (let i = 0; i < children.length; i++) {
        const childVNode = children[i];
        if (childVNode == null) continue;
        domIndex = hydrateChildVNode(parent, childVNode, existingChildren, domIndex);
      }
      // 移除剩余未匹配的 DOM 节点
      removeRemainingChildren(parent, existingChildren, domIndex);
    }
    return;
  }

  // 处理 Text vnode
  if (type === Text) {
    const text = isString(children) ? children : String(children ?? '');
    const firstChild = parent.firstChild;
    if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
      // 如果内容匹配则复用现有文本节点
      if (firstChild.textContent !== text) {
        firstChild.textContent = text;
      }
    } else {
      // 没有匹配的文本节点；创建新节点
      const textNode = document.createTextNode(text);
      parent.appendChild(textNode);
    }
    return;
  }

  // 处理 Element vnode
  if (typeof type === 'string') {
    const tag = type.toLowerCase();

    // 尝试在现有 DOM 子节点中查找匹配的元素
    let matchedElement: Element | null = null;
    const existingChildren = Array.from(parent.childNodes);

    for (let i = 0; i < existingChildren.length; i++) {
      const child = existingChildren[i];
      if (child && child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        if (el.tagName.toLowerCase() === tag) {
          matchedElement = el;
          break;
        }
      }
    }

    if (matchedElement) {
      // 复用现有元素：更新属性并 hydrate 子节点
      hydrateAttributes(matchedElement, vnode);
      hydrateElementChildren(matchedElement, vnode);
    } else {
      // 没有匹配的元素；从 vnode 创建新元素
      // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
      const newElement = createElementFromVNode(vnode);
      if (newElement) {
        parent.appendChild(newElement);
      }
    }
    return;
  }

  // 处理组件 VNode（有状态或函数式组件）
  // ⚠️ 2026-10-02：改用共用的 `resolveComponentRootVNode`。此前本分支是
  // 「render 优先、且恒以 props 作 ctx」，与顶层 `hydrateIslandElement` 的
  // 「setup 优先、setup 返回值作 ctx」**同文件内语义分歧**，现统一。
  if (typeof type === 'object' && type !== null) {
    const childVNode = resolveComponentRootVNode(type as ComponentOptions, vnode.props ?? {});

    // 递归 hydrate 解析后的子 VNode
    if (childVNode) {
      hydrateVNode(parent, childVNode);
    } else if (__DEV__) {
      warn(`hydrateVNode: could not resolve component VNode for hydration`);
    }
    return;
  }
}

/**
 * 在给定索引处对单个子 vnode 与现有 DOM 子节点执行 hydration。
 * 返回消费节点后的下一个 DOM 索引。
 */
function hydrateChildVNode(
  parent: Element,
  vnode: VNode,
  existingChildren: ChildNode[],
  domIndex: number,
): number {
  const { type, children } = vnode;

  // 处理 Fragment：hydrate 每个子节点
  if (type === Fragment) {
    if (isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child != null) {
          domIndex = hydrateChildVNode(parent, child, existingChildren, domIndex);
        }
      }
    }
    return domIndex;
  }

  // 处理 Text
  if (type === Text) {
    const text = isString(children) ? children : String(children ?? '');
    if (domIndex < existingChildren.length) {
      const existingNode = existingChildren[domIndex];
      if (!existingNode) {
        parent.appendChild(document.createTextNode(text));
        return domIndex + 1;
      }
      if (existingNode.nodeType === Node.TEXT_NODE) {
        // 复用现有文本节点
        if (existingNode.textContent !== text) {
          existingNode.textContent = text;
        }
        return domIndex + 1;
      }
      // 类型不匹配：替换现有节点
      const textNode = document.createTextNode(text);
      parent.replaceChild(textNode, existingNode);
      return domIndex + 1;
    }
    // 没有现有节点；追加新文本节点
    parent.appendChild(document.createTextNode(text));
    return domIndex + 1;
  }

  // 处理 Element
  if (typeof type === 'string') {
    const tag = type.toLowerCase();

    // FIX: P2-34 缓存 vnodeToSimpleHTML 结果到局部变量，避免重复调用
    const _vnodeHtml = vnodeToSimpleHTML(vnode);

    if (domIndex < existingChildren.length) {
      const existingNode = existingChildren[domIndex];
      if (!existingNode) {
        // 没有现有节点；追加新元素
        // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
        const newElement = createElementFromVNode(vnode);
        if (newElement) {
          parent.appendChild(newElement);
        }
        return domIndex + 1;
      }
      if (existingNode.nodeType === Node.ELEMENT_NODE) {
        const el = existingNode as Element;
        if (el.tagName.toLowerCase() === tag) {
          // 标签匹配：复用并 hydrate
          hydrateAttributes(el, vnode);
          hydrateElementChildren(el, vnode);
          return domIndex + 1;
        }
        // 标签不匹配：替换为新元素
        // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
        const newElement = createElementFromVNode(vnode);
        if (newElement) {
          parent.replaceChild(newElement, existingNode);
        }
        return domIndex + 1;
      }
      // 不是元素节点：替换
      // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
      const newElement = createElementFromVNode(vnode);
      if (newElement) {
        parent.replaceChild(newElement, existingNode);
      }
      return domIndex + 1;
    }
    // 没有现有节点；追加新元素
    // FIX: P0-3 使用安全的 DOM API 替代 innerHTML
    const newElement = createElementFromVNode(vnode);
    if (newElement) {
      parent.appendChild(newElement);
    }
    return domIndex + 1;
  }

  // 处理组件 VNode（有状态或函数式组件）
  // ⚠️ 2026-10-02：本分支是同一个问题的**第三份副本**（另两份在 `hydrateIslandElement`
  // 与 `hydrateVNode`），且同样停留在「render 优先、恒以 props 作 ctx」的旧语义。
  // 一并收敛到 `resolveComponentRootVNode`。
  if (typeof type === 'object' && type !== null) {
    const childVNode = resolveComponentRootVNode(type as ComponentOptions, vnode.props ?? {});

    if (childVNode) {
      domIndex = hydrateChildVNode(parent, childVNode, existingChildren, domIndex);
    }
    return domIndex;
  }

  return domIndex;
}

/**
 * 从 domIndex 开始移除剩余未匹配的 DOM 子节点。
 */
function removeRemainingChildren(
  parent: Element,
  existingChildren: ChildNode[],
  domIndex: number,
): void {
  for (let i = existingChildren.length - 1; i >= domIndex; i--) {
    const child = existingChildren[i];
    if (child) {
      parent.removeChild(child);
    }
  }
}

/**
 * 更新现有 DOM 元素的属性以匹配 vnode props。
 */
function hydrateAttributes(el: Element, vnode: VNode): void {
  const props = vnode.props ?? {};
  const vnodeKeys = new Set<string>();

  // 从 vnode props 设置或更新属性
  for (const key in props) {
    if (key === 'key' || key === 'ref') continue;
    const value = props[key];

    // ★ 事件与复合属性必须交给渲染器自身的 prop 语义（`patchProp`）处理，
    // 不能当普通属性 `setAttribute`。
    //
    // 2026-10-02 实测（`packages/renderer/tests/hydration-events.test.ts`）：
    // ① 事件：此前 `onClick` 被 `setAttribute('onClick', String(fn))` 写成属性，
    //    随即被下方「移除未声明属性」循环按**小写**名（`onclick`）判定为未声明而删除
    //    ⇒ 水合后 DOM 上既无属性、也无监听器，**事件永久失效**（实测点击计数恒为 0）。
    //    走 `patchProp` 才是 invoker（`addEventListener`）语义。**故意不登记 vnodeKeys**：
    //    事件不落 DOM 属性，且这样 SSR 内联的 `on*` 属性会被下方循环清掉，避免双触发。
    // ② 复合属性：`class` / `style` 由 `patchClass` / `patchStyle` 处理。它们**会**写 DOM
    //    属性，故必须登记 vnodeKeys，否则刚写入的 class/style 会被下方循环误删（实测过）。
    if (isOn(key)) {
      patchProp(el, key, null, value, false);
      continue;
    }
    if (key === 'class' || key === 'style') {
      patchProp(el, key, null, value, false);
      vnodeKeys.add(key);
      continue;
    }

    vnodeKeys.add(key);
    // HTML 文档中 `setAttribute` 会把属性名小写化（实测 `tabIndex` → `tabindex`），
    // 故同时登记小写形式；否则刚写入的属性会被下方循环当成「未声明」而删掉。
    vnodeKeys.add(key.toLowerCase());

    if (typeof value === 'boolean') {
      if (value) {
        el.setAttribute(key, '');
      } else {
        el.removeAttribute(key);
      }
    } else if (value != null && value !== '') {
      el.setAttribute(key, String(value));
    } else {
      el.removeAttribute(key);
    }
  }

  // 移除 DOM 元素上存在但 vnode props 中不存在的属性
  const existingAttrs = Array.from(el.attributes);
  for (const attr of existingAttrs) {
    if (!vnodeKeys.has(attr.name) && attr.name !== 'data-island' && attr.name !== 'data-props') {
      el.removeAttribute(attr.name);
    }
  }
}

/**
 * 对现有元素的子节点与 vnode 子节点执行 hydration。
 */
function hydrateElementChildren(el: Element, vnode: VNode): void {
  const { children, shapeFlag } = vnode;

  // FIX: P2-35 使用 ShapeFlags 常量替代魔法数字
  if (shapeFlag != null && shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // TEXT_CHILDREN
    const text = isString(children) ? children : String(children ?? '');
    if (el.childNodes.length > 0) {
      // 如果存在则复用第一个文本子节点
      // FIX: P2-v11-03 添加 null 检查替代非空断言，
      // 防止无子节点时 firstChild 为 null 导致运行时崩溃
      const firstChild = el.firstChild;
      if (!firstChild) {
        el.appendChild(document.createTextNode(text));
        return;
      }
      if (firstChild.nodeType === Node.TEXT_NODE) {
        if (firstChild.textContent !== text) {
          firstChild.textContent = text;
        }
        // 移除多余的子节点
        while (el.childNodes.length > 1) {
          const lastChild = el.lastChild;
          // FIX: P2-51 添加 null 检查替代非空断言，防御性编程
          if (lastChild) {
            el.removeChild(lastChild);
          } else {
            break;
          }
        }
      } else {
        // 用单个文本节点替换所有子节点
        el.textContent = text;
      }
    } else {
      el.appendChild(document.createTextNode(text));
    }
    return;
  }

  if (isArray(children)) {
    const existingChildren = Array.from(el.childNodes);
    let domIndex = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child != null) {
        domIndex = hydrateChildVNode(el, child, existingChildren, domIndex);
      }
    }
    removeRemainingChildren(el, existingChildren, domIndex);
    return;
  }
}

/**
 * 安全创建 DOM 元素
 * FIX: P0-3 避免使用 innerHTML，使用安全的 DOM API
 */
function createElementFromVNode(vnode: VNode): Element | null {
  const type = vnode.type;
  if (typeof type !== 'string') return null;

  const el = document.createElement(type);

  // 设置属性
  if (vnode.props) {
    for (const [key, value] of Object.entries(vnode.props)) {
      if (key === 'children' || key === 'key') continue;
      if (value != null) {
        el.setAttribute(key, String(value));
      }
    }
  }

  // 设置子节点
  if (vnode.children) {
    if (typeof vnode.children === 'string') {
      el.textContent = vnode.children;
    } else if (Array.isArray(vnode.children)) {
      for (const child of vnode.children) {
        if (typeof child === 'string') {
          el.appendChild(document.createTextNode(child));
        } else if (child && typeof child === 'object' && 'type' in child) {
          const childEl = createElementFromVNode(child as VNode);
          if (childEl) {
            el.appendChild(childEl);
          }
        }
      }
    }
  }

  return el;
}

/**
 * 简单的 vnode 转 HTML 转换器，用于 Island hydration。
 * 处理基本元素、文本、Fragment 和注释。
 */
function vnodeToSimpleHTML(vnode: VNode): string {
  const { type, children } = vnode;

  // 处理 Fragment：渲染每个子节点
  if (type === Fragment) {
    if (isArray(children)) {
      return children.map((child) => (child != null ? vnodeToSimpleHTML(child) : '')).join('');
    }
    return '';
  }

  // 处理 Text vnode
  if (type === Text) {
    const text = isString(children) ? children : String(children ?? '');
    return escapeHtml(text);
  }

  // 处理 Element vnode
  if (typeof type === 'string') {
    const props = vnode.props ?? {};
    let attrs = '';
    for (const key in props) {
      if (key === 'key' || key === 'ref') continue;
      const value = props[key];
      if (typeof value === 'boolean' && value) {
        attrs += ` ${key}`;
      } else if (value != null && value !== '') {
        attrs += ` ${key}="${escapeHtml(String(value))}"`;
      }
    }

    const tag = type;

    // 渲染子节点
    let childContent = '';
    if (children != null) {
      if (isString(children)) {
        childContent = escapeHtml(children);
      } else if (isArray(children)) {
        childContent = children
          .map((child) => (child != null ? vnodeToSimpleHTML(child as VNode) : ''))
          .join('');
      } else if (typeof children === 'object' && 'type' in (children as object)) {
        // 单个 VNode 子节点
        // FIX: P2-batch2-2 添加运行时类型检查，避免不安全的类型断言
        if (children != null && typeof children === 'object' && 'type' in children) {
          childContent = vnodeToSimpleHTML(children as unknown as VNode);
        }
      }
    }

    return `<${tag}${attrs}>${childContent}</${tag}>`;
  }

  return '';
}

/**
 * 使用 TextEncoder 将字符串编码为 base64（安全替代 btoa(unescape(...))）。
 * FIX: P2-50 使用分块处理（每次 8192 字节）替代逐字符拼接，
 * 避免大字符串时 String.fromCharCode 的性能问题和调用栈开销。
 */
function uint8ToBase64(bytes: Uint8Array): string {
  const CHUNK_SIZE = 8192;
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    chunks.push(String.fromCharCode(...chunk));
  }
  return btoa(chunks.join(''));
}

/**
 * 使用 atob 将 base64 解码为 Uint8Array（安全替代 escape(atob(...))）。
 */
function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * 将 props 编码为 base64 字符串，用于嵌入 HTML 属性。
 */
function encodeProps(props: Record<string, unknown>): string {
  const json = JSON.stringify(props);
  // 使用 TextEncoder 进行安全的 UTF-8 到 base64 转换
  const bytes = new TextEncoder().encode(json);
  return uint8ToBase64(bytes);
}

/**
 * 从 base64 字符串解码 props。
 */
function decodeProps(encoded: string): Record<string, unknown> {
  if (!encoded) return {};

  try {
    // 使用 TextDecoder 进行安全的 base64 到 UTF-8 转换
    const bytes = base64ToUint8(encoded);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    if (__DEV__) {
      warn(`hydrateIsland: failed to decode props from "${encoded}"`);
    }
    return {};
  }
}
