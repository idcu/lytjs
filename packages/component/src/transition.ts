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
    const transitionProps = props as TransitionProps<unknown>;
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
    /** 用于在 leave 结束后**触发一次重渲染**（否则新的子节点永远不会被挂上） */
    const version = ref(0);

    if (__DEV__ && mode === 'in-out') {
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
        performLeaveTransition(el as Element, transitionProps as TransitionProps<Element>, () => {
          done();
          finishLeave();
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

  if (__DEV__ && count > 1) {
    warn(
      `<Transition> 只能作用于**单个**元素或组件，但收到了 ${count} 个子节点：` +
        `只有第一个会参与过渡，其余原样渲染且不会播动画。` +
        `多个元素请改用 <TransitionGroup>，或用 v-if / v-else 让同一时刻只有一个子节点。`,
    );
  }

  return picked;
}
