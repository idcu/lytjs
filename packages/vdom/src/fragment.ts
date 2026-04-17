/**
 * Lyt.js 虚拟 DOM 引擎 — Fragment 多根节点支持
 *
 * Fragment（片段）用于表示一组没有父容器的子节点，
 * 是 Vue 3 等现代框架实现多根节点组件的核心机制。
 *
 * Fragment 本身不对应真实 DOM 节点，在挂载时其子节点
 * 直接插入容器；在卸载时其子节点直接从容器移除。
 */

import type { VNode } from './vnode'

/**
 * Fragment 类型标识符
 * 使用 Symbol 确保唯一性，避免与任何字符串标签冲突
 */
export const Fragment = Symbol('Fragment')

/**
 * Fragment VNode 的类型（即 Fragment Symbol 本身）
 */
export type FragmentType = typeof Fragment

/**
 * 判断一个 VNode 是否为 Fragment 类型
 * @param vnode 虚拟节点
 * @returns 是否为 Fragment
 */
export function isFragment(vnode: VNode): boolean {
  return vnode.type === Fragment
}

/**
 * 判断一个值是否为 Fragment 类型标识符
 * @param type VNode 的 type 字段
 * @returns 是否为 Fragment 类型
 */
export function isFragmentType(type: unknown): type is FragmentType {
  return type === Fragment
}
