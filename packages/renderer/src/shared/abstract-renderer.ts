/**
 * abstract-renderer.ts - 抽象渲染器基类
 *
 * 提取 miniapp-renderer.ts 和 native-renderer.ts 中共享的
 * DOM 操作方法（insert / remove / replace / parentNode / nextSibling），
 * 避免代码重复。
 *
 * 两个渲染器的节点结构都包含 _parent 和 children 字段，
 * 因此这些树操作逻辑完全一致。
 */

/**
 * 树节点接口 - 描述具有父子关系的通用节点结构
 *
 * MiniAppNode 和 NativeNode 都满足此接口。
 */
export interface TreeNode {
  /** 子节点列表 */
  children: TreeNode[]
  /** 父节点引用（内部使用，不序列化） */
  _parent?: TreeNode
}

/**
 * 插入子节点
 *
 * 将 child 插入到 parent 的子节点列表中。
 * 如果提供了 ref，则插入到 ref 之前；否则追加到末尾。
 * 会自动清除 child 的旧父节点引用。
 *
 * @param parent 父节点
 * @param child  子节点
 * @param ref    参考节点（插入到其前面），可选
 */
export function insertChild(parent: TreeNode, child: TreeNode, ref?: TreeNode): void {
  if (!parent || !child) return;

  // 清除旧父节点引用
  if (child._parent) {
    const oldParent = child._parent;
    const idx = oldParent.children.indexOf(child);
    if (idx !== -1) oldParent.children.splice(idx, 1);
  }

  // 设置新父节点引用
  child._parent = parent;

  if (ref) {
    const idx = parent.children.indexOf(ref);
    if (idx !== -1) {
      parent.children.splice(idx, 0, child);
    } else {
      parent.children.push(child);
    }
  } else {
    parent.children.push(child);
  }
}

/**
 * 移除节点
 *
 * 将 child 从其父节点的子节点列表中移除，
 * 并清除 child 的父节点引用。
 *
 * @param child 要移除的节点
 */
export function removeChild(child: TreeNode): void {
  if (!child || !child._parent) return;

  const parent = child._parent;
  const idx = parent.children.indexOf(child);
  if (idx !== -1) {
    parent.children.splice(idx, 1);
  }
  child._parent = undefined;
}

/**
 * 替换子节点
 *
 * 将 parent 子节点列表中的 oldChild 替换为 newChild。
 * 会自动更新父节点引用。
 *
 * @param parent   父节点
 * @param oldChild 被替换的旧节点
 * @param newChild 替换的新节点
 */
export function replaceChild(parent: TreeNode, oldChild: TreeNode, newChild: TreeNode): void {
  if (!parent || !oldChild || !newChild) return;

  const idx = parent.children.indexOf(oldChild);
  if (idx !== -1) {
    oldChild._parent = undefined;
    newChild._parent = parent;
    parent.children[idx] = newChild;
  }
}

/**
 * 获取父节点
 *
 * @param el 树节点
 * @returns 父节点，无父节点时返回 null
 */
export function getParentNode(el: TreeNode): TreeNode | null {
  return el?._parent ?? null;
}

/**
 * 获取下一个兄弟节点
 *
 * @param el 树节点
 * @returns 下一个兄弟节点，无时返回 null
 */
export function getNextSibling(el: TreeNode): TreeNode | null {
  if (!el || !el._parent) return null;
  const siblings = el._parent.children;
  const idx = siblings.indexOf(el);
  return idx !== -1 && idx + 1 < siblings.length
    ? siblings[idx + 1]
    : null;
}

/**
 * 在下一个微任务中执行回调
 *
 * @param cb 回调函数
 */
export function nextTick(cb: Function): void {
  Promise.resolve().then(() => cb());
}
