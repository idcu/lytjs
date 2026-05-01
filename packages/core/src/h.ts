// src/h.ts
// @lytjs/core - VNode 创建辅助函数

import {
  createVNode,
  type Fragment,
  type Text,
  type Comment,
  type VNodeTypes,
  EMPTY_OBJ,
} from "@lytjs/vdom";
import type { VNode, VNodeChildren, Component } from "./types";

/**
 * 创建 VNode
 */
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

  return createVNode(
    type as VNodeTypes,
    props,
    flatChildren as unknown as VNodeChildren,
  );
}

/**
 * createElement 是 h 的别名
 */
export { h as createElement };
