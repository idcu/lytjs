/**
 * @lytjs/vdom - block
 * Block Tree 运行时支持
 *
 * Block Tree 是编译时+运行时协同优化机制：
 * - 编译器通过 openBlock/createBlock/closeBlock 三件套建立 Block 结构
 * - 运行时 patch 时优先遍历 dynamicChildren，跳过静态子树 diff
 */

import type { VNode, VNodeTypes, VNodeChildren } from '@lytjs/common-vnode';
import { createVNode } from './vnode';

// ============================================================
// Block 接口
// ============================================================

/**
 * Block VNode - 继承 VNode，保证 dynamicChildren 非空
 */
export interface Block extends VNode {
  dynamicChildren: VNode[];
}

// ============================================================
// Block 栈状态
// ============================================================

/** 当前活跃 Block 的 dynamicChildren 数组 */
let currentBlock: VNode[] | null = null;

/** Block 栈，支持嵌套 Block */
const blockStack: (VNode[] | null)[] = [];

// ============================================================
// openBlock
// ============================================================

/**
 * 开启一个新的 Block 作用域。
 * 将当前 dynamicChildren 压栈，创建新的空数组用于收集动态子节点。
 */
export function openBlock(): void {
  blockStack.push(currentBlock);
  currentBlock = [];
}

// ============================================================
// closeBlock
// ============================================================

/**
 * 关闭当前 Block 作用域。
 * 出栈恢复外层 Block，返回当前 Block 收集到的动态子节点。
 */
export function closeBlock(): VNode[] | null {
  const block = currentBlock;
  currentBlock = blockStack.pop() ?? null;
  return block;
}

// ============================================================
// createBlock
// ============================================================

/**
 * 创建 Block VNode 并关联动态子节点。
 *
 * 1. 调用 createVNode 创建基础 VNode
 * 2. 调用 closeBlock() 获取收集到的动态子节点
 * 3. 将 dynamicChildren 绑定到 VNode
 * 4. 若处于外层 Block 作用域，将自身注册为动态子节点
 */
export function createBlock(
  type: VNodeTypes,
  props: Record<string, unknown> | null = null,
  children: VNodeChildren = null,
  patchFlag: number = 0,
): Block {
  const vnode = createVNode(type, props, children, patchFlag, null, true);
  const dynamicChildren = closeBlock();

  if (dynamicChildren && dynamicChildren.length > 0) {
    vnode.dynamicChildren = dynamicChildren;
  } else {
    vnode.dynamicChildren = [];
  }

  vnode.patchFlag = patchFlag;

  // 若处于外层 Block 作用域，将自身注册为动态子节点
  if (currentBlock !== null) {
    trackDynamicChild(vnode);
  }

  return vnode as Block;
}

// ============================================================
// trackDynamicChild
// ============================================================

/**
 * 将 VNode 收集到当前 Block 的 dynamicChildren 中。
 * 通过引用相等性判断避免重复收集（检查 currentBlock 末尾元素 === vnode）。
 */
export function trackDynamicChild(vnode: VNode): void {
  if (currentBlock !== null) {
    // 去重：避免同一 VNode 被重复收集
    if (currentBlock[currentBlock.length - 1] !== vnode) {
      currentBlock.push(vnode);
    }
  }
}

// ============================================================
// isBlock
// ============================================================

/**
 * 类型守卫：判断 VNode 是否为 Block（dynamicChildren 非空）
 */
export function isBlock(vnode: VNode): vnode is Block {
  return vnode.dynamicChildren !== null && Array.isArray(vnode.dynamicChildren);
}

// ============================================================
// 调试/测试 API
// ============================================================

/**
 * 获取当前 Block 的 dynamicChildren 数组
 */
export function getCurrentBlock(): VNode[] | null {
  return currentBlock;
}

/**
 * 获取当前 Block 栈深度
 */
export function getBlockStackDepth(): number {
  return blockStack.length;
}

/**
 * 重置 Block 栈（仅用于测试）
 */
export function resetBlockStack(): void {
  currentBlock = null;
  blockStack.length = 0;
}
