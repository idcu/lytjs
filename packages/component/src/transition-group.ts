// src/transition-group.ts
// TransitionGroup 组件定义
//
// 泛型化重构：TransitionGroupComponentProps 中的回调类型从 Element 改为泛型 HE。
// 保留 TransitionGroupComponentPropsLegacy 类型别名以确保向后兼容。

import type { ComponentOptions, SetupContext } from './types';
import { createVNode } from '@lytjs/vdom';
import type { FLIPState, TransitionProps, VNode } from '@lytjs/vdom';
import { createFLIPState, beforeUpdate, afterUpdate } from '@lytjs/vdom';
import { performEnterTransition, performLeaveTransition } from '@lytjs/vdom';
import { onUpdated } from './lifecycle';

// ==================== TransitionGroup Props ====================

/**
 * TransitionGroup 组件属性（泛型版本）。
 * @template HE - 宿主元素类型
 */
export interface TransitionGroupComponentProps<HE = unknown> {
  name?: string;
  appear?: boolean;
  tag?: string | false;
  moveClass?: string;
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
 * @deprecated 使用 TransitionGroupComponentProps<HE> 代替。
 * 保留此类型别名以确保向后兼容。
 */
export type TransitionGroupComponentPropsLegacy = TransitionGroupComponentProps<Element>;

// ==================== TransitionGroup Component ====================

export const TransitionGroup: ComponentOptions = {
  name: 'TransitionGroup',

  props: {
    name: { type: String },
    appear: { type: Boolean, default: false },
    tag: { type: [String, Boolean] as unknown as new () => string | boolean },
    moveClass: { type: String },
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

  setup(props: Record<string, unknown>, { slots }: SetupContext) {
    const transitionProps = props as unknown as TransitionProps<Element>;

    /** 上一帧的子 vnode（FLIP 需要它来量「改之前」的位置） */
    let prevChildren: VNode[] = [];
    let flipState: FLIPState | null = null;
    let isFirstRender = true;

    /**
     * 取子 vnode 的宿主元素。
     *
     * ⚠️ 顺带给有 `key` 的元素写 `data-key`：vdom 的 FLIP 实现按
     * `data-key` 属性匹配前后两次位置（`getChildKeyDOM`），没有它就只能按
     * **下标**匹配 —— 列表重排时会把「换了位置的 A」当成「位置没变的 B」，
     * 于是 FLIP 算出错误的位移。`key` 本来就是身份契约，写进 DOM 是它的自然延伸。
     */
    const collectElements = (nodes: VNode[]): Element[] => {
      const out: Element[] = [];
      for (const node of nodes) {
        const el = (node as { el?: unknown }).el;
        if (!el || typeof (el as Element).getBoundingClientRect !== 'function') continue;
        const key = (node as { key?: unknown }).key;
        if (key !== undefined && key !== null) {
          (el as Element).setAttribute('data-key', String(key));
        }
        out.push(el as Element);
      }
      return out;
    };

    // FLIP 的后半段：patch 完成后量新位置并对移动过的元素施加位移
    onUpdated(() => {
      if (!flipState) return;
      const name = (props.name as string | undefined) ?? 'v';
      const moveClass = (props.moveClass as string | undefined) ?? `${name}-move`;
      afterUpdate(flipState, collectElements(prevChildren), moveClass);
      flipState = null;
    });

    return (() => {
      const rawChildren = (slots.default?.() ?? []) as unknown[];
      // ⚠️ 保持「未传 tag 时原样返回**同一个**数组」的既有契约（有单测按 `toBe` 钉着）：
      //   只有真的存在 null / 字符串等非 vnode 项时才新建数组。
      const children = rawChildren.some((c) => c === null || typeof c !== 'object')
        ? (rawChildren.filter((c) => c !== null && typeof c === 'object') as VNode[])
        : (rawChildren as VNode[]);

      // FLIP 的前半段：**渲染发生在 patch 之前** ⇒ 此刻 DOM 还是旧的，
      // 正好是「改之前」的快照点。（不依赖 `onBeforeUpdate`：那个钩子在
      // vdom 的更新路径里没有被调用，只有 `onUpdated` 有。）
      if (!isFirstRender && prevChildren.length > 0) {
        flipState = createFLIPState();
        beforeUpdate(flipState, collectElements(prevChildren));
      }

      // 每个子节点挂 enter / leave 钩子。
      //
      // 只有**新挂载**的子节点会走 `mountElement` ⇒ 只有它们会播 enter；
      // 已有子节点被 patch 时不会重播（这是 patch 的天然语义，不需要额外判断）。
      // 首次渲染默认不播（`appear` 才播），与 Vue 一致。
      const shouldEnter = !isFirstRender || props.appear === true;
      for (const child of children) {
        // 不按 `shapeFlag` 过滤：钩子只由 patch 在「元素挂载 / 卸载」时调用，
        // 挂在组件子节点上是无害的 no-op（组件子节点不播过渡，见报告 §28.5）。
        // 过滤反而会让「手写 vnode / 测试夹具」这类没有 shapeFlag 的对象被漏掉。
        child.transition = {
          shouldEnter,
          enter: (el) => {
            performEnterTransition(el as Element, transitionProps, () => {});
          },
          leave: (el, done) => {
            performLeaveTransition(el as Element, transitionProps, done);
          },
        };
      }

      prevChildren = children;
      isFirstRender = false;

      const tag = props.tag;
      if (typeof tag === 'string' && tag !== '') {
        return createVNode(tag, null, children) as unknown as VNode;
      }

      // `tag: false` 与未传同义：不包裹，直接返回子节点
      return children as unknown as VNode;
    }) as unknown as () => VNode;
  },
};
