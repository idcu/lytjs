/**
 * Lyt.js 模板编译器 — 块树 (Block Tree)
 *
 * 实现类似 Vue 3 的 Block Tree 优化机制。
 *
 * Block 的核心思想：
 *   - 一个 Block 收集其内部的所有动态子节点
 *   - 重新渲染时，只对 Block 中的动态子节点进行 diff
 *   - 静态子节点被完全跳过，大幅减少 diff 开销
 *
 * Block 的创建时机：
 *   - 模板的根节点（或 v-if/v-each 的分支根节点）自动成为 Block
 *   - Block 在创建 VNode 时收集动态子节点
 */

// ============================================================
// 类型定义
// ============================================================

/** 轻量级 VNode 类型（用于编译时类型检查） */
export interface VNode {
  /** VNode 类型标识 */
  type: string | symbol;
  /** 标签名或组件 */
  tag?: string;
  /** 属性 */
  props?: Record<string, any> | null;
  /** 子节点 */
  children?: VNode[] | string | null;
  /** 补丁标记 */
  patchFlag?: number;
  /** 动态属性键列表（配合 PROPS 标记使用） */
  dynamicProps?: string[];
  /** Block 引用 */
  dynamicChildren?: VNode[];
  /** 是否为 Block 根节点 */
  isBlock?: boolean;
  /** shapeFlag */
  shapeFlag?: number;
}

/** Block 接口 */
export interface Block {
  /** Block 的根 VNode */
  vnode: VNode;
  /** Block 内的动态子节点列表 */
  dynamicChildren: VNode[];
}

// ============================================================
// Block 创建
// ============================================================

/**
 * 创建一个 Block
 *
 * Block 是一种特殊的 VNode，它会追踪内部的动态子节点。
 * 在重新渲染时，只对 dynamicChildren 中的节点进行 diff。
 *
 * @param tag 标签名
 * @param props 属性
 * @param children 子节点
 * @param patchFlag 补丁标记
 * @returns Block 对象
 */
export function createBlock(
  tag: string,
  props: Record<string, any> | null = null,
  children: VNode[] | string | null = null,
  patchFlag: number = 0
): Block {
  const vnode: VNode = {
    type: tag,
    tag,
    props,
    children,
    patchFlag,
    dynamicChildren: [],
    isBlock: true,
  };

  return {
    vnode,
    dynamicChildren: [],
  };
}

/**
 * 创建一个普通 VNode
 *
 * @param tag 标签名
 * @param props 属性
 * @param children 子节点
 * @param patchFlag 补丁标记
 * @returns VNode 对象
 */
export function createVNode(
  tag: string,
  props: Record<string, any> | null = null,
  children: VNode[] | string | null = null,
  patchFlag: number = 0
): VNode {
  return {
    type: tag,
    tag,
    props,
    children,
    patchFlag,
  };
}

// ============================================================
// Block 追踪
// ============================================================

/** 当前正在创建的 Block 栈 */
let currentBlock: Block | null = null;

/**
 * 进入 Block 上下文
 *
 * 在创建 Block 的子节点之前调用，使子节点中的动态节点
 * 被自动收集到当前 Block 的 dynamicChildren 中。
 *
 * @param block 要进入的 Block
 */
export function enterBlock(block: Block): void {
  currentBlock = block;
}

/**
 * 退出 Block 上下文
 */
export function exitBlock(): void {
  currentBlock = null;
}

/**
 * 获取当前 Block
 *
 * @returns 当前正在创建的 Block，如果没有则返回 null
 */
export function getCurrentBlock(): Block | null {
  return currentBlock;
}

/**
 * 将动态子节点注册到当前 Block
 *
 * 当创建一个带有 patchFlag 的 VNode 时调用，
 * 将其添加到当前 Block 的 dynamicChildren 列表中。
 *
 * @param vnode 动态 VNode
 */
export function trackDynamicChild(vnode: VNode): void {
  if (currentBlock && vnode.patchFlag && vnode.patchFlag > 0) {
    currentBlock.dynamicChildren.push(vnode);
  }
}

// ============================================================
// Block 树遍历
// ============================================================

/**
 * 遍历 Block 树中的所有动态子节点
 *
 * @param block 根 Block
 * @param visitor 访问器函数，返回 false 可提前终止遍历
 */
export function traverseBlockChildren(
  block: Block,
  visitor: (vnode: VNode) => boolean | void
): void {
  for (const child of block.dynamicChildren) {
    const result = visitor(child);
    if (result === false) return;

    // 如果子节点本身也是 Block，递归遍历
    if (child.isBlock && child.dynamicChildren) {
      traverseBlockChildren(
        { vnode: child, dynamicChildren: child.dynamicChildren },
        visitor
      );
    }
  }
}

/**
 * 统计 Block 树中的动态子节点数量
 *
 * @param block 根 Block
 * @returns 动态子节点总数
 */
export function countDynamicChildren(block: Block): number {
  let count = 0;
  traverseBlockChildren(block, () => {
    count++;
  });
  return count;
}
