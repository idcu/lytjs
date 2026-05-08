/**
 * @lytjs/vdom - vnode
 * VNode 创建和操作函数
 * FIX: P2-28 对象创建优化 - 使用对象池减少 GC 压力
 */

import { Fragment, Text, Comment, ShapeFlags } from '@lytjs/common-vnode';
import type { VNode, VNodeChildren, VNodeTypes } from '@lytjs/common-vnode';
import { isString, isArray, isFunction, isObject, isNullish, EMPTY_OBJ } from '@lytjs/common-is';
import { normalizeClass, normalizeStyleObject as normalizeStyle } from '@lytjs/common-string';

// ============================================================
// FIX: P2-28 对象创建优化 - VNode 对象池
// ============================================================

/** VNode 对象池最大容量 */
const VNODE_POOL_MAX_SIZE = 200;
/** VNode 对象池 */
const vnodePool: VNode[] = [];
/** 池化对象使用计数（用于调试） */
let vnodePoolHitCount = 0;
let vnodePoolMissCount = 0;

/**
 * 从对象池获取一个 VNode 对象
 * FIX: P2-28 对象创建优化
 */
function acquireVNode(): VNode | null {
  if (vnodePool.length > 0) {
    vnodePoolHitCount++;
    return vnodePool.pop()!;
  }
  vnodePoolMissCount++;
  return null;
}

/**
 * 将 VNode 对象归还到对象池
 * FIX: P2-28 对象创建优化
 */
export function releaseVNode(vnode: VNode): void {
  if (vnodePool.length < VNODE_POOL_MAX_SIZE) {
    // 重置 vnode 状态，清除引用以便垃圾回收
    vnode.type = null as unknown as VNodeTypes;
    vnode.props = null;
    vnode.key = null;
    vnode.ref = null;
    vnode.isStatic = false;
    vnode.isStaticRoot = false;
    vnode.isOnce = false;
    vnode.isAsyncPlaceholder = false;
    vnode.isComment = false;
    vnode.isCloned = false;
    vnode.isBlockTree = false;
    vnode.shapeFlag = 0;
    vnode.patchFlag = 0;
    vnode.dynamicProps = null;
    vnode.dynamicChildren = null;
    vnode.children = null;
    vnode.component = null;
    vnode.el = null;
    vnode.anchor = null;
    vnode.target = null;
    vnode.targetAnchor = null;
    vnode.targetStart = null;
    vnode.loc = null;
    vnodePool.push(vnode);
  }
}

/**
 * 获取 VNode 池化统计信息（用于调试）
 * FIX: P2-28 对象创建优化
 */
export function getVNodePoolStats(): { hit: number; miss: number; size: number } {
  return {
    hit: vnodePoolHitCount,
    miss: vnodePoolMissCount,
    size: vnodePool.length,
  };
}

/**
 * 重置 VNode 池化统计信息
 * FIX: P2-28 对象创建优化
 */
export function resetVNodePoolStats(): void {
  vnodePoolHitCount = 0;
  vnodePoolMissCount = 0;
}

// ============================================================
// 开发警告
// ============================================================

function warnDev(msg: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[LytJS] ${msg}`);
  }
}

// ============================================================
// 类型别名（提高可读性）
// ============================================================

/** 元素的 Props 类型（HTML 属性） */
type ElementProps = Record<string, unknown>;

/** 组件的 Props 类型 */
type ComponentProps = Record<string, unknown>;

// ============================================================
// createVNode 重载
// ============================================================

/**
 * 创建文本 VNode（Text 类型重载）
 */
export function createVNode(type: typeof Text, props: null, children?: string): VNode;

/**
 * 创建注释 VNode（Comment 类型重载）
 */
export function createVNode(type: typeof Comment, props: null, children?: string): VNode;

/**
 * 创建 Fragment VNode（Fragment 类型重载）
 */
export function createVNode(type: typeof Fragment, props: null, children?: VNodeChildren): VNode;

/**
 * 创建带字符串标签的元素 VNode（HTML 元素重载）
 * 提供更好的元素 props 类型推导。
 */
export function createVNode(
  type: string,
  props: ElementProps | null,
  children?: VNodeChildren,
  patchFlag?: number,
  dynamicProps?: string[] | null,
  isBlockNode?: boolean,
): VNode;

/**
 * 创建带对象类型的组件 VNode（组件重载）
 * 提供更好的组件 props 类型推导。
 */
export function createVNode(
  type: object,
  props: ComponentProps | null,
  children?: VNodeChildren,
  patchFlag?: number,
  dynamicProps?: string[] | null,
  isBlockNode?: boolean,
): VNode;

/**
 * 创建 VNode（VNodeTypes 通用回退重载）
 *
 * 此重载处理所有 VNodeTypes，包括 string、object、symbol 和内置类型。
 * 它是最灵活的，应在编译时不知道具体类型时使用。
 */
export function createVNode(
  type: VNodeTypes,
  props?: Record<string, unknown> | null,
  children?: VNodeChildren,
  patchFlag?: number,
  dynamicProps?: string[] | null,
  isBlockNode?: boolean,
): VNode;

/**
 * 创建 VNode（实现）
 *
 * 创建一个 VNode
 */
export function createVNode(
  type: VNodeTypes,
  props: Record<string, unknown> | null = null,
  children: VNodeChildren = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode: boolean = false,
): VNode {
  // __DEV__ 模式：key 和 ref 的运行时类型检查
  if (props) {
    if ('key' in props && props.key != null) {
      const keyType = typeof props.key;
      if (keyType !== 'string' && keyType !== 'number' && keyType !== 'symbol') {
        warnDev(`Invalid value used as key. Expected string, number, or symbol, got ${keyType}.`);
      }
    }
    if ('ref' in props && props.ref != null) {
      const refVal = props.ref;
      if (typeof refVal !== 'object' && typeof refVal !== 'function') {
        warnDev(
          `Invalid value used as ref. Expected object, function, or null, got ${typeof refVal}.`,
        );
      }
    }
  }

  const vnode: VNode = {
    type,
    props: props ? normalizeProps(props) : null,
    key: (props?.key as string | number | symbol | null | undefined) ?? null,
    ref: (props?.ref as ((ref: unknown) => void) | null | undefined) ?? null,
    isStatic: false,
    isStaticRoot: false,
    isOnce: false,
    isAsyncPlaceholder: false,
    isComment: false,
    isCloned: false,
    isBlockTree: isBlockNode,
    shapeFlag: getShapeFlag(type),
    patchFlag,
    dynamicProps,
    dynamicChildren: null,
    children,
    component: null,
    el: null,
    anchor: null,
    target: null,
    targetAnchor: null,
    targetStart: null,
    loc: null,
    __v_isVNode: true,
  };

  // 规范化 children 并更新 shapeFlag
  if (children !== null && children !== undefined) {
    normalizeChildren(vnode, children);
  }

  return vnode;
}

/**
 * 创建 VNode（使用对象池优化版本）
 * FIX: P2-28 对象创建优化 - 优先从对象池获取 VNode 对象
 */
export function createVNodePooled(
  type: VNodeTypes,
  props: Record<string, unknown> | null = null,
  children: VNodeChildren = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode: boolean = false,
): VNode {
  // 尝试从对象池获取
  const vnode = acquireVNode();

  if (vnode) {
    // 复用池化对象，重置所有属性
    vnode.type = type;
    vnode.props = props ? normalizeProps(props) : null;
    vnode.key = (props?.key as string | number | symbol | null | undefined) ?? null;
    vnode.ref = (props?.ref as ((ref: unknown) => void) | null | undefined) ?? null;
    vnode.isStatic = false;
    vnode.isStaticRoot = false;
    vnode.isOnce = false;
    vnode.isAsyncPlaceholder = false;
    vnode.isComment = false;
    vnode.isCloned = false;
    vnode.isBlockTree = isBlockNode;
    vnode.shapeFlag = getShapeFlag(type);
    vnode.patchFlag = patchFlag;
    vnode.dynamicProps = dynamicProps;
    vnode.dynamicChildren = null;
    vnode.children = children;
    vnode.component = null;
    vnode.el = null;
    vnode.anchor = null;
    vnode.target = null;
    vnode.targetAnchor = null;
    vnode.targetStart = null;
    vnode.loc = null;
    (vnode as { __v_isVNode?: boolean }).__v_isVNode = true;

    // 规范化 children 并更新 shapeFlag
    if (children !== null && children !== undefined) {
      normalizeChildren(vnode, children);
    }

    return vnode;
  }

  // 池为空，创建新对象
  return createVNode(type, props, children, patchFlag, dynamicProps, isBlockNode);
}

// ============================================================
// createTextVNode
// ============================================================

/**
 * 创建文本 VNode
 */
export function createTextVNode(text: string = ''): VNode {
  return createVNode(Text, null, text);
}

// ============================================================
// createCommentVNode
// ============================================================

/**
 * 创建注释 VNode
 */
export function createCommentVNode(text: string = ''): VNode {
  const vnode = createVNode(Comment, null, text);
  vnode.isComment = true;
  return vnode;
}

// ============================================================
// cloneVNode
// ============================================================

/**
 * 克隆 VNode，可选合并额外的 props
 *
 * FIX: P2-9 注意：此函数执行浅拷贝，嵌套对象（如 props 中的对象属性）
 * 将在原始 VNode 和克隆的 VNode 之间共享。这是有意的设计选择，
 * 以平衡性能与正确性。如果需要完全隔离，调用方应手动深拷贝相关属性。
 */
export function cloneVNode(vnode: VNode, extraProps: Record<string, unknown> | null = null): VNode {
  const cloned: VNode = {
    ...vnode,
    isCloned: true,
    // 浅拷贝数组 children 以防止共享修改
    children: Array.isArray(vnode.children) ? [...vnode.children] : vnode.children,
    // 深拷贝 dynamic children 引用（不是数组本身）
    dynamicChildren: vnode.dynamicChildren ? [...vnode.dynamicChildren] : null,
  };

  // 合并额外的 props
  if (extraProps) {
    const mergedProps = { ...extraProps };
    // 规范化合并后的 props
    normalizeProps(mergedProps);
    cloned.key = (mergedProps.key as string | number | symbol | null | undefined) ?? vnode.key;
    cloned.ref = (mergedProps.ref as ((ref: unknown) => void) | null | undefined) ?? vnode.ref;
    // 直接合并 props
    if (vnode.props) {
      cloned.props = { ...vnode.props, ...mergedProps };
    } else {
      cloned.props = mergedProps;
    }
    // 如果提供了 children，则合并
    if (!isNullish(mergedProps.children)) {
      cloned.children = mergedProps.children as VNodeChildren;
      normalizeChildren(cloned, mergedProps.children as VNodeChildren);
    }
  }
  // 当没有 extraProps 时，props 已通过展开运算符浅拷贝
  // 这只是复制了引用。为了真正的浅拷贝，我们创建一个新对象。
  else if (vnode.props) {
    cloned.props = { ...vnode.props };
  }

  return cloned;
}

// ============================================================
// mergeProps
// ============================================================

/**
 * 合并多个 props 对象。
 * - class 值会被拼接
 * - style 值会被合并
 * - 其他 props：后面的值覆盖前面的值
 * - 事件处理器（onXxx）会被拼接成数组
 */
export function mergeProps(
  ...args: (Record<string, unknown> | null | undefined)[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (let i = 0; i < args.length; i++) {
    const props = args[i];
    if (!props) continue;

    for (const key in props) {
      if (key === 'key' || key === 'ref') continue;

      const val = props[key];
      const existing = result[key];

      // Class 拼接
      if (key === 'class') {
        result[key] = existing ? normalizeClass([existing, val]) : normalizeClass(val as string);
      }
      // Style 合并
      else if (key === 'style') {
        result[key] = existing ? normalizeStyle([existing, val]) : normalizeStyle(val);
      }
      // 事件处理器拼接
      else if (key.startsWith('on') && isFunction(val)) {
        if (isFunction(existing)) {
          result[key] = [existing, val];
        } else if (isArray(existing)) {
          result[key] = [...existing, val];
        } else {
          result[key] = val;
        }
      }
      // 普通 prop 覆盖
      else {
        result[key] = val;
      }
    }
  }

  return result;
}

// ============================================================
// normalizeChildren
// ============================================================

/**
 * FIX: P2-6 VDOM-NEW-13 - Fragment children 扁平化辅助函数
 * 在 normalize 阶段处理嵌套 Fragment
 */
function flattenChildren(children: unknown[]): unknown[] {
  const flattened: unknown[] = [];

  for (const child of children) {
    if (!child) continue;

    // 检查是否为 Fragment vnode
    if (isObject(child) && 'type' in child && child.type === Fragment) {
      const fragmentChildren = (child as VNode).children;
      if (isArray(fragmentChildren)) {
        // 递归扁平化嵌套 Fragment
        flattened.push(...flattenChildren(fragmentChildren));
      }
    } else {
      flattened.push(child);
    }
  }

  return flattened;
}

/**
 * 规范化 children 并设置 vnode 的 shapeFlag
 * FIX: P2-6 VDOM-NEW-13 - 支持 Fragment children 扁平化
 */
export function normalizeChildren(vnode: VNode, children: VNodeChildren): void {
  let type: number = 0;

  if (isNullish(children)) {
    // 无 children
  } else if (isArray(children)) {
    // FIX: P2-6 如果是 Fragment，扁平化嵌套的 children
    if (vnode.type === Fragment) {
      const flattened = flattenChildren(children);
      vnode.children = flattened as VNodeChildren;
      type = ShapeFlags.ARRAY_CHILDREN;
    } else {
      type = ShapeFlags.ARRAY_CHILDREN;
    }
  } else if (isString(children) || isFunction(children)) {
    // 函数 children 将在后续解析；对于 shapeFlag 视为文本
    type = ShapeFlags.TEXT_CHILDREN;
    // 将函数 children 转换为类似 slot 的结构
    if (isFunction(children)) {
      // FIX: P2-13 函数类型 children 的 shapeFlag 处理：
      // 函数 children 在组件 vnode 上作为默认 slot 使用（render 函数中通过
      // this.$slots.default 访问）。对于非组件 vnode，函数 children 会被
      // patch 阶段转换为空字符串（参见 patch.ts 中的 Text/Comment 处理）。
      // 此处保留 TEXT_CHILDREN flag，因为函数 children 在非组件场景下
      // 语义上等同于文本占位符。
      vnode.children = children as unknown as VNodeChildren;
    }
  } else if (typeof children === 'number') {
    type = ShapeFlags.TEXT_CHILDREN;
    vnode.children = String(children);
  } else if (typeof children === 'boolean') {
    // 布尔 children 视为 null
    vnode.children = undefined;
  } else if (isObject(children)) {
    // Slots children
    type = ShapeFlags.SLOTS_CHILDREN;
  }

  vnode.shapeFlag |= type;
}

// ============================================================
// getShapeFlag
// ============================================================

/**
 * 根据 vnode 类型确定基础 shapeFlag
 */
export function getShapeFlag(type: VNodeTypes): number {
  if (isString(type)) {
    return ShapeFlags.ELEMENT;
  }
  if (type === Fragment) {
    return ShapeFlags.ARRAY_CHILDREN;
  }
  if (type === Text) {
    return ShapeFlags.TEXT_CHILDREN;
  }
  if (type === Comment) {
    return 0;
  }
  // 对象类型 => 组件
  if (isObject(type)) {
    return ShapeFlags.STATEFUL_COMPONENT;
  }
  return 0;
}

// ============================================================
// 内部工具函数
// ============================================================

/**
 * 规范化 props：提取 key/ref，规范化 class/style。
 * 如果 props 没有 class/style 简写属性，返回原始对象
 * 以避免不必要的浅拷贝增加 GC 压力。
 */
function normalizeProps(props: Record<string, unknown>): Record<string, unknown> {
  // 快速路径：如果没有需要规范化的 class/style，返回原始对象
  if (props.class === undefined && props.style === undefined) {
    return props;
  }
  const normalized = { ...props };
  // class 规范化
  if (normalized.class !== undefined) {
    normalized.class = normalizeClass(normalized.class as Parameters<typeof normalizeClass>[0]);
  }
  // style 规范化
  if (normalized.style !== undefined) {
    normalized.style = normalizeStyle(normalized.style as Parameters<typeof normalizeStyle>[0]);
  }
  return normalized;
}

// 为方便起见重新导出 EMPTY_OBJ
export { EMPTY_OBJ };
