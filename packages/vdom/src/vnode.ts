/**
 * Lyt.js 虚拟 DOM 引擎 — VNode 虚拟节点系统
 *
 * VNode（Virtual Node）是虚拟 DOM 的核心数据结构，
 * 用于描述真实 DOM 树的结构。通过对比新旧 VNode 树，
 * 计算出最小更新操作，再应用到真实 DOM 上。
 *
 * 本模块提供 VNode 的类型定义、创建函数、克隆函数及辅助工具。
 */

import { Fragment, isFragmentType } from './fragment'
import type { PatchFlags } from './patch-flag'

/* ================================================================
 *  ShapeFlags — VNode 形状标记
 * ================================================================
 * 使用位标记（bitmask）描述 VNode 的类型和子节点形态，
 * 在 patch 阶段用于快速分发到不同的处理逻辑。
 *
 * 高 4 位描述节点类型，低 4 位描述子节点形态。
 * 两者可以组合使用，例如一个有数组子节点的元素：
 *   ELEMENT | ARRAY_CHILDREN = 1 | 16 = 17
 */

export const enum ShapeFlags {
  /** 普通 HTML/SVG 元素 */
  ELEMENT = 1,

  /** 函数式组件（无状态，纯函数） */
  FUNCTIONAL_COMPONENT = 2,

  /** 有状态组件（有响应式数据、生命周期） */
  STATEFUL_COMPONENT = 4,

  /** 子节点是纯文本 */
  TEXT_CHILDREN = 8,

  /** 子节点是数组（多个 VNode） */
  ARRAY_CHILDREN = 16,

  /** 子节点是插槽 */
  SLOTS_CHILDREN = 32,
}

/* ================================================================
 *  VNode 接口定义
 * ================================================================ */

/**
 * 组件实例接口（简化版）
 * 完整的组件实例由运行时提供，此处仅声明引用类型
 */
export interface ComponentInstance {
  /** 组件更新函数 */
  update?: () => void
  /** 组件的 subTree（渲染结果 VNode） */
  subTree?: VNode
  [key: string]: unknown
}

/**
 * 应用上下文接口（简化版）
 * 用于跨组件提供全局配置
 */
export interface AppContext {
  config?: Record<string, unknown>
  provides?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Ref 回调类型
 * 当 VNode 挂载或卸载时触发
 */
export type RefFn = (el: unknown) => void

/**
 * VNode — 虚拟节点核心接口
 *
 * 描述虚拟 DOM 树中的一个节点，可以是元素、组件、文本或 Fragment。
 */
export interface VNode {
  /** 节点类型：HTML 标签字符串 | 组件对象 | Fragment Symbol | Text 等 */
  type: string | object | symbol | Function

  /** 节点属性：class, style, 事件, DOM 属性等 */
  props: Record<string, unknown> | null

  /** 子节点：文本字符串 | VNode 数组 | 插槽对象 */
  children: string | VNode[] | Record<string, unknown> | null

  /** 节点的唯一标识，用于列表 diff 时的精确匹配 */
  key: string | number | null

  /** ref 回调或 ref 对象，用于获取 DOM 元素或组件实例的引用 */
  ref: RefFn | { current: unknown } | null

  /** 形状标记，描述节点类型和子节点形态的位标记组合 */
  shapeFlag: number

  /** PatchFlag，标记哪些 props 是动态的，用于精确更新 */
  patchFlag: number

  /** 动态子节点列表（Block Tree 优化） */
  dynamicChildren: VNode[] | null

  /** 动态 props 的键名列表（配合 FULL_PROPS 使用） */
  dynamicProps: string[] | null

  /** 关联的组件实例（仅组件 VNode 有值） */
  component: ComponentInstance | null

  /** 应用上下文（用于 provide/inject 等跨层级通信） */
  appContext: AppContext | null

  /** 对应的真实 DOM 元素引用 */
  el: any

  /** 内部标记：当前节点是否为静态提升节点 */
  __isHoisted?: boolean

  /** 内部标记：当前节点的锚点（Fragment 移动时使用） */
  anchor: any
}

/* ================================================================
 *  VNode 创建函数
 * ================================================================ */

/**
 * 创建一个 VNode
 *
 * 根据传入的 type、props、children 自动推断 shapeFlag：
 * - string 类型 → ELEMENT
 * - 带 setup/render 的对象 → STATEFUL_COMPONENT
 * - 带 render 的函数 → FUNCTIONAL_COMPONENT
 *
 * @param type     节点类型
 * @param props    节点属性（可选）
 * @param children 子节点（可选）
 * @returns 创建的 VNode
 */
export function createVNode(
  type: string | object | symbol | Function,
  props: Record<string, unknown> | null = null,
  children: string | VNode[] | Record<string, unknown> | null = null,
): VNode {
  // 基础形状标记：根据 type 推断节点类型
  let shapeFlag = 0

  if (typeof type === 'string') {
    // HTML/SVG 标签 → 元素
    shapeFlag = ShapeFlags.ELEMENT
  } else if (isFragmentType(type)) {
    // Fragment 类型
    shapeFlag = 0
  } else if (typeof type === 'object' && type !== null) {
    // 对象类型 → 组件
    // 判断是有状态组件还是函数式组件
    if ((type as Record<string, unknown>).setup || (type as Record<string, unknown>).__vccOpts) {
      shapeFlag = ShapeFlags.STATEFUL_COMPONENT
    } else if ((type as Record<string, unknown>).render) {
      shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT
    }
  } else if (typeof type === 'function') {
    // 函数类型 → 函数式组件
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT
  }

  // 标准化子节点并推断子节点形态标记
  if (children !== null && children !== undefined) {
    const tempVNode = { shapeFlag } as VNode
    normalizeChildren(tempVNode, children)
    shapeFlag = tempVNode.shapeFlag
  }

  // 提取 key 和 ref
  const key = (props?.key as string | number | null) ?? null
  const ref = (props?.ref as RefFn | { current: unknown } | null) ?? null

  // 从 props 中移除 key 和 ref（它们不属于 DOM 属性）
  if (props) {
    const { key: _k, ref: _r, ...rest } = props
    props = rest
  }

  const vnode: VNode = {
    type,
    props,
    children,
    key,
    ref,
    shapeFlag,
    patchFlag: 0,
    dynamicChildren: null,
    dynamicProps: null,
    component: null,
    appContext: null,
    el: null,
    anchor: null,
  }

  return vnode
}

/**
 * 创建文本 VNode
 *
 * @param text 文本内容
 * @returns 文本类型的 VNode
 */
export function createTextVNode(text: string = ''): VNode {
  return createVNode(
    Symbol.for('Text'),
    null,
    text,
  )
}

/**
 * 创建注释 VNode
 *
 * @param text 注释内容
 * @returns 注释类型的 VNode
 */
export function createCommentVNode(text: string = ''): VNode {
  return createVNode(
    Symbol.for('Comment'),
    null,
    text,
  )
}

/**
 * 克隆一个 VNode
 *
 * 用于 v-for 等场景中复用编译产出的 VNode 模板。
 * 克隆时会合并额外的 props，并保留原始 VNode 的 shapeFlag。
 *
 * @param vnode      要克隆的 VNode
 * @param extraProps 额外的属性（会合并到原始 props 上）
 * @returns 克隆后的新 VNode
 */
export function cloneVNode(
  vnode: VNode,
  extraProps: Record<string, unknown> | null = null,
): VNode {
  // 合并 props
  const mergedProps = extraProps
    ? { ...vnode.props, ...extraProps }
    : vnode.props

  // 如果 extraProps 中有 key，使用新的 key
  const key = (extraProps?.key as string | number | null) ?? vnode.key
  const ref = (extraProps?.ref as RefFn | { current: unknown } | null) ?? vnode.ref

  // 从 mergedProps 中移除 key 和 ref
  const { key: _k, ref: _r, ...cleanProps } = (mergedProps as Record<string, unknown>)

  return {
    type: vnode.type,
    props: cleanProps,
    children: vnode.children,
    key,
    ref,
    shapeFlag: vnode.shapeFlag,
    patchFlag: vnode.patchFlag,
    dynamicChildren: vnode.dynamicChildren,
    dynamicProps: vnode.dynamicProps,
    component: vnode.component,
    appContext: vnode.appContext,
    el: vnode.el,
    anchor: vnode.anchor,
    __isHoisted: vnode.__isHoisted,
  }
}

/* ================================================================
 *  VNode 辅助函数
 * ================================================================ */

/**
 * 判断两个 VNode 是否为相同类型
 *
 * 相同类型的定义：type 相同且 key 相同。
 * 这是 diff 算法决定是否复用 DOM 节点的核心判断。
 *
 * @param n1 旧 VNode
 * @param n2 新 VNode
 * @returns 是否为相同类型
 */
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}

/**
 * 标准化子节点
 *
 * 将各种形式的 children 统一转换为标准形式，
 * 并在 vnode 上设置正确的子节点形态标记。
 *
 * 规则：
 * - 字符串/数字 → TEXT_CHILDREN
 * - 数组 → ARRAY_CHILDREN
 * - 对象（且非 VNode）→ SLOTS_CHILDREN
 * - null/undefined → 不设置标记
 *
 * @param vnode    目标 VNode（会被修改 shapeFlag）
 * @param children 原始子节点
 */
export function normalizeChildren(
  vnode: VNode,
  children: string | VNode[] | Record<string, unknown> | null,
): void {
  if (children === null || children === undefined) {
    return
  }

  if (typeof children === 'string' || typeof children === 'number') {
    // 文本子节点
    vnode.children = String(children)
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    // 数组子节点
    vnode.children = children
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    // 插槽子节点（非数组、非字符串的对象）
    vnode.children = children
    vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
  }
}

/**
 * 判断 VNode 是否为文本类型
 */
export function isTextVNode(vnode: VNode): boolean {
  return vnode.type === (Symbol.for('Text') || Symbol('Text'))
}

/**
 * 判断 VNode 是否为注释类型
 */
export function isCommentVNode(vnode: VNode): boolean {
  return vnode.type === (Symbol.for('Comment') || Symbol('Comment'))
}

// 导出 Fragment 供外部使用
export { Fragment } from './fragment'
