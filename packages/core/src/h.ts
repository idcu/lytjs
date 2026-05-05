// src/h.ts
// @lytjs/core - VNode 创建辅助函数

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
// FIX: v7-P1-12 h() children 合并逻辑：确保嵌套数组被正确展平
export function h(type: string): VNode;
export function h(type: Component): VNode;
export function h(type: typeof Fragment): VNode;
export function h(type: typeof Text): VNode;
export function h(type: typeof Comment): VNode;

// Overload 2: h(type, props) - with props, no children
export function h<P = Record<string, unknown>>(
  type: string,
  props: P | null,
): VNode;
export function h<P = Record<string, unknown>>(
  type: Component,
  props: P | null,
): VNode;
export function h(
  type: typeof Fragment,
  props: Record<string, unknown> | null,
): VNode;
export function h(
  type: typeof Text,
  props: Record<string, unknown> | null,
): VNode;
export function h(
  type: typeof Comment,
  props: Record<string, unknown> | null,
): VNode;

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

// Implementation
export function h(
  type: string | Component | typeof Fragment | typeof Text | typeof Comment,
  props?: Record<string, unknown> | null,
  ...children: VNodeChildren[]
): VNode {
  if (props == null) {
    props = EMPTY_OBJ;
  }

  // FIX: v7-P1-12 h() children 合并逻辑：递归展平嵌套数组，避免丢失嵌套子节点
  // 注意：children.flat(Infinity) 会递归展平所有嵌套数组。
  // 这意味着如果 children 中包含非 VNode 的数组（如 props 数组），
  // 这些数组也会被展平。调用方应确保 children 中只包含 VNode 或原始值。
  const flatChildren = children.length > 1
    ? children.flat(Infinity)
    : Array.isArray(children[0])
      ? children[0].flat(Infinity)
      : children[0];

  return createVNode(type as VNodeTypes, props, flatChildren as unknown as VNodeChildren);
}

/**
 * createElement 是 h 的别名
 */
export { h as createElement };
