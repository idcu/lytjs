/**
 * Lyt.js 渲染器 — VNode 最小接口定义与辅助类型
 *
 * 本模块定义了渲染器所需的 VNode 接口、形状标记、补丁标记，
 * 以及 Fragment/Text/Comment 类型标识符和辅助判断函数。
 */

/* ================================================================
 *  VNode 最小接口定义
 * ================================================================ */

/**
 * VNode 最小接口
 *
 * 本地定义渲染器所需的 VNode 字段，不依赖 @lytjs/vdom 包。
 * 完整的 VNode 类型由 @lytjs/vdom 提供，此处仅声明渲染器使用到的字段。
 *
 * 在 monorepo 中，可以使用 import type 从 @lytjs/vdom 导入完整类型，
 * 但为了保持渲染器包的独立性，此处定义最小接口。
 */
export interface VNode {
  /** 节点类型：HTML 标签字符串 | 组件对象 | Symbol（Fragment/Text/Comment） */
  type: string | object | symbol

  /** 节点属性 */
  props: Record<string, unknown> | null

  /** 子节点：文本字符串 | VNode 数组 | 插槽对象 */
  children: string | VNode[] | Record<string, unknown> | null

  /** 节点的唯一标识，用于列表 diff */
  key: string | number | null

  /** ref 回调或 ref 对象 */
  ref: ((el: unknown) => void) | { current: unknown } | null

  /** 形状标记，描述节点类型和子节点形态 */
  shapeFlag: number

  /** PatchFlag，标记哪些 props 是动态的 */
  patchFlag: number

  /** 动态子节点列表（Block Tree 优化） */
  dynamicChildren: VNode[] | null

  /** 动态 props 的键名列表 */
  dynamicProps: string[] | null

  /** 关联的组件实例 */
  component: { update?: () => void; subTree?: VNode; [key: string]: unknown } | null

  /** 应用上下文（用于 provide/inject 等跨层级通信） */
  appContext: Record<string, unknown> | null

  /** 对应的真实 DOM 元素引用 */
  el: Element | Text | null

  /** Fragment 锚点 */
  anchor: Element | Text | null
}

/* ================================================================
 *  ShapeFlags 位标记
 * ================================================================ */

/**
 * VNode 形状标记
 *
 * 使用位标记描述 VNode 的类型和子节点形态。
 * 与 @lytjs/vdom 的 ShapeFlags 保持一致。
 */
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

/* ================================================================
 *  PatchFlags 位标记
 * ================================================================ */

/**
 * PatchFlag 位标记
 *
 * 与 @lytjs/vdom 的 PatchFlags 保持一致。
 */
export const enum PatchFlags {
  /** 动态文本 */
  TEXT = 1,
  /** 动态 class */
  CLASS = 2,
  /** 动态 style */
  STYLE = 4,
  /** 动态 props */
  PROPS = 8,
  /** 动态 props，键名可能变化 */
  FULL_PROPS = 16,
  /** 稳定的 Fragment */
  STABLE_FRAGMENT = 32,
  /** 带 key 的 Fragment */
  KEYED_FRAGMENT = 64,
  /** 不带 key 的 Fragment */
  UNKEYED_FRAGMENT = 128,
  /** 需要 patch */
  NEED_PATCH = 256,
  /** 动态插槽 */
  DYNAMIC_SLOTS = 512,
  /** 静态提升 */
  HOISTED = -1,
  /** 退出优化 */
  BAIL = -2,
}

/* ================================================================
 *  Fragment 类型标识
 * ================================================================ */

/**
 * Fragment 类型标识符
 *
 * Fragment 用于表示一组没有父容器的子节点。
 * 本地定义以避免依赖 @lytjs/vdom 包。
 */
export const Fragment = Symbol('Fragment')

/**
 * Text 类型标识符
 */
export const Text = Symbol('Text')

/**
 * Comment 类型标识符
 */
export const Comment = Symbol('Comment')

/* ================================================================
 *  辅助判断函数
 * ================================================================ */

/**
 * 判断 VNode 是否为 Fragment 类型
 *
 * @param vnode - 待检测的虚拟节点
 * @returns 如果节点类型为 Fragment 则返回 true
 *
 * @example
 * ```ts
 * import { isFragment, Fragment, h } from '@lytjs/renderer'
 *
 * const vnode = h(Fragment, null, [h('div', null, 'A'), h('div', null, 'B')])
 * console.log(isFragment(vnode)) // true
 * ```
 */
export function isFragment(vnode: VNode): boolean {
  return vnode.type === Fragment
}

/**
 * 判断 VNode 是否为文本类型
 *
 * @param vnode - 待检测的虚拟节点
 * @returns 如果节点类型为 Text 则返回 true
 *
 * @example
 * ```ts
 * import { isTextVNode, Text, h } from '@lytjs/renderer'
 *
 * const vnode = h(Text, null, 'hello')
 * console.log(isTextVNode(vnode)) // true
 * ```
 */
export function isTextVNode(vnode: VNode): boolean {
  return vnode.type === Text
}

/**
 * 判断 VNode 是否为注释类型
 *
 * @param vnode - 待检测的虚拟节点
 * @returns 如果节点类型为 Comment 则返回 true
 *
 * @example
 * ```ts
 * import { isCommentVNode, Comment, h } from '@lytjs/renderer'
 *
 * const vnode = h(Comment, null, 'conditional comment')
 * console.log(isCommentVNode(vnode)) // true
 * ```
 */
export function isCommentVNode(vnode: VNode): boolean {
  return vnode.type === Comment
}

/**
 * 判断两个 VNode 是否为相同类型
 *
 * 相同类型的定义：type 相同且 key 相同。
 * 在 diff 算法中，只有相同类型的 VNode 才会进行 patch 复用。
 *
 * @param n1 - 第一个虚拟节点
 * @param n2 - 第二个虚拟节点
 * @returns 如果两个节点的 type 和 key 均相同则返回 true
 *
 * @example
 * ```ts
 * import { isSameVNodeType, h } from '@lytjs/renderer'
 *
 * const a = h('div', { key: 'x' }, 'hello')
 * const b = h('div', { key: 'x' }, 'world')
 * const c = h('span', { key: 'x' }, 'hello')
 *
 * console.log(isSameVNodeType(a, b)) // true（type 和 key 相同）
 * console.log(isSameVNodeType(a, c)) // false（type 不同）
 * ```
 */
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}

/**
 * 判断 VNode 是否为 Block
 *
 * Block 的 dynamicChildren 是非 null 的数组。
 * Block Tree 优化允许跳过静态子树的 diff，仅更新 dynamicChildren 列表中的节点。
 *
 * @param vnode - 待检测的虚拟节点
 * @returns 如果节点是 Block 则返回 true
 *
 * @example
 * ```ts
 * import { isBlock, h, openBlock } from '@lytjs/renderer'
 *
 * // Block 节点在编译时通过 openBlock() 创建
 * const vnode = openBlock(() => h('div', null, h('span', null, 'dynamic')))
 * console.log(isBlock(vnode)) // true
 * ```
 */
export function isBlock(vnode: VNode): boolean {
  return Array.isArray(vnode.dynamicChildren)
}
