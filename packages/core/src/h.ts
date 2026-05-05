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

  // 合并剩余子节点
  const flatChildren = children.length > 1 ? children : children[0];

  return createVNode(type as VNodeTypes, props, flatChildren as unknown as VNodeChildren);
}

/**
 * createElement 是 h 的别名
 */
export { h as createElement };
