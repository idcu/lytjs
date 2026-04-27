/**
 * Lyt.js 核心入口 — 渲染函数（h）
 *
 * 提供创建虚拟节点（VNode）的渲染函数 h()。
 * 这是框架中最基础的 API，用于在渲染函数中描述 UI 结构。
 *
 * 设计说明：
 * - 直接定义最小 VNode 结构，不依赖 @lytjs/vdom 包
 * - 这样 core 包可以独立运行，不依赖其他包的实现
 * - 当与 @lytjs/vdom 一起使用时，可以桥接转换
 *
 * 纯原生零依赖实现。
 */

import { isStringOrNumber, isArray, isVNode } from '@lytjs/common';
import { Fragment } from '@lytjs/vdom';

// ============================================================
// 类型定义
// ============================================================

/** VNode 形状标记（位标记） */
export const enum ShapeFlags {
  /** 普通 HTML/SVG 元素 */
  ELEMENT = 1,
  /** 函数式组件 */
  FUNCTIONAL_COMPONENT = 2,
  /** 有状态组件 */
  STATEFUL_COMPONENT = 4,
  /** 子节点是纯文本 */
  TEXT_CHILDREN = 8,
  /** 子节点是数组 */
  ARRAY_CHILDREN = 16,
  /** 子节点是插槽 */
  SLOTS_CHILDREN = 32,
}

/** VNode 接口（最小化定义） */
export interface VNode {
  /** 节点类型：HTML 标签字符串 | 组件对象 | 函数 */
  type: string | object | symbol;
  /** 节点属性 */
  props: Record<string, any> | null;
  /** 子节点 */
  children: string | VNode[] | Record<string, any> | null;
  /** 节点唯一标识 */
  key: string | number | null;
  /** ref 回调或 ref 对象 */
  ref: ((el: any) => void) | { current: any } | null;
  /** 形状标记 */
  shapeFlag: number;
  /** 对应的真实 DOM 元素引用 */
  el: any;
  /** 关联的组件实例 */
  component: any;
}

/** h 函数的 children 参数类型 */
export type Children = string | number | VNode | Children[];

/** h 函数的 props 参数类型 */
export type Props = Record<string, any> | null;

// ============================================================
// Fragment 支持（从 @lytjs/vdom 导入，确保全局唯一 Symbol）
// ============================================================



/**
 * 标准化子节点
 *
 * 将各种形式的 children 统一转换为标准形式：
 * - 字符串/数字 → TEXT_CHILDREN
 * - 数组 → ARRAY_CHILDREN
 * - 对象（非 VNode）→ SLOTS_CHILDREN
 * - null/undefined → 不设置标记
 *
 * @param vnode - 目标 VNode
 * @param children - 原始子节点
 */
function normalizeChildren(vnode: VNode, children: any): void {
  if (children === null || children === undefined) {
    return;
  }

  if (isStringOrNumber(children)) {
    // 文本子节点
    vnode.children = String(children);
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
  } else if (isArray(children)) {
    // 数组子节点：扁平化并过滤 null/undefined
    const normalized: VNode[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child === null || child === undefined || typeof child === 'boolean') {
        continue;
      }
      if (isArray(child)) {
        // 嵌套数组，递归扁平化
        for (let j = 0; j < child.length; j++) {
          const c = child[j];
          if (c !== null && c !== undefined && typeof c !== 'boolean') {
            normalized.push(isVNode(c) ? (c as unknown as VNode) : createVNode(String(c)));
          }
        }
      } else if (isVNode(child)) {
        normalized.push(child as unknown as VNode);
      } else {
        normalized.push(createVNode(String(child)));
      }
    }
    vnode.children = normalized;
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
  } else if (typeof children === 'object') {
    // 插槽子节点
    vnode.children = children;
    vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
  }
}

// ============================================================
// VNode 创建
// ============================================================

/**
 * 创建 VNode（内部函数）
 *
 * @param type - 节点类型
 * @param props - 节点属性
 * @param children - 子节点
 * @returns VNode
 */
function createVNode(
  type: string | object | symbol,
  props: Record<string, any> | null = null,
  children: any = null
): VNode {
  // 推断形状标记
  let shapeFlag = 0;

  if (typeof type === 'string') {
    // HTML/SVG 标签 → 元素
    shapeFlag = ShapeFlags.ELEMENT;
  } else if (type === Fragment) {
    // Fragment 类型
    shapeFlag = 0;
  } else if (typeof type === 'function') {
    // 函数类型 → 函数式组件
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT;
  } else if (typeof type === 'object' && type !== null) {
    // 对象类型 → 有状态组件
    if ((type as any).setup || (type as any).__vccOpts || (type as any).render) {
      shapeFlag = ShapeFlags.STATEFUL_COMPONENT;
    }
  }

  // 提取 key 和 ref
  const key = props?.key ?? null;
  const ref = props?.ref ?? null;

  // 从 props 中移除 key 和 ref
  let cleanProps = props;
  if (props) {
    const { key: _k, ref: _r, ...rest } = props;
    cleanProps = rest;
  }

  // 创建 VNode
  const vnode: VNode = {
    type,
    props: cleanProps,
    children: null,
    key,
    ref,
    shapeFlag,
    el: null,
    component: null,
  };

  // 标准化子节点
  if (children !== null && children !== undefined) {
    normalizeChildren(vnode, children);
  }

  return vnode;
}

// ============================================================
// 公共 API：h 函数
// ============================================================

/**
 * 渲染函数 h()
 *
 * 用于在渲染函数中创建虚拟节点（VNode）。
 * 这是框架中最核心的 API 之一。
 *
 * 支持的用法：
 * 1. h('div') — 创建空 div 元素
 * 2. h('div', { class: 'app' }) — 创建带属性的 div
 * 3. h('div', null, 'Hello') — 创建带文本内容的 div
 * 4. h('div', null, [h('span', null, 'A'), h('span', null, 'B')]) — 嵌套子节点
 * 5. h(Component, { prop: 'value' }) — 创建组件 VNode
 * 6. h('div', { key: 'unique' }) — 带 key 的 VNode（用于列表渲染）
 *
 * @param type - 节点类型（HTML 标签字符串、组件对象或函数）
 * @param props - 节点属性（可选）
 * @param children - 子节点（可选，支持字符串、数组、VNode）
 * @returns VNode
 *
 * @example
 * ```ts
 * import { h } from '@lytjs/core'
 *
 * // 创建元素
 * h('div', { class: 'container', id: 'app' }, [
 *   h('h1', null, 'Hello Lyt.js'),
 *   h('p', { style: { color: 'red' } }, 'This is a paragraph'),
 *   h('button', { onClick: () => console.log('clicked') }, 'Click me'),
 * ])
 *
 * // 创建组件
 * h(MyComponent, { title: 'Props', onCustom: handleEvent }, [
 *   h('span', null, 'Slot content'),
 * ])
 *
 * // 使用 Fragment
 * h(Fragment, null, [h('li', null, 'Item 1'), h('li', null, 'Item 2')])
 * ```
 */
export function h(
  type: string | object | symbol,
  props?: Props,
  children?: Children
): VNode {
  return createVNode(type, props || null, children || null);
}
