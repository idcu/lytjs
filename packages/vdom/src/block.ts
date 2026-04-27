/**
 * Lyt.js 虚拟 DOM 引擎 — Block Tree（块树）
 *
 * Block Tree 是 Vue 3 引入的一种编译时 + 运行时协作优化机制。
 * 核心思想：
 *   1. 每个组件的根 VNode 是一个 Block
 *   2. Block 收集其内部所有的动态子节点（dynamicChildren）
 *   3. 更新时只需遍历 dynamicChildren，跳过静态子节点
 *
 * 这样可以将更新复杂度从 O(整棵树) 降低到 O(动态节点数)。
 *
 * Block 使用栈（blockStack）管理嵌套关系：
 *   - openBlock()  将当前 Block 压栈
 *   - closeBlock() 将当前 Block 出栈
 *   - 在 openBlock/closeBlock 之间创建的动态 VNode 会被自动收集
 */

import type { VNode } from './vnode'
import { createVNode } from './vnode'

/* ================================================================
 *  Block 接口
 * ================================================================ */

/**
 * Block 接口
 *
 * Block 继承 VNode 的所有属性，但 dynamicChildren 是必需的（非 null）。
 * Block 本身也是一个 VNode，可以参与正常的 patch 流程。
 */
export interface Block extends VNode {
  /** 动态子节点列表 —— Block 的核心，收集所有需要更新的后代节点 */
  dynamicChildren: VNode[]
}

/* ================================================================
 *  Block 栈管理
 * ================================================================ */

/**
 * 当前活跃的 Block
 * 动态子节点会被收集到这个 Block 的 dynamicChildren 中
 */
let currentBlock: VNode[] | null = null

/**
 * Block 栈
 * 用于管理嵌套的 Block（如 v-if 内嵌套 v-for）
 * 栈顶始终是当前活跃的 Block 的 dynamicChildren
 */
const blockStack: (VNode[] | null)[] = []

/**
 * 开启一个 Block
 *
 * 将当前 dynamicChildren 数组压入栈，并创建一个新的空数组作为当前 Block。
 * 在 closeBlock() 之前创建的动态 VNode 会被收集到这个新数组中。
 */
export function openBlock(): void {
  blockStack.push(currentBlock)
  currentBlock = []
}

/**
 * 关闭当前 Block
 *
 * 将栈顶的 dynamicChildren 弹出，恢复到外层 Block。
 * 返回当前 Block 收集到的动态子节点数组。
 *
 * @returns 当前 Block 收集的动态子节点
 */
export function closeBlock(): VNode[] | null {
  const block = currentBlock
  currentBlock = blockStack.pop() ?? null
  return block
}

/**
 * 创建一个 Block VNode
 *
 * 必须在 openBlock() 和 closeBlock() 之间调用。
 * 创建的 Block 会自动关联 closeBlock() 收集到的动态子节点。
 *
 * @param type     节点类型
 * @param props    节点属性
 * @param children 子节点
 * @param patchFlag 补丁标记
 * @returns Block VNode
 */
export function createBlock(
  type: string | object,
  props: Record<string, any> | null = null,
  children: string | VNode[] | Record<string, any> | null = null,
  patchFlag: number = 0,
): Block {
  // 创建基础 VNode
  const vnode = createVNode(type, props, children)

  // 关闭 Block，获取收集到的动态子节点
  const dynamicChildren = closeBlock()

  // 将动态子节点附加到 Block 上
  if (dynamicChildren && dynamicChildren.length > 0) {
    vnode.dynamicChildren = dynamicChildren
  } else {
    vnode.dynamicChildren = []
  }

  // 设置 patchFlag
  vnode.patchFlag = patchFlag

  // 如果当前还在外层 Block 中，将此 Block 作为动态子节点收集
  if (currentBlock !== null) {
    trackDynamicChild(vnode)
  }

  return vnode as Block
}

/**
 * 将 VNode 收集到当前 Block 的 dynamicChildren 中
 *
 * 只有在 Block 栈非空时才会收集。
 * 同一个 VNode 不会被重复收集。
 *
 * @param vnode 要收集的动态 VNode
 */
export function trackDynamicChild(vnode: VNode): void {
  if (currentBlock === null) {
    return
  }

  // 避免重复收集同一个 VNode
  // 使用引用相等性判断
  if (currentBlock.length > 0 && currentBlock[currentBlock.length - 1] === vnode) {
    return
  }

  currentBlock.push(vnode)
}

/**
 * 获取当前活跃的 Block（调试/测试用）
 *
 * @returns 当前 Block 的 dynamicChildren 数组，或 null
 */
export function getCurrentBlock(): VNode[] | null {
  return currentBlock
}

/**
 * 获取 Block 栈的深度（调试/测试用）
 *
 * @returns 栈深度
 */
export function getBlockStackDepth(): number {
  return blockStack.length
}

/**
 * 判断一个 VNode 是否为 Block
 *
 * @param vnode 虚拟节点
 * @returns 是否为 Block
 */
export function isBlock(vnode: VNode): vnode is Block {
  return Array.isArray(vnode.dynamicChildren)
}

/**
 * 重置 Block 栈状态
 *
 * 在测试或异常恢复时使用，清空栈和当前 Block。
 */
export function resetBlockStack(): void {
  blockStack.length = 0
  currentBlock = null
}
