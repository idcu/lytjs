/**
 * Lyt.js 虚拟 DOM 引擎 — 列表 Diff 算法
 *
 * 本模块实现了 keyed children 的 diff 算法，灵感来自 Vue 3 的 diff 实现。
 * 采用"两端 + 最长递增子序列"的五步比较策略：
 *
 *   1. 从头同步（从头开始比较，遇到不同就停止）
 *   2. 从尾同步（从尾开始比较，遇到不同就停止）
 *   3. 挂载新节点（如果新节点有剩余，全部挂载）
 *   4. 卸载旧节点（如果旧节点有剩余，全部卸载）
 *   5. 处理未知子序列（使用 key→index 映射 + LIS 最小移动）
 *
 * DOM 操作通过注册函数模式解耦，使本模块不依赖任何具体的 DOM 实现。
 */

import type { VNode } from './vnode'
import { isSameVNodeType } from './vnode'
import { getSequence } from '@lytjs/common'

/* ================================================================
 *  DOM 操作注册接口
 * ================================================================ */

/**
 * DOM 操作函数集合
 *
 * 使用注册函数模式，将 DOM 操作与 diff 算法解耦。
 * 使用前必须通过 registerDOMOperations() 注册实现。
 */
export interface DOMOperations {
  /** 插入元素到参考节点之前 */
  insert(child: unknown, parent: unknown, anchor: unknown): void

  /** 创建元素 */
  createElement(tag: string): unknown

  /** 创建文本节点 */
  createText(text: string): unknown

  /** 设置文本内容 */
  setText(node: unknown, text: string): void

  /** 设置元素属性 */
  setElementText(el: unknown, text: string): void

  /** 移除元素 */
  remove(child: unknown): void

  /** 创建注释节点 */
  createComment(text: string): unknown

  /** 将子节点挂载到容器 */
  mount(vnode: VNode, container: unknown, anchor: unknown, parentComponent: unknown, parentSuspense: unknown, isSVG: boolean, optimized: boolean): void

  /** 对比更新子节点 */
  patch(oldVNode: VNode, newVNode: VNode, container: unknown, anchor: unknown, parentComponent: unknown, parentSuspense: unknown, isSVG: boolean, optimized: boolean): void

  /** 卸载子节点 */
  unmount(vnode: VNode, parentComponent: unknown, parentSuspense: unknown, doRemove?: boolean): void

  /** 移动元素 */
  move(vnode: VNode, container: unknown, anchor: unknown): void
}

/** 已注册的 DOM 操作实例 */
let registeredDOMOps: DOMOperations | null = null

/**
 * 注册 DOM 操作函数
 *
 * @param ops DOM 操作函数集合
 */
export function registerDOMOperations(ops: DOMOperations): void {
  registeredDOMOps = ops
}

/**
 * 获取已注册的 DOM 操作
 * @throws 如果未注册则抛出错误
 */
function getDOMOps(): DOMOperations {
  if (!registeredDOMOps) {
    throw new Error(
      '[Lyt VDOM] DOM 操作未注册。请在使用 diff 之前调用 registerDOMOperations() 注册 DOM 操作。'
    )
  }
  return registeredDOMOps
}

/* ================================================================
 *  Keyed Children Diff — 五步比较
 * ================================================================ */

/**
 * 对比带 key 的子节点列表（核心 diff 函数）
 *
 * 五步比较策略：
 *   1. 从头同步 — 从前往后逐个比较，key 相同则 patch，不同则停止
 *   2. 从尾同步 — 从后往前逐个比较，key 相同则 patch，不同则停止
 *   3. 挂载新节点 — 如果新节点有剩余，全部创建并插入
 *   4. 卸载旧节点 — 如果旧节点有剩余，全部移除
 *   5. 未知子序列 — 使用 key→index 映射 + LIS 算法最小化移动
 *
 * @param oldChildren 旧子节点数组
 * @param newChildren 新子节点数组
 * @param container   父容器 DOM 元素
 * @param anchor      插入锚点
 * @param parentComponent 父组件实例
 * @param parentSuspense  父 Suspense
 * @param isSVG       是否 SVG 命名空间
 */
export function patchKeyedChildren(
  oldChildren: VNode[],
  newChildren: VNode[],
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
): void {
  const ops = getDOMOps()
  let i = 0
  const oldLength = oldChildren.length
  const newLength = newChildren.length
  let oldEndIndex = oldLength - 1
  let newEndIndex = newLength - 1

  /* ---- 第 1 步：从头同步 ---- */
  // 从前往后逐个比较，key 和 type 都相同则复用并 patch
  while (i <= oldEndIndex && i <= newEndIndex) {
    const oldVNode = oldChildren[i]
    const newVNode = newChildren[i]

    if (isSameVNodeType(oldVNode, newVNode)) {
      ops.patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG, true)
    } else {
      break
    }
    i++
  }

  /* ---- 第 2 步：从尾同步 ---- */
  // 从后往前逐个比较
  while (i <= oldEndIndex && i <= newEndIndex) {
    const oldVNode = oldChildren[oldEndIndex]
    const newVNode = newChildren[newEndIndex]

    if (isSameVNodeType(oldVNode, newVNode)) {
      ops.patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG, true)
    } else {
      break
    }
    oldEndIndex--
    newEndIndex--
  }

  /* ---- 第 3 步：挂载新节点 ---- */
  // 如果新节点有剩余（i > newEndIndex 说明新节点已全部处理）
  // i > oldEndIndex 说明旧节点已全部处理
  if (i > oldEndIndex) {
    // 新节点有剩余，需要挂载
    if (i <= newEndIndex) {
      // 确定插入锚点
      const nextPos = newEndIndex + 1
      const nextAnchor = nextPos < newLength
        ? newChildren[nextPos].el
        : anchor

      while (i <= newEndIndex) {
        ops.mount(
          newChildren[i],
          container,
          nextAnchor,
          parentComponent,
          parentSuspense,
          isSVG,
          true,
        )
        i++
      }
    }
  }

  /* ---- 第 4 步：卸载旧节点 ---- */
  else if (i > newEndIndex) {
    // 旧节点有剩余，需要卸载
    while (i <= oldEndIndex) {
      ops.unmount(oldChildren[i], parentComponent, parentSuspense, true)
      i++
    }
  }

  /* ---- 第 5 步：处理未知子序列 ---- */
  else {
    // 此时 [i, oldEndIndex] 是旧节点的未知部分
    //      [i, newEndIndex] 是新节点的未知部分

    // 5.1 构建新节点 key → index 映射表
    const newKeyToIndexMap = new Map<PropertyKey, number>()
    for (let j = i; j <= newEndIndex; j++) {
      const key = newChildren[j].key
      if (key !== null && key !== undefined) {
        newKeyToIndexMap.set(key, j)
      }
    }

    let j: number
    let patched = 0
    let pos = 0 // 记录当前最长递增子序列的长度
    const toBePatched = newEndIndex - i + 1 // 需要处理的节点数
    let moved = false // 是否发生了移动

    // 创建数组，用于记录旧节点在新节点中的位置
    // 0 表示旧节点不在新节点中（需要卸载）
    const newIndexToOldIndexMap = new Array(toBePatched)
    for (j = 0; j < toBePatched; j++) {
      newIndexToOldIndexMap[j] = 0
    }

    // 5.2 遍历旧节点，尝试在映射表中找到对应的新节点
    for (j = i; j <= oldEndIndex; j++) {
      const oldVNode = oldChildren[j]
      const oldKey = oldVNode.key

      if (patched >= toBePatched) {
        // 所有新节点都已处理，剩余旧节点直接卸载
        ops.unmount(oldVNode, parentComponent, parentSuspense, true)
        continue
      }

      const newIndex = oldKey !== null && oldKey !== undefined
        ? newKeyToIndexMap.get(oldKey)
        : undefined

      if (newIndex === undefined) {
        // 旧节点在新节点中不存在，卸载
        ops.unmount(oldVNode, parentComponent, parentSuspense, true)
      } else {
        // 找到对应的新节点，记录位置关系
        newIndexToOldIndexMap[newIndex - i] = j + 1 // +1 避免 0 值（0 表示需要创建）

        // 更新 pos 以追踪最长递增子序列
        if (newIndex >= pos) {
          pos = newIndex + 1
        } else {
          moved = true
        }

        // patch 复用的节点
        ops.patch(
          oldVNode,
          newChildren[newIndex],
          container,
          null,
          parentComponent,
          parentSuspense,
          isSVG,
          true,
        )
        patched++
      }
    }

    // 5.3 移动和挂载
    // 仅当发生移动时才计算 LIS
    const increasingNewIndexSequence = moved
      ? getSequence(newIndexToOldIndexMap)
      : []

    // 从后往前遍历，确保插入操作不会影响后续锚点的位置
    j = increasingNewIndexSequence.length - 1

    for (let k = toBePatched - 1; k >= 0; k--) {
      const newIndex = i + k
      const newVNode = newChildren[newIndex]
      const newAnchor = newIndex + 1 < newLength
        ? newChildren[newIndex + 1].el
        : anchor

      if (newIndexToOldIndexMap[k] === 0) {
        // 旧节点不存在，需要创建并挂载
        ops.mount(
          newVNode,
          container,
          newAnchor,
          parentComponent,
          parentSuspense,
          isSVG,
          true,
        )
      } else if (moved) {
        // 发生了移动，检查是否在 LIS 中
        if (j < 0 || k !== increasingNewIndexSequence[j]) {
          // 不在 LIS 中，需要移动
          ops.move(newVNode, container, newAnchor)
        } else {
          // 在 LIS 中，不需要移动
          j--
        }
      }
    }
  }
}

/* ================================================================
 *  Unkeyed Children Diff — 无 key 子节点对比
 * ================================================================ */

/**
 * 对比不带 key 的子节点列表
 *
 * 简单策略：逐个 patch，多出的挂载，多余的卸载。
 * 性能不如 keyed diff，但适用于没有 key 的简单场景。
 *
 * @param oldChildren 旧子节点
 * @param newChildren 新子节点
 * @param container   父容器
 * @param anchor      锚点
 * @param parentComponent 父组件
 * @param parentSuspense  父 Suspense
 * @param isSVG       是否 SVG
 */
export function patchUnkeyedChildren(
  oldChildren: VNode[],
  newChildren: VNode[],
  container: any,
  anchor: any,
  parentComponent: any,
  parentSuspense: any,
  isSVG: boolean,
): void {
  const ops = getDOMOps()
  const oldLength = oldChildren.length
  const newLength = newChildren.length
  const commonLength = Math.min(oldLength, newLength)

  // 逐个 patch 共同部分
  for (let i = 0; i < commonLength; i++) {
    const oldVNode = oldChildren[i]
    const newVNode = newChildren[i]

    ops.patch(
      oldVNode,
      newVNode,
      container,
      null,
      parentComponent,
      parentSuspense,
      isSVG,
      false,
    )
  }

  // 新节点有剩余，挂载
  if (newLength > oldLength) {
    const nextAnchor = newLength > 0 ? newChildren[commonLength].el : anchor
    for (let i = commonLength; i < newLength; i++) {
      ops.mount(
        newChildren[i],
        container,
        nextAnchor,
        parentComponent,
        parentSuspense,
        isSVG,
        false,
      )
    }
  }

  // 旧节点有剩余，卸载
  if (oldLength > newLength) {
    for (let i = commonLength; i < oldLength; i++) {
      ops.unmount(oldChildren[i], parentComponent, parentSuspense, true)
    }
  }
}


