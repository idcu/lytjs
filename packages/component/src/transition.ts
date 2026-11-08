// src/transition.ts
// Transition 组件定义
//
// 泛型化重构：TransitionComponentProps 中的回调类型从 Element 改为泛型 HE。
// 保留 TransitionComponentPropsLegacy 类型别名以确保向后兼容。

import type { ComponentOptions, SetupContext } from './types';
import type { TransitionProps, VNode } from '@lytjs/vdom';
import { Comment, isSameVNodeType } from '@lytjs/common-vnode';
import { nextTick } from '@lytjs/common-scheduler';
import { ref } from '@lytjs/reactivity';
import { performEnterTransition, performLeaveTransition } from '@lytjs/vdom';
import { warn } from '@lytjs/common-error';
import { getCurrentInstance } from './lifecycle';

// ==================== Transition Props ====================

/**
 * Transition 组件属性（泛型版本）。
 * @template HE - 宿主元素类型
 */
export interface TransitionComponentProps<HE = unknown> {
  name?: string;
  appear?: boolean;
  mode?: 'in-out' | 'out-in' | 'default';
  enterFromClass?: string;
  enterActiveClass?: string;
  enterToClass?: string;
  leaveFromClass?: string;
  leaveActiveClass?: string;
  leaveToClass?: string;
  onBeforeEnter?: (el: HE) => void;
  onEnter?: (el: HE, done: () => void) => void;
  onAfterEnter?: (el: HE) => void;
  onEnterCancelled?: (el: HE) => void;
  onBeforeLeave?: (el: HE) => void;
  onLeave?: (el: HE, done: () => void) => void;
  onAfterLeave?: (el: HE) => void;
  onLeaveCancelled?: (el: HE) => void;
}

/**
 * @deprecated 使用 TransitionComponentProps<HE> 代替。
 * 保留此类型别名以确保向后兼容。
 */
export type TransitionComponentPropsLegacy = TransitionComponentProps<Element>;

// ==================== Transition Component ====================

export const Transition: ComponentOptions = {
  name: 'Transition',

  props: {
    name: { type: String },
    appear: { type: Boolean, default: false },
    mode: { type: String, default: 'default' },
    enterFromClass: { type: String },
    enterActiveClass: { type: String },
    enterToClass: { type: String },
    leaveFromClass: { type: String },
    leaveActiveClass: { type: String },
    leaveToClass: { type: String },
    onBeforeEnter: { type: Function },
    onEnter: { type: Function },
    onAfterEnter: { type: Function },
    onEnterCancelled: { type: Function },
    onBeforeLeave: { type: Function },
    onLeave: { type: Function },
    onAfterLeave: { type: Function },
    onLeaveCancelled: { type: Function },
  },

  // ============================================================
  // ★ 2026-10-29 重写：此前这里是**纯 pass-through**
  // ============================================================
  //
  // 旧实现只有一行：`() => slots.default?.()` —— 子元素照常渲染，但
  // **一个类名、一个钩子都不会发生**。而 `vdom/transition.ts` 里 780 行
  // （enter / leave / 等待结束 / FLIP）**早已实现、也有自己的单测**，
  // 只是 patch 路径从不调用它（`performEnterTransition` 在全仓**零调用点**）。
  //
  // 现在按 Vue 的 BaseTransition 形态做：
  //   · 取插槽里的**第一个**子 vnode；
  //   · 给它挂 `vnode.transition` 钩子（patch 在挂载/卸载时调用）；
  //   · 具体类名 / 时长 / 钩子顺序交给 vdom 的 `performEnterTransition` /
  //     `performLeaveTransition`（不复制第二套过渡逻辑）。
  setup(props: Record<string, unknown>, { slots }: SetupContext) {
    const instance = getCurrentInstance();
    // S24：过渡类名前缀按 **app 实例** 隔离。
    // 此前 `performEnterTransition` 只拿到 `props`，未传 `name` 时会回落到
    // `@lytjs/vdom` 的模块级 `globalTransitionPrefix` —— 两个 app 同时挂载时，
    // 后设置的前缀会污染另一个 app 的所有过渡类名。
    // 这里优先取当前 app 的 `config.transitionPrefix`，显式 `name` 仍然最高优先级。
    const configPrefix = (instance?.appContext?.config as Record<string, unknown> | undefined)
      ?.transitionPrefix;
    const appTransitionPrefix = typeof configPrefix === 'string' ? configPrefix : undefined;
    const transitionProps =
      props.name === undefined && appTransitionPrefix !== undefined
        ? (Object.assign({}, props, { name: appTransitionPrefix }) as TransitionProps<unknown>)
        : (props as TransitionProps<unknown>);
    const mode = (props.mode as string | undefined) ?? 'default';

    // ============================================================
    // ★ 2026-10-30：`mode` 此前**声明了但完全没被读过** —— 与 Transition 曾经
    //   是 pass-through 时同一个毛病：声明了、不做事、不报错。
    //
    //   后果：`<Transition mode="out-in">` 切换时**新旧元素同时在场**（旧的在 leave、
    //   新的已 enter），布局抖一下。而 `out-in` 的全部意义就是「旧的走完再进新的」，
    //   路由切换几乎都这么写。
    // ============================================================

    /** 当前**显示中**的子 vnode（`out-in` 靠它判断「换了没有」） */
    let displayed: VNode | null = null;
    /** `out-in` 下**排队等待**显示的子 vnode */
    let waiting: VNode | null = null;
    /** 是否正在等旧元素的 leave 结束 */
    let leaving = false;
    /**
     * 还有几个元素在播 leave（多根组件 / Fragment 会有 N 个）。
     *
     * ⚠️ 2026-10-30：`vnode.transition` 现在会分发给多根组件的**每个**根元素
     * （见 `patch-component`），于是同一次切换里 `leave` 会被调 N 次。
     * 若每个完成回调都直接 `finishLeave()`，最先结束的那个就会把排队的子节点扶正
     * —— 另一个根元素还在播 ⇒ `out-in` 退化成「部分重叠」。
     * 故只在**全部**播完（计数归零）时扶正。单根时计数 1→0，行为与之前一致。
     */
    let pendingLeaves = 0;
    /** 用于在 leave 结束后**触发一次重渲染**（否则新的子节点永远不会被挂上） */
    const version = ref(0);

    // ⚠️ 2026-11-04：去掉外层 `if (__DEV__)` —— 本包的构建把 `__DEV__` 烘成 `false`，
    //   包起来等于把这条告警**从产物里删掉**（`warn()` 自己已有运行时判定：
    //   Node 按 NODE_ENV、浏览器按打包器替换后的 NODE_ENV，见 getDevMode）。
    //   「某个 mode 没实现」属于**必须不静默**的一类：用户会以为它生效了。
    if (mode === 'in-out') {
      warn(
        `<Transition mode="in-out"> 尚未实现：新元素会与旧元素**同时**过渡（等同默认行为）。` +
          `如需「旧的走完再进新的」，请用 mode="out-in"（已支持）。`,
      );
    }

    /** leave 播完后：把排队的子节点扶正并重渲染 */
    const finishLeave = () => {
      // ⚠️ 必须异步：没有 CSS 时长时 `performLeaveTransition` 会**同步**完成，
      //   而它是在 patch 的 unmount 里被调的 —— 在 patch 中途同步触发重渲染
      //   等于重入，会把 `initialSubTree` 的记账弄乱。
      nextTick(() => {
        if (!waiting) return;
        displayed = waiting;
        waiting = null;
        leaving = false;
        version.value++;
      });
    };

    const makeHooks = (shouldEnter: boolean): NonNullable<VNode['transition']> => ({
      shouldEnter,
      // ⚠️ 刻意**不**设 `beforeEnter`：`performEnterTransition` 内部第一步就是调
      //   `props.onBeforeEnter`（见 vdom/transition.ts）。这里再调一次 = 用户回调被调两遍。
      //   `beforeEnter` 这个字段留给「需要比加类更早做点什么」的自定义场景。
      enter: (el) => {
        performEnterTransition(
          el as Element,
          transitionProps as TransitionProps<Element>,
          () => {},
        );
      },
      leave: (el, done) => {
        pendingLeaves++;
        performLeaveTransition(el as Element, transitionProps as TransitionProps<Element>, () => {
          done();
          pendingLeaves--;
          if (pendingLeaves <= 0) finishLeave();
        });
      },
    });

    return (() => {
      // 建立对 `version` 的依赖：leave 结束后靠它重渲染
      void version.value;

      const children = slots.default?.() ?? [];
      const child = pickTransitionChild(children);

      // 没有子节点：渲染空（与 Vue 一致，不报错）
      if (!child) {
        displayed = null;
        return null;
      }

      // `v-if` 为假时插槽里是**注释占位**：原样透出，不挂钩子
      if (child.type === Comment) {
        displayed = null;
        return child;
      }

      // 首次渲染默认不播 enter（与 Vue 一致：只有 `appear` 才播）。
      // `instance.isMounted` 在首帧渲染时还是 false，之后都是 true。
      const isFirstRender = !instance || instance.isMounted !== true;

      // ── out-in：先让旧的走完，再挂新的 ──
      if (mode === 'out-in') {
        if (leaving) {
          // 还在等：继续渲染空，但记下**最新**的那个（连续切换时以最后一次为准）
          waiting = child;
          return null;
        }
        if (displayed && !isSameVNodeType(displayed, child)) {
          leaving = true;
          // 新一轮 leave：计数从 0 起（真正的 `leave` 调用发生在随后的 patch 里）
          pendingLeaves = 0;
          waiting = child;
          // 这一帧渲染空 ⇒ patch 会卸载 `displayed` ⇒ 它的 leave 钩子开播
          // ⇒ 播完后 `finishLeave` 把 `waiting` 扶正并重渲染
          return null;
        }
      }

      child.transition = makeHooks(!isFirstRender || transitionProps.appear === true);
      displayed = child;
      return child;
    }) as unknown as () => VNode;
  },
};

/**
 * 从插槽返回的 vnode 数组里取**参与过渡**的那个子节点。
 *
 * 规则（与 Vue 的 BaseTransition 对齐）：
 * - 跳过 `null` / 纯空白文本（`v-if` 的 else 分支常产出空文本）；
 * - 注释节点**不跳过**：它代表「当前没有子节点」，调用方要原样透出；
 * - 多于一个有效子节点 ⇒ DEV 告警（`<Transition>` 只能作用于单个元素）。
 */
function pickTransitionChild(children: unknown[]): VNode | null {
  let picked: VNode | null = null;
  let count = 0;

  for (const raw of children) {
    if (raw === null || raw === undefined) continue;

    // 纯字符串（插槽里手写的文本 / 换行缩进）：不是 vnode，挂不了钩子，直接跳过
    if (typeof raw === 'string') {
      if (raw.trim()) count++;
      continue;
    }

    count++;
    if (!picked) picked = raw as VNode;
  }

  // 同 `mode="in-out"`：不包 `if (__DEV__)`（包起来等于产物里没有这条告警）。
  // 「多余子节点被静默丢弃」是用户最容易误判的一类问题。
  if (count > 1) {
    warn(
      `<Transition> 只能作用于**单个**元素或组件，但收到了 ${count} 个子节点：` +
        `只有第一个会参与过渡，其余原样渲染且不会播动画。` +
        `多个元素请改用 <TransitionGroup>，或用 v-if / v-else 让同一时刻只有一个子节点。`,
    );
  }

  return picked;
}
