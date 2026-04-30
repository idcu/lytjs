/**
 * @lytjs/vdom - vnode
 * VNode creation and manipulation functions
 */

import { Fragment, Text, Comment, ShapeFlags } from "@lytjs/common-vnode";
import type { VNode, VNodeChildren, VNodeTypes } from "@lytjs/common-vnode";
import {
  isString,
  isArray,
  isFunction,
  isObject,
  isNullish,
  EMPTY_OBJ,
} from "@lytjs/common-is";
import { normalizeClass } from "@lytjs/common-string";

// ============================================================
// createVNode
// ============================================================

/**
 * Create a VNode
 */
export function createVNode(
  type: VNodeTypes,
  props: Record<string, any> | null = null,
  children: VNodeChildren = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode: boolean = false,
): VNode {
  // Handle class/style normalization
  if (props) {
    props = normalizeProps(props);
  }

  const vnode: VNode = {
    type,
    key: props?.key ?? null,
    ref: props?.ref ?? null,
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

  // Store props directly on the vnode
  if (props) {
    vnode.props = props;
  } else {
    vnode.props = null;
  }

  // Normalize children and update shapeFlag
  if (children !== null && children !== undefined) {
    normalizeChildren(vnode, children);
  }

  return vnode;
}

// ============================================================
// createTextVNode
// ============================================================

/**
 * Create a text VNode
 */
export function createTextVNode(text: string = ""): VNode {
  return createVNode(Text, null, text);
}

// ============================================================
// createCommentVNode
// ============================================================

/**
 * Create a comment VNode
 */
export function createCommentVNode(text: string = ""): VNode {
  const vnode = createVNode(Comment, null, text);
  vnode.isComment = true;
  return vnode;
}

// ============================================================
// cloneVNode
// ============================================================

/**
 * Clone a VNode, optionally merging extra props
 */
export function cloneVNode(
  vnode: VNode,
  extraProps: Record<string, any> | null = null,
): VNode {
  const cloned: VNode = {
    ...vnode,
    isCloned: true,
    // Deep clone dynamic children reference (not the array itself)
    dynamicChildren: vnode.dynamicChildren ? [...vnode.dynamicChildren] : null,
  };

  // Merge extra props
  if (extraProps) {
    const mergedProps = { ...extraProps };
    // Normalize the merged props
    normalizeProps(mergedProps);
    cloned.key = mergedProps.key ?? vnode.key;
    cloned.ref = mergedProps.ref ?? vnode.ref;
    // Merge props directly
    if (vnode.props) {
      cloned.props = { ...vnode.props, ...mergedProps };
    } else {
      cloned.props = mergedProps;
    }
    // Merge children if provided
    if (!isNullish(mergedProps.children)) {
      cloned.children = mergedProps.children;
      normalizeChildren(cloned, mergedProps.children);
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
  ...args: (Record<string, any> | null | undefined)[]
): Record<string, any> {
  const result: Record<string, any> = {};

  for (let i = 0; i < args.length; i++) {
    const props = args[i];
    if (!props) continue;

    for (const key in props) {
      if (key === "key" || key === "ref") continue;

      const val = props[key];
      const existing = result[key];

      // Class concatenation
      if (key === "class") {
        result[key] = existing
          ? normalizeClass([existing, val])
          : normalizeClass(val);
      }
      // Style merging
      else if (key === "style") {
        result[key] = existing
          ? normalizeStyle([existing, val])
          : normalizeStyle(val);
      }
      // Event handler concatenation
      else if (key.startsWith("on") && isFunction(val)) {
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
 * Normalize children and set shapeFlag on the vnode
 */
export function normalizeChildren(vnode: VNode, children: VNodeChildren): void {
  let type: number = 0;

  if (isNullish(children)) {
    // No children
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN;
  } else if (isString(children) || isFunction(children)) {
    // Function children will be resolved later; treat as text for shapeFlag
    type = ShapeFlags.TEXT_CHILDREN;
    // Convert function children to a slot-like structure
    if (isFunction(children)) {
      vnode.children = children as unknown as VNodeChildren;
    }
  } else if (typeof children === "number") {
    type = ShapeFlags.TEXT_CHILDREN;
    vnode.children = String(children);
  } else if (typeof children === "boolean") {
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
  if (isObject(type) && typeof type === "object") {
    return ShapeFlags.STATEFUL_COMPONENT;
  }
  return 0;
}

// ============================================================
// Internal helpers
// ============================================================

/**
 * Normalize props: extract key/ref, normalize class/style
 */
function normalizeProps(props: Record<string, any>): Record<string, any> {
  const normalized = { ...props };
  // class normalization
  if (normalized.class !== undefined) {
    normalized.class = normalizeClass(normalized.class);
  }
  // style normalization
  if (normalized.style !== undefined) {
    normalized.style = normalizeStyle(normalized.style);
  }
  return normalized;
}

/**
 * Normalize style value - keeps object form for vdom patch diffing
 * Note: common-string's normalizeStyle returns string, but vdom needs object form
 */
function normalizeStyle(
  value: unknown,
): string | Record<string, string | number> {
  if (isArray(value)) {
    const res: Record<string, string | number> = {};
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (item) {
        const normalized = normalizeStyle(item);
        if (isString(normalized)) {
          // Skip string elements to avoid ignoring subsequent object elements
          continue;
        }
        Object.assign(res, normalized);
      }
    }
    return res;
  }
  if (isString(value)) {
    return value;
  }
  if (isObject(value)) {
    return value as Record<string, string | number>;
  }
  return EMPTY_OBJ as Record<string, string | number>;
}

// Re-export EMPTY_OBJ for convenience
export { EMPTY_OBJ };
