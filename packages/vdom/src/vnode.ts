/**
 * @lytjs/vdom - vnode
 * VNode creation and manipulation functions
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
// Dev warnings
// ============================================================

function warnDev(msg: string): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn(`[LytJS] ${msg}`);
  }
}

// ============================================================
// Type aliases for better readability
// ============================================================

/** Props type for elements (HTML attributes) */
type ElementProps = Record<string, unknown>;

/** Props type for components */
type ComponentProps = Record<string, unknown>;

// ============================================================
// createVNode overloads
// ============================================================

/**
 * Create a text VNode (overload for Text type)
 */
export function createVNode(
  type: typeof Text,
  props: null,
  children?: string,
): VNode;

/**
 * Create a comment VNode (overload for Comment type)
 */
export function createVNode(
  type: typeof Comment,
  props: null,
  children?: string,
): VNode;

/**
 * Create a Fragment VNode (overload for Fragment type)
 */
export function createVNode(
  type: typeof Fragment,
  props: null,
  children?: VNodeChildren,
): VNode;

/**
 * Create an element VNode with string tag (overload for HTML elements)
 * Provides better type inference for element props.
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
 * Create a component VNode with object type (overload for components)
 * Provides better type inference for component props.
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
 * Create a VNode (generic fallback for VNodeTypes)
 *
 * This overload handles all VNodeTypes including string, object, symbol, and built-in types.
 * It is the most flexible and should be used when the exact type is not known at compile time.
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
 * Create a VNode (implementation)
 *
 * Create a VNode
 */
export function createVNode(
  type: VNodeTypes,
  props: Record<string, unknown> | null = null,
  children: VNodeChildren = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode: boolean = false,
): VNode {
  // __DEV__ mode: runtime type checks for key and ref
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

  // Normalize children and update shapeFlag
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

    // Normalize children and update shapeFlag
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
 * Create a text VNode
 */
export function createTextVNode(text: string = ''): VNode {
  return createVNode(Text, null, text);
}

// ============================================================
// createCommentVNode
// ============================================================

/**
 * Create a comment VNode
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
 * Clone a VNode, optionally merging extra props
 *
 * FIX: P2-9 注意：此函数执行浅拷贝，嵌套对象（如 props 中的对象属性）
 * 将在原始 VNode 和克隆的 VNode 之间共享。这是有意的设计选择，
 * 以平衡性能与正确性。如果需要完全隔离，调用方应手动深拷贝相关属性。
 */
export function cloneVNode(vnode: VNode, extraProps: Record<string, unknown> | null = null): VNode {
  const cloned: VNode = {
    ...vnode,
    isCloned: true,
    // Shallow clone array children to prevent shared mutation
    children: Array.isArray(vnode.children) ? [...vnode.children] : vnode.children,
    // Deep clone dynamic children reference (not the array itself)
    dynamicChildren: vnode.dynamicChildren ? [...vnode.dynamicChildren] : null,
  };

  // Merge extra props
  if (extraProps) {
    const mergedProps = { ...extraProps };
    // Normalize the merged props
    normalizeProps(mergedProps);
    cloned.key = (mergedProps.key as string | number | symbol | null | undefined) ?? vnode.key;
    cloned.ref = (mergedProps.ref as ((ref: unknown) => void) | null | undefined) ?? vnode.ref;
    // Merge props directly
    if (vnode.props) {
      cloned.props = { ...vnode.props, ...mergedProps };
    } else {
      cloned.props = mergedProps;
    }
    // Merge children if provided
    if (!isNullish(mergedProps.children)) {
      cloned.children = mergedProps.children as VNodeChildren;
      normalizeChildren(cloned, mergedProps.children as VNodeChildren);
    }
  }
  // When no extraProps, props is already shallow-copied via spread (...vnode)
  // which copies the reference. For a true shallow copy, we create a new object.
  else if (vnode.props) {
    cloned.props = { ...vnode.props };
  }

  return cloned;
}

// ============================================================
// mergeProps
// ============================================================

/**
 * Merge multiple props objects.
 * - class values are concatenated
 * - style values are merged
 * - other props: later values override earlier ones
 * - event handlers (onXxx) are concatenated into arrays
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

      // Class concatenation
      if (key === 'class') {
        result[key] = existing ? normalizeClass([existing, val]) : normalizeClass(val as string);
      }
      // Style merging
      else if (key === 'style') {
        result[key] = existing ? normalizeStyle([existing, val]) : normalizeStyle(val);
      }
      // Event handler concatenation
      else if (key.startsWith('on') && isFunction(val)) {
        if (isFunction(existing)) {
          result[key] = [existing, val];
        } else if (isArray(existing)) {
          result[key] = [...existing, val];
        } else {
          result[key] = val;
        }
      }
      // Normal prop override
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
 * Normalize children and set shapeFlag on the vnode
 * FIX: P2-6 VDOM-NEW-13 - 支持 Fragment children 扁平化
 */
export function normalizeChildren(vnode: VNode, children: VNodeChildren): void {
  let type: number = 0;

  if (isNullish(children)) {
    // No children
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
    // Function children will be resolved later; treat as text for shapeFlag
    type = ShapeFlags.TEXT_CHILDREN;
    // Convert function children to a slot-like structure
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
    // Boolean children are treated as null
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
 * Determine the base shapeFlag from the vnode type
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
  // Object type => component
  if (isObject(type)) {
    return ShapeFlags.STATEFUL_COMPONENT;
  }
  return 0;
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Normalize props: extract key/ref, normalize class/style.
 * If props already has no class/style shorthand properties, return the original object
 * to avoid unnecessary shallow copies that increase GC pressure.
 */
function normalizeProps(props: Record<string, unknown>): Record<string, unknown> {
  // Fast path: if no class/style to normalize, return original object
  if (props.class === undefined && props.style === undefined) {
    return props;
  }
  const normalized = { ...props };
  // class normalization
  if (normalized.class !== undefined) {
    normalized.class = normalizeClass(normalized.class as Parameters<typeof normalizeClass>[0]);
  }
  // style normalization
  if (normalized.style !== undefined) {
    normalized.style = normalizeStyle(normalized.style as Parameters<typeof normalizeStyle>[0]);
  }
  return normalized;
}

// Re-export EMPTY_OBJ for convenience
export { EMPTY_OBJ };
