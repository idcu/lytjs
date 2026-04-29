// src/h.ts
// @lytjs/core - VNode 创建辅助函数

import { createVNode, Fragment, Text, Comment, EMPTY_OBJ } from '@lytjs/vdom';
import type { VNode, VNodeChildren, Component } from './types';

/**
 * 创建 VNode
 */
export function h(
  type: string | Component | typeof Fragment | typeof Text | typeof Comment,
  props?: Record<string, any> | null,
  children?: VNodeChildren
): VNode {
  if (props == null) {
    props = EMPTY_OBJ;
  }

  // 处理数组子节点作为剩余参数的情况
  if (arguments.length > 3) {
    children = Array.prototype.slice.call(arguments, 2);
  }

  return createVNode(type as any, props, children);
}

/**
 * createElement 是 h 的别名
 */
export { h as createElement };
