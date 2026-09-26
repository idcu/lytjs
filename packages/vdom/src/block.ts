/**
 * @lytjs/vdom - block
 * Block Tree 运行时支持
 *
 * Block Tree 是编译时+运行时协同优化机制：
 * - 编译器通过 openBlock/createBlock/closeBlock 三件套建立 Block 结构
 * - 运行时 patch 时优先遍历 dynamicChildren，跳过静态子树 diff
 */

import type { VNode, VNodeTypes, VNodeChildren } from '@lytjs/common-vnode';
import { isArray } from '@lytjs/common-is';
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

/**
 * Block 追踪开关计数（由 `setBlockTracking` 增减）。
 *
 * `< 0` 表示追踪被关闭：此时 `openBlock()` 不开启新的收集数组
 * （`currentBlock` 置 null），`trackDynamicChild` 自然成为空操作。
 * 用于 slot 等「渲染边界切换」场景 —— 见 `withCtx`。
 */
let blockTrackingDelta = 0;

// ============================================================
// setBlockTracking
// ============================================================

/**
 * 开关 Block 追踪。
 *
 * 编译器产物的 import 契约里有 `setBlockTracking`（helperNameMap），
 * 此前运行期**没有实现** —— 产物一旦真正调用它就会 `ReferenceError`。
 * 这里给出真实语义：
 *   - `value < 0`（如 `-1`）：关闭追踪，`openBlock()` 不再收集动态子节点；
 *   - `value > 0`：恢复追踪；
 *   - 计数式，支持嵌套（与 `withCtx` 的 try/finally 配对）。
 */
export function setBlockTracking(value: number): void {
  blockTrackingDelta += value;
}

/** 当前是否处于「追踪开启」状态（调试/测试用） */
export function isBlockTrackingEnabled(): boolean {
  return blockTrackingDelta >= 0;
}

// ============================================================
// openBlock
// ============================================================

/**
 * 开启一个新的 Block 作用域。
 * 将当前 dynamicChildren 压栈，创建新的空数组用于收集动态子节点。
 *
 * @param disableTracking 显式关闭本次收集（`setBlockTracking(-1)` 的等价写法）
 */
export function openBlock(disableTracking = false): void {
  blockStack.push(currentBlock);
  currentBlock = disableTracking || blockTrackingDelta < 0 ? null : [];
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
  return vnode.dynamicChildren !== null && isArray(vnode.dynamicChildren);
}

// ============================================================
// 调试/测试 API
// ============================================================

/**
 * 获取当前 Block 的 dynamicChildren 数组
 */
export function getCurrentBlock(): VNode[] | null {
  return currentBlock ? [...currentBlock] : null;
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
  blockTrackingDelta = 0;
}
