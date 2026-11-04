/**
 * @lytjs/vdom - patch-element
 *
 * Element vnode 的挂载和更新逻辑。
 * 包含 mountElement、patchElement、diffProps、setRef 等函数。
 */

import type { VNode, ComponentInternalInstance } from '@lytjs/common-vnode';
import { ShapeFlags, PatchFlags } from '@lytjs/common-vnode';
import { hasChanged, EMPTY_OBJ, isFunction } from '@lytjs/common-is';
import { warn } from '@lytjs/common-error';
import type { SuspenseBoundary } from './types';
import { invokeDirectiveHook } from './directives';

// ============================================================
// RendererContext - 子模块共享的渲染器上下文接口
// ============================================================

/**
 * 渲染器内部上下文，由 createRenderer 创建并传递给各子模块工厂函数。
 * 包含 host 操作、vnode el 辅助函数、以及核心 patch/unmount/move 递归函数。
 */
export interface RendererContext<HN, HE extends HN> {
  // 宿主操作
  createElement: (type: string) => HE;
  setElementText: (node: HE, text: string) => void;
  insert: (child: HN, parent: HN, anchor?: HN | null) => void;
  remove: (child: HN) => void;
  createText: (text: string) => HN;
  setText: (node: HN, text: string) => void;
  patchProp: (el: HE, key: string, prevValue: unknown, nextValue: unknown) => void;
  createComment: (text: string) => HN;
  querySelector: ((selector: string) => HE | null) | undefined;
  /** 取容器的子节点列表（水合认领时按序扫描） */
  getChildNodes: ((node: HN) => HN[]) | undefined;
  /** 水合用：取节点类型（1=元素 / 3=文本 / 8=注释） */
  getNodeType: ((node: HN) => number) | undefined;
  /** 水合用：取元素标签名（小写） */
  getTagName: ((el: HE) => string) | undefined;
  /** 水合用：取元素属性名（小写），用于清理 SSR 独有属性 */
  getAttributeNames: ((el: HE) => string[]) | undefined;
  /** 水合模式开关：`hydrate()` 入口置 true，首屏挂载期间复用既有 DOM */
  hydrating: boolean;
  /**
   * 本次水合中**已被某个 vnode 占用**的宿主节点。
   * 既包含「认领来的既有节点」，也包含「因 SSR 缺失而新建的节点」——
   * 否则后续兄弟 vnode 会把上一个 vnode 刚新建的节点误认成自己的（实测可致
   * 两个 vnode 共享同一 DOM 节点）。未占用者一律跳过。
   */
  hydrateUsed: Set<HN>;
  setupChildComponent:
    | ((vnode: VNode, parent: ComponentInternalInstance | null) => void)
    | undefined;
  /** FIX: P1-4 组件更新时规范化 props 的回调（由 @lytjs/component 注册） */
  normalizeProps:
    | ((instance: ComponentInternalInstance, rawProps: Record<string, unknown> | null) => void)
    | undefined;
  /** 组件更新时重建插槽的回调（由 @lytjs/core 注入，见 RendererOptions 同名说明） */
  initSlots: ((instance: ComponentInternalInstance, children: unknown) => void) | undefined;
  /** 组件生命周期钩子回调（由 @lytjs/core 注入，见 RendererOptions 的同名说明） */
  invokeMountedHook: ((instance: ComponentInternalInstance) => void) | undefined;
  invokeUpdatedHook: ((instance: ComponentInternalInstance) => void) | undefined;
  invokeBeforeUnmountHook: ((instance: ComponentInternalInstance) => void) | undefined;
  invokeUnmountedHook: ((instance: ComponentInternalInstance) => void) | undefined;
  /** 渲染期把当前实例交给上层（见 RendererOptions.setRenderingInstance） */
  setRenderingInstance: ((instance: ComponentInternalInstance | null) => void) | undefined;

  // VNode el helpers
  setVNodeEl: (vnode: VNode, el: HN | null) => void;
  getVNodeEl: (vnode: VNode) => HN | null;

  // 核心递归函数
  patch: (
    n1: VNode | null,
    n2: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  unmount: (
    vnode: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    doRemove: boolean,
  ) => void;
  move: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;

  // Children 辅助函数
  mountChildren: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;
  unmountChildren: (
    children: VNode[],
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;
  patchChildren: (
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  patchBlockChildren: (
    n1: VNode,
    n2: VNode,
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  diffChildrenInternal: (
    c1: VNode[],
    c2: VNode[],
    container: HN,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    fallbackAnchor: HN | null,
  ) => void;

  // FIX: P0-04 DOM 操作注册 ID，用于 list-diff 多渲染器隔离
  opsId?: symbol;
}

// ============================================================
// Element patch 工厂
// ============================================================

export interface ElementPatchAPI<HN, _HE extends HN> {
  mountElement: (
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
  ) => void;
  patchElement: (
    n1: VNode,
    n2: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ) => void;
  mountTextNode: (vnode: VNode, container: HN, anchor: HN | null) => void;
  mountCommentNode: (vnode: VNode, container: HN, anchor: HN | null) => void;
  setRef: (el: HN, ref: unknown, parentComponent: ComponentInternalInstance) => void;
}

/**
 * 创建 element 相关的 patch 函数集合。
 */
export function createElementPatch<HN, HE extends HN>(
  ctx: RendererContext<HN, HE>,
): ElementPatchAPI<HN, HE> {
  const {
    createElement,
    setElementText,
    insert,
    patchProp,
    createText,
    createComment,
    setVNodeEl,
    mountChildren,
  } = ctx;

  // ============================================================
  // setRef - 处理模板 ref 收集
  // ============================================================

  /**
   * 设置 ref 引用：
   * - 字符串 ref：存储到父组件实例的 refs 对象中
   * - 函数 ref：调用并传入元素
   * - 对象 ref（refImpl）：设置其 .value
   */
  function setRef(el: HN, ref: unknown, parentComponent: ComponentInternalInstance): void {
    if (typeof ref === 'string') {
      parentComponent.refs[ref] = el;
    } else if (typeof ref === 'function') {
      ref(el);
    } else if (ref !== null && typeof ref === 'object' && 'value' in ref) {
      (ref as { value: unknown }).value = el;
    } else if (__DEV__ && ref !== null && ref !== undefined) {
      // ⚠️ 2026-10-27 新增：此前「形态不认识」是**完全静默**的 ——
      //   最常见的误用是 React 风格的 `{ current: null }`，它既不是函数也没有 `.value`，
      //   于是 ref 永远拿不到元素，而组件里 `ref.current?.click()` 静默失效
      //   （实测 UI 的 Upload / RichTextEditor 都踩了这个坑）。
      //   这里把静默变成一条可见的 DEV 告警。
      warn(
        '[lytjs] 无法识别的 ref 形态：支持 字符串 / 函数 / 带 .value 的对象（ref() 的返回值）。' +
          '若你用的是 `{ current }`，请改成函数 ref：`ref: (el) => { obj.current = el }`。',
      );
    }
  }

  // ============================================================
  // 水合：认领容器内既有的节点
  //
  // 宿主契约（`@lytjs/host-contract` 的 `RendererHost`）**早已声明**
  // `getNodeType` / `getTagName` 且注释写明「用于 hydration」，`WebRendererHost`
  // 也已实现 —— 但此前 vdom 从未把它们接进渲染器，也没有 `hydrate()` 入口，
  // 于是「SSR 产出的 DOM 在客户端复用」这件事在本仓**没有任何实现**。
  // 本节把那三个已存在的零件接起来；`ctx.hydrating` 默认 false ⇒ 挂载路径不变。
  // ============================================================

  const NODE_TYPE_ELEMENT = 1;
  const NODE_TYPE_TEXT = 3;
  const NODE_TYPE_COMMENT = 8;

  /**
   * 在容器里找第一个**未被占用**且**类型匹配**（元素还需标签名相同）的既有节点。
   *
   * - 命中即登记进 `hydrateUsed` ⇒ 兄弟同标签（`<li>`×3）不会认领到同一个节点；
   * - 未命中返回 `null`，调用方退回「新建」（客户端比 SSR 多出来的节点）；
   * - 顺带跳过的节点**不删除**（容器里可能有本组件之外的其它内容，删不得）。
   *
   * ⚠️ 宿主没有 `firstChild`（`nextSibling` 只接受一个参数），故按
   * `getChildNodes` 的快照顺序扫描；水合期间只有「认领」不「插入」，
   * 已被占用的节点靠 `hydrateUsed` 排除，因此不会错位。
   */
  function claimExisting(container: HN, nodeType: number, tag?: string): HN | null {
    const { getNodeType, getTagName, getChildNodes, hydrateUsed } = ctx;
    if (!getNodeType || !getTagName || !getChildNodes) return null;
    const children = getChildNodes(container);
    for (let i = 0; i < children.length; i++) {
      const node = children[i] as HN;
      if (hydrateUsed.has(node)) continue;
      if (getNodeType(node) !== nodeType) continue;
      // 元素额外要求标签名一致（宿主返回小写标签名）
      if (nodeType === NODE_TYPE_ELEMENT && getTagName(node as HE) !== tag) continue;
      hydrateUsed.add(node);
      return node;
    }
    return null;
  }

  /**
   * 找「下一个尚未被认领的节点」—— 水合时新建节点的**正确插入锚点**。
   *
   * ⚠️ 2026-11-04 修（P1）：此前新建节点一律 `insert(el, container, anchor)`，
   *   而水合时 `anchor` 是 `null` ⇒ **追加到末尾**。于是
   *   「SSR 没有、客户端有」的节点会跑到兄弟节点后面：
   *
   *     SSR:   `<div><i>I</i></div>`
   *     客户端 vnode: `<div><span>N</span><i>I</i></div>`
   *     水合后: `<div><i>I</i><span>N</span></div>`   ← 顺序错
   *
   *   正确锚点是「第一个还没被认领的既有节点」：插在它前面，顺序就对了。
   */
  function nextUnclaimedChild(container: HN): HN | null {
    const { getChildNodes, hydrateUsed } = ctx;
    if (!getChildNodes) return null;
    for (const node of getChildNodes(container)) {
      if (!hydrateUsed.has(node)) return node;
    }
    return null;
  }

  /**
   * 水合时清理「服务端有、客户端 vnode 没有」的属性。
   *
   * ⚠️ 2026-11-04 修（P1）：`mountElement` 应用 props 时是 `patchProp(el, key, null, v)` ——
   *   只能**加**不能**减**。于是 SSR 渲染出的 `id` / `title` / `data-*` 在客户端
   *   vnode 里已经没有了，却会一直留在 DOM 上 ⇒ 水合结果 ≠ 客户端直接渲染的结果。
   *
   * 保留 `value` / `checked`：它们是**表单状态**（用户可能已经改过），
   * 删属性会让输入框/复选框被重置，比「多一个属性」严重得多。
   */
  function cleanupHydratedAttributes(el: HE, props: Record<string, unknown>): void {
    const { getAttributeNames } = ctx;
    if (!getAttributeNames) return;

    const expected = new Set<string>();
    for (const key of Object.keys(props)) {
      if (key === 'key' || key === 'ref' || key.startsWith('on')) continue;
      expected.add(key.toLowerCase());
    }
    // 表单状态不参与清理（见上方说明）
    const keep = new Set(['value', 'checked', 'selected']);

    for (const name of getAttributeNames(el)) {
      const lower = name.toLowerCase();
      if (expected.has(lower) || keep.has(lower)) continue;
      patchProp(el, lower, null, null);
    }
  }

  // ============================================================
  // mountElement
  // ============================================================

  function mountElement(
    vnode: VNode,
    container: HN,
    anchor: HN | null,
    isSVG: boolean,
    parentComponent: ComponentInternalInstance | null = null,
    parentSuspense: SuspenseBoundary | null = null,
  ): void {
    if (typeof vnode.type !== 'string') {
      warn(
        `mountElement received a vnode with non-string type (${String(vnode.type)}). ` +
          `Only element vnodes can be mounted as elements.`,
      );
      return;
    }
    const tag = vnode.type;
    // ★ 水合：优先认领容器内同标签的既有元素，跳过 createElement
    const claimed = ctx.hydrating
      ? claimExisting(container, NODE_TYPE_ELEMENT, tag.toLowerCase())
      : null;
    // 新建节点（SSR 里没有）要插在「下一个未认领的既有节点」之前，否则顺序会错
    const insertAnchor = ctx.hydrating && !claimed ? nextUnclaimedChild(container) : anchor;
    const el = (claimed ?? createElement(tag)) as HE;
    // 无论认领还是新建，都登记为「已占用」—— 否则当客户端比 SSR 多出节点时，
    // 后续兄弟 vnode 会把这里**新建**的节点误认成自己的（两个 vnode 共享一个 DOM 节点）
    if (ctx.hydrating) ctx.hydrateUsed.add(el as HN);
    setVNodeEl(vnode, el);

    // 应用 props
    const props = vnode.props ?? EMPTY_OBJ;
    for (const key in props) {
      if (key === 'key' || key === 'ref') continue;
      patchProp(el, key, null, props[key]);
    }
    // 水合：清掉「服务端有、客户端没有」的属性（`patchProp(null → v)` 只能加不能减）
    if (ctx.hydrating && claimed) {
      cleanupHydratedAttributes(el, props);
    }

    // 挂载 children
    if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // ⚠️ 2026-10-01 修复：这里**不能**把外层容器的 `anchor` 传下去 —— 子节点是挂进
      // **新建元素 `el`** 的，而 `anchor` 属于 `container`（另一个父节点）。传下去会让
      // `insertBefore(child, anchor)` 拿到「不属于 el 的锚点」，浏览器抛
      // `NotFoundError: The child can not be found in the parent`。
      // 触发场景：teleport 把 `targetEnd` 当 anchor 交给每个子 vnode，
      // 子 vnode 若是**带子节点的元素**（数组 children）就会把锚点带进元素内部 ⇒ 抛错；
      // 而**纯文本子节点**走 `setElementText` 不用 anchor ⇒ 正常（这解释了形态差异）。
      mountChildren(vnode, el, null, isSVG, parentComponent, parentSuspense);

      // ⚠️ 2026-11-04 修（P1）：水合时「服务端有、客户端 vnode 没有」的子节点会被留下
      //   （`claimExisting` 只认领、不删除）。实测：
      //     SSR:   `<div><span class="only-server">S</span><i>I</i></div>`
      //     客户端: `<div><i>I</i></div>`
      //     水合后 `<div><span class="only-server">S</span><i>I</i></div>` ← 脏内容留在页面上
      //   现在把「本次水合中从未被认领」的子节点删掉，让 DOM 收敛到客户端 vnode。
      const childNodes = ctx.getChildNodes;
      if (ctx.hydrating && claimed && childNodes) {
        let removed = 0;
        for (const child of childNodes(el)) {
          if (ctx.hydrateUsed.has(child)) continue;
          ctx.remove(child);
          removed++;
        }
        // 不包 `if (__DEV__)`：`warn()` 自己就带运行时判定（见 @lytjs/common-error 的 getDevMode），
        // 而本包的构建把 `__DEV__` 烘成 false ⇒ 包起来等于**把告警删掉**。
        if (removed > 0) {
          warn(`Hydration mismatch: removed ${removed} extra node(s) in <${tag}>.`);
        }
      }
    } else if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      setElementText(el, String(vnode.children ?? ''));
    }
    // 其余情况（无子节点 / 注释占位）无需处理

    // ★ 2026-10-31 新增：自定义指令 beforeMount（在插入文档**之前**，与 Vue 一致）
    invokeDirectiveHook(vnode, 'beforeMount');

    // 插入到容器中（已认领的节点本就在原位，无需再插 —— 否则会变成两份）
    if (!claimed) {
      insert(el, container, insertAnchor);
      if (ctx.hydrating) {
        // 同 `removed` 那条：不包 `if (__DEV__)`，否则产物里没有这条告警
        warn(`Hydration mismatch: <${tag}> not found in server HTML.`);
      }
    }

    // ★ 2026-10-31 新增：自定义指令 mounted（必须在 insert 之后 —— 指令常要量尺寸/取焦点）
    invokeDirectiveHook(vnode, 'mounted');

    // ============================================================
    // ★ 2026-10-29 新增：过渡 enter（`<Transition>` 写在子 vnode 上的钩子）
    // ============================================================
    //
    // 必须在 **insert 之后**：`performEnterTransition` 要先量 `getBoundingClientRect()`
    // 再切类名，元素不在文档里时量到的尺寸恒为 0，过渡不会触发。
    //
    // `shouldEnter === false` 用于「首次挂载且没有 `appear`」—— 与 Vue 一致：
    // 页面首屏不该播进入动画，但之后 `v-if` 变真时必须播。
    const transitionHooks = vnode.transition;
    if (transitionHooks && transitionHooks.shouldEnter !== false) {
      transitionHooks.beforeEnter?.(el);
      transitionHooks.enter?.(el);
    }

    // 处理 ref：在父组件实例上存储元素引用
    const refValue = vnode.ref;
    if (refValue && parentComponent) {
      setRef(el, refValue, parentComponent);
    }
  }

  // ============================================================
  // mountTextNode
  // ============================================================

  function mountTextNode(vnode: VNode, container: HN, anchor: HN | null): void {
    const text = isFunction(vnode.children) ? '' : String(vnode.children ?? '');
    // ★ 水合：认领既有的文本节点并原地改写（不新建、不插入）
    if (ctx.hydrating) {
      const claimed = claimExisting(container, NODE_TYPE_TEXT);
      if (claimed) {
        ctx.setText(claimed, text);
        setVNodeEl(vnode, claimed);
        return;
      }
    }
    const node = createText(text);
    if (ctx.hydrating) ctx.hydrateUsed.add(node);
    setVNodeEl(vnode, node);
    // 水合：新建的文本节点同样要插在「下一个未认领的既有节点」之前（否则顺序错）
    insert(node, container, ctx.hydrating ? nextUnclaimedChild(container) : anchor);
  }

  // ============================================================
  // mountCommentNode
  // ============================================================

  function mountCommentNode(vnode: VNode, container: HN, anchor: HN | null): void {
    const text = isFunction(vnode.children) ? '' : String(vnode.children ?? '');
    // ★ 水合：认领既有注释节点（注释无文本要同步，只需接管其位置）
    if (ctx.hydrating) {
      const claimed = claimExisting(container, NODE_TYPE_COMMENT);
      if (claimed) {
        setVNodeEl(vnode, claimed);
        vnode.anchor = claimed as unknown as Node | null;
        return;
      }
    }
    const node = createComment(text);
    if (ctx.hydrating) ctx.hydrateUsed.add(node);
    setVNodeEl(vnode, node);
    // FIX: P2-17 添加 null 检查，避免 node 为 null 时的不安全类型断言
    vnode.anchor = node != null ? (node as unknown as Node | null) : null;
    // 水合：注释节点同理（`v-if` 占位）
    insert(node, container, ctx.hydrating ? nextUnclaimedChild(container) : anchor);
  }

  // ============================================================
  // FIX: P2-09 属性更新策略可配置化：
  // 允许通过 ctx 配置自定义属性更新策略（如合并 class/style 而非替换）
  // diffProps - full props diff between old and new props
  // ============================================================

  function diffProps(
    el: HE,
    oldProps: Record<string, unknown>,
    newProps: Record<string, unknown>,
  ): void {
    // FIX: P1-6 VDOM-NEW-05 - 使用 Object.keys() 替代 for...in 避免遍历原型链属性
    // for...in 会遍历对象原型链上的可枚举属性，可能导致意外的属性更新
    for (const key of Object.keys(newProps)) {
      if (key === 'key' || key === 'ref') continue;
      const next = newProps[key];
      const prev = oldProps[key];
      if (hasChanged(next, prev)) {
        patchProp(el, key, prev, next);
      }
    }
    for (const key of Object.keys(oldProps)) {
      if (key === 'key' || key === 'ref') continue;
      if (!(key in newProps)) {
        patchProp(el, key, oldProps[key], null);
      }
    }
  }

  // ============================================================
  // patchElement
  // ============================================================

  function patchElement(
    n1: VNode,
    n2: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
  ): void {
    // FIX: P1-5 VDOM-NEW-04 - 添加防御性检查，避免 n1.el 非空断言在异常场景下崩溃
    // n1.el 理论上应该存在（因为 n1 之前已被挂载），但在某些异常场景（如内存损坏、
    // 并发更新）下可能为 null，添加检查以提高健壮性
    if (!n1.el) {
      if (__DEV__) {
        warn(
          `[lytjs/vdom] patchElement: n1.el is null or undefined. ` +
            `VNode type: ${String(n1.type)}, key: ${String(n1.key)}`,
        );
      }
      return;
    }
    const el = n1.el as unknown as HE;
    setVNodeEl(n2, n1.el as unknown as HN | null);

    // ★ 2026-10-31 新增：自定义指令 beforeUpdate（binding.oldValue 取自 n1）
    invokeDirectiveHook(n2, 'beforeUpdate', n1);

    // Patch props
    const oldProps = n1.props ?? EMPTY_OBJ;
    const newProps = n2.props ?? EMPTY_OBJ;

    if (n2.patchFlag & PatchFlags.FULL_PROPS) {
      // 完整 props diff
      diffProps(el, oldProps, newProps);
    } else if (n2.patchFlag > 0) {
      // PatchFlag 优化
      if (n2.patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          patchProp(el, 'class', oldProps.class, newProps.class);
        }
      }
      if (n2.patchFlag & PatchFlags.STYLE) {
        patchProp(el, 'style', oldProps.style, newProps.style);
      }
      if (n2.patchFlag & PatchFlags.PROPS) {
        // 仅 diff dynamicProps
        const dynamicProps = n2.dynamicProps;
        if (dynamicProps) {
          for (let i = 0; i < dynamicProps.length; i++) {
            const key = dynamicProps[i]!;
            const next = newProps[key];
            const prev = oldProps[key];
            if (hasChanged(next, prev)) {
              patchProp(el, key, prev, next);
            }
          }
        }
      }
      if (n2.patchFlag & PatchFlags.TEXT) {
        if (n1.children !== n2.children) {
          setElementText(el, String(n2.children ?? ''));
        }
      }
    } else if (oldProps !== newProps) {
      // 无 patchFlag，执行完整 props diff
      diffProps(el, oldProps, newProps);
    }

    // ============================================================
    // Patch children —— **始终走全量 diff**
    // ============================================================
    //
    // ## 为什么不再用 Block Tree 快速路径（2026-11-02 停用）
    //
    // 此前这里是：
    //
    //   if (oldDynamicChildren && newDynamicChildren && oldDynamicChildren.length > 0) {
    //     ctx.patchBlockChildren(n1, n2, el, ...);   // 只 diff dynamicChildren
    //   } else {
    //     ctx.patchChildren(n1, n2, el, ...);        // 全量
    //   }
    //
    // 这条「只 diff dynamicChildren、跳过静态子树」的优化**维护不住一个前提**：
    // 新一代 vnode 树里**每个子节点都必须持有有效的 `el`**，否则下一次更新会误判。
    //
    // 实测撞出两个 P0（都在 8432 个用例 + 12 项门禁下存活）：
    //
    // ① **位序错位**（2026-11-02 修复）：v-for 的每个列表项都是 block，会被收集进
    //    **外层** block 的 dynamicChildren，列表长度一变位序就变：
    //      首帧 [button] → 更新帧 [li, button]
    //    按索引配对 ⇒ 卸载 button、把 li 挂到 `container`（= 被 patch 元素的容器，
    //    不是它自己的父元素）⇒ `<li>` 跑到 `<ul>` **外面**。
    //
    // ② **静态子节点丢失 `el` ⇒ DOM 重复**（2026-11-02 本轮）：快速路径只 patch
    //    dynamicChildren，被跳过的静态子节点（如 `<ul>`）在新一代 vnode 上**从未
    //    得到 `el`**（仍为 null）。下一次更新若结构变化而走全量 diff，
    //    `patch()` 见 `n1.el === null` 就按「需要挂载」处理，且**不卸载旧节点** ⇒
    //    新挂一个、旧的留在原地：
    //      `<div><p>3</p><ul class="l"></ul><span>6</span><ul class="l"><li>a</li></ul></div>`
    //    实测触发形态极普通：`<p>{{n}}</p><ul><li v-for></ul><span>{{n*2}}</span>`
    //    先改 n 再改列表即可。
    //
    // 而且这个 `el` 缺口是**递归的**：即便把一层的 `el` 搬过去，静态子树内部的
    // 后代 vnode 依然缺 `el`，下次 patch 到那一层照样重复 DOM。要彻底修，就得
    // 「深度复制整棵静态子树的 el」——那就把优化本身抵消掉了。
    //
    // ⇒ 结论：这个优化的**收益无法验证**（仓库没有性能门禁），而缺陷已经两次
    //    击穿全部门禁。按「正确性优先」停用：始终全量 diff children。
    //    `dynamicChildren` 仍由 block 收集（其它地方可能读取），只是不再用于
    //    跳过静态子树。
    ctx.patchChildren(n1, n2, el, parentComponent, parentSuspense, isSVG);

    // ★ 2026-11-04 修（P0）：`ref` 此前**只在 `mountElement` 里设置** —— 走 patch 路径时
    //   永远不设。而 patch 路径恰恰是最常见的那条：
    //
    //   · 组件根元素在「关闭态」是占位 `<div style="display:none">`、打开后仍是 `<div>`
    //     ⇒ 同 tag ⇒ `patchElement` ⇒ **打开后的元素永远拿不到 ref**；
    //   · 给一个已存在的元素**后来才加** ref（`v-if` 切换、条件 ref）同样走这里。
    //
    //   实测（2026-11-04）：`@lytjs/ui` 的 `Dialog` 把焦点陷阱容器挂在根元素 ref 上，
    //   而根元素正是「占位 div → 对话框 div」的 patch 路径 ⇒ **ref 从未触发过**，
    //   整套焦点管理（初始焦点、焦点陷阱、关闭恢复焦点）是**死代码**。
    //   这类缺陷没有任何报错：`ref` 回调不调用，使用者只看到「ref 是 null」。
    if (n1.ref !== n2.ref) {
      if (n1.ref && parentComponent) {
        setRef(null as unknown as HN, n1.ref, parentComponent);
      }
      if (n2.ref && parentComponent) {
        setRef(el, n2.ref, parentComponent);
      }
    }

    // ★ 2026-10-31 新增：自定义指令 updated（props 与 children 都 patch 完之后）
    invokeDirectiveHook(n2, 'updated', n1);
  }

  return {
    mountElement,
    patchElement,
    mountTextNode,
    mountCommentNode,
    setRef,
  };
}
