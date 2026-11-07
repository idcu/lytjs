// src/h.ts
// @lytjs/core-vnode - VNode 创建辅助函数（唯一权威实现）
//
// 2026-11-07（S07 / ADR 0016）：`@lytjs/core` 只转发本文件的实现，不得保留副本。

import {
  createVNode,
  type Fragment,
  type Text,
  type Comment,
  type VNodeTypes,
  EMPTY_OBJ,
} from '@lytjs/vdom';
import type { VNode, VNodeChildren, Component } from './types';

// ============================================================
// h() function overloads for type-safe VNode creation
// ============================================================

// Overload 1: h(type) - no props, no children
export function h(type: string): VNode;
export function h(type: Component): VNode;
export function h(type: typeof Fragment): VNode;
export function h(type: typeof Text): VNode;
export function h(type: typeof Comment): VNode;

// Overload 2: h(type, props) - with props, no children
export function h<P = Record<string, unknown>>(type: string, props: P | null): VNode;
export function h<P = Record<string, unknown>>(type: Component, props: P | null): VNode;
export function h(type: typeof Fragment, props: Record<string, unknown> | null): VNode;
export function h(type: typeof Text, props: Record<string, unknown> | null): VNode;
export function h(type: typeof Comment, props: Record<string, unknown> | null): VNode;

// Overload 3: h(type, props, ...children) - with props and children
export function h<P = Record<string, unknown>>(
  type: string,
  props: P | null,
  ...children: VNodeChildren[]
): VNode;
export function h<P = Record<string, unknown>>(
  type: Component,
  props: P | null,
  ...children: VNodeChildren[]
): VNode;
export function h(
  type: typeof Fragment,
  props: Record<string, unknown> | null,
  ...children: VNodeChildren[]
): VNode;
export function h(
  type: typeof Text,
  props: Record<string, unknown> | null,
  ...children: VNodeChildren[]
): VNode;
export function h(
  type: typeof Comment,
  props: Record<string, unknown> | null,
  ...children: VNodeChildren[]
): VNode;

// 实现
export function h(
  type: string | Component | typeof Fragment | typeof Text | typeof Comment,
  propsOrChildren?: Record<string, unknown> | VNodeChildren | null,
  ...children: VNodeChildren[]
): VNode {
  // 支持 `h(type, children)` 重载：第二参是数组 / 字符串 / 数字 / VNode 时视为 children，
  // 否则才当 props。与 Vue 一致。
  const isVNodeLike =
    typeof propsOrChildren === 'object' &&
    propsOrChildren !== null &&
    (propsOrChildren as { __v_isVNode?: boolean }).__v_isVNode === true;

  const secondArgIsChildren =
    children.length === 0 &&
    propsOrChildren != null &&
    (Array.isArray(propsOrChildren) ||
      typeof propsOrChildren === 'string' ||
      typeof propsOrChildren === 'number' ||
      isVNodeLike);

  let props: Record<string, unknown> | null | undefined;
  let childArgs: VNodeChildren[];

  if (secondArgIsChildren) {
    props = EMPTY_OBJ;
    childArgs = [propsOrChildren as VNodeChildren];
  } else {
    props = propsOrChildren as Record<string, unknown> | null | undefined;
    childArgs = children;
  }

  if (props == null) {
    props = EMPTY_OBJ;
  }

  // children 合并逻辑：递归展平嵌套数组，避免丢失嵌套子节点。
  const flatChildren =
    childArgs.length > 1
      ? childArgs.flat(Infinity)
      : Array.isArray(childArgs[0])
        ? childArgs[0].flat(Infinity)
        : childArgs[0];

  return createVNode(type as VNodeTypes, props, flatChildren as unknown as VNodeChildren);
}

/**
 * createElement 是 h 的别名
 */
export { h as createElement };
