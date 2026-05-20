/**
 * @lytjs/ssr - 组件级水合提示
 *
 * 提供水合标记、策略检测和状态序列化等辅助函数，
 * 用于 SSR 输出中嵌入客户端水合所需的信息
 */

import type { VNode, VNodeChildren } from '@lytjs/vdom';
import { isString, isNumber, isArray, isObject, isFunction, isNullish } from '@lytjs/common-is';

/** 水合策略类型 */
export type HydrationStrategy = 'lazy' | 'eager' | 'idle';

/** 水合提示信息 */
export interface HydrationHints {
  /** 组件唯一标识 */
  componentId: string;
  /** 水合策略 */
  strategy: HydrationStrategy;
  /** 组件 props 快照 */
  props: Record<string, unknown>;
}

/** 水合状态数据结构 */
export interface HydrationState {
  /** 组件水合提示列表 */
  hints: HydrationHints[];
  /** 全局初始状态 */
  initialState?: Record<string, unknown>;
}

/** 水合标记属性名 */
const HYDRATE_ATTR = 'data-hydrate';
/** 水合策略属性名 */
const HYDRATE_STRATEGY_ATTR = 'data-hydrate-strategy';
/** 脱水状态 script 标记 */
const DEHYDRATED_STATE_ID = '__LYT_DEHYDRATED_STATE__';

/** 组件 ID 计数器 */
let componentIdCounter = 0;

/**
 * 生成唯一的组件 ID
 *
 * @returns 唯一标识字符串
 */
function generateComponentId(): string {
  componentIdCounter++;
  return `lyt-hydrate-${componentIdCounter}`;
}

/**
 * 重置组件 ID 计数器（仅用于测试）
 */
export function resetComponentIdCounter(): void {
  componentIdCounter = 0;
}

/**
 * 判断 VNode 是否为元素类型
 */
function isElementVNode(vnode: VNode): boolean {
  return isObject(vnode) && isString((vnode as VNode).type);
}

/**
 * 判断 VNode 是否为组件类型
 */
function isComponentVNode(vnode: VNode): boolean {
  return isObject(vnode) && isFunction((vnode as VNode).type);
}

/**
 * 获取 VNode 的 props（安全访问）
 */
function getVNodeProps(vnode: VNode): Record<string, unknown> {
  if (isObject(vnode) && isObject((vnode as VNode).props)) {
    return (vnode as VNode).props as Record<string, unknown>;
  }
  return {};
}

/**
 * 获取 VNode 的 children（安全访问）
 */
function getVNodeChildren(vnode: VNode): VNode[] | string | number | null {
  if (isObject(vnode)) {
    return (vnode as VNode).children as VNode[] | string | number | null;
  }
  return null;
}

/**
 * 为 VNode 树添加水合标记
 *
 * @description
 * 递归遍历 VNode 树，为每个元素节点添加 data-hydrate 属性，
 * 用于客户端水合时识别对应的 SSR 输出节点。
 * 同时根据 props 中的 hydrateStrategy 设置 data-hydrate-strategy 属性。
 *
 * @param vnode - 原始 VNode
 * @returns 添加了水合标记的新 VNode（浅拷贝）
 *
 * @example
 * ```typescript
 * const marked = createHydrationMarkers(vnode);
 * // marked 的每个元素节点都带有 data-hydrate="lyt-hydrate-1" 等属性
 * ```
 */
export function createHydrationMarkers(vnode: VNode): VNode {
  // 非对象类型直接返回
  if (!isObject(vnode)) {
    return vnode;
  }

  const node = vnode as VNode;

  // 处理数组
  if (isArray(vnode)) {
    return vnode.map(child =>
      createHydrationMarkers(child as VNode)
    ) as unknown as VNode;
  }

  // 处理元素节点 - 添加水合标记
  if (isElementVNode(node)) {
    const id = generateComponentId();
    const props = { ...getVNodeProps(node) };
    props[HYDRATE_ATTR] = id;

    // 检查是否有水合策略
    const strategy = props['hydrateStrategy'] as HydrationStrategy | undefined;
    if (strategy && isValidStrategy(strategy)) {
      props[HYDRATE_STRATEGY_ATTR] = strategy;
    }

    // 递归处理子节点
    const children = getVNodeChildren(node);
    let processedChildren: VNodeChildren = children;
    if (children !== null && !isString(children) && !isNumber(children)) {
      if (isArray(children)) {
        processedChildren = children.map(child =>
          createHydrationMarkers(child as VNode)
        );
      } else if (isObject(children)) {
        processedChildren = [createHydrationMarkers(children as VNode)];
      }
    }

    return { ...node, props, children: processedChildren } as VNode;
  }

  // 处理组件节点 - 递归但不添加标记
  if (isComponentVNode(node)) {
    const children = getVNodeChildren(node);
    if (children !== null && !isString(children) && !isNumber(children)) {
      if (isArray(children)) {
        return {
          ...node,
          children: children.map(child =>
            createHydrationMarkers(child as VNode)
          ),
        } as VNode;
      } else if (isObject(children)) {
        return {
          ...node,
          children: [createHydrationMarkers(children as VNode)],
        } as VNode;
      }
    }
    return node;
  }

  return node;
}

/**
 * 验证水合策略是否合法
 */
function isValidStrategy(strategy: string): strategy is HydrationStrategy {
  return strategy === 'lazy' || strategy === 'eager' || strategy === 'idle';
}

/**
 * 获取组件的水合策略
 *
 * @description
 * 从 VNode 的 props 中读取 hydrateStrategy 字段，
 * 返回对应的水合策略。如果未设置，默认返回 'eager'。
 *
 * @param vnode - 目标 VNode
 * @returns 水合策略（lazy / eager / idle）
 *
 * @example
 * ```typescript
 * const strategy = getHydrationStrategy(vnode);
 * // 'eager' | 'lazy' | 'idle'
 * ```
 */
export function getHydrationStrategy(vnode: VNode): HydrationStrategy {
  if (!isObject(vnode)) {
    return 'eager';
  }

  const props = getVNodeProps(vnode as VNode);
  const strategy = props['hydrateStrategy'];

  if (isString(strategy) && isValidStrategy(strategy)) {
    return strategy;
  }

  return 'eager';
}

/**
 * 从 VNode 树中收集所有水合提示
 *
 * @description
 * 遍历 VNode 树，收集所有组件的水合信息，
 * 包括组件 ID、水合策略和 props 快照。
 */
function collectHydrationHints(
  vnode: VNode,
  hints: HydrationHints[] = []
): HydrationHints[] {
  if (!isObject(vnode)) {
    return hints;
  }

  const node = vnode as VNode;

  // 处理数组
  if (isArray(vnode)) {
    for (const child of vnode) {
      collectHydrationHints(child as VNode, hints);
    }
    return hints;
  }

  // 元素节点 - 收集提示
  if (isElementVNode(node)) {
    const props = getVNodeProps(node);
    const hydrateId = props[HYDRATE_ATTR];

    if (isString(hydrateId)) {
      // 过滤掉内部属性
      const cleanProps: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(props)) {
        if (!key.startsWith('data-') && key !== 'key' && key !== 'ref') {
          cleanProps[key] = value;
        }
      }

      hints.push({
        componentId: hydrateId,
        strategy: getHydrationStrategy(node),
        props: cleanProps,
      });
    }

    // 递归处理子节点
    const children = getVNodeChildren(node);
    if (children !== null && !isString(children) && !isNumber(children)) {
      if (isArray(children)) {
        for (const child of children) {
          collectHydrationHints(child as VNode, hints);
        }
      } else if (isObject(children)) {
        collectHydrationHints(children as VNode, hints);
      }
    }
  }

  return hints;
}

/**
 * 序列化客户端水合所需的初始状态
 *
 * @description
 * 将任意状态对象序列化为可安全嵌入 HTML 的 JSON 字符串。
 * 处理特殊值（undefined、函数、Symbol 等）以确保 JSON 安全。
 *
 * @param state - 要序列化的状态对象
 * @returns JSON 字符串
 *
 * @example
 * ```typescript
 * const serialized = serializeHydrationState({
 *   user: { name: 'Alice', age: 30 },
 *   items: [1, 2, 3],
 * });
 * // '{"user":{"name":"Alice","age":30},"items":[1,2,3]}'
 * ```
 */
export function serializeHydrationState(state: unknown): string {
  if (isNullish(state)) {
    return '{}';
  }

  // 使用 JSON.stringify 并处理特殊值
  return JSON.stringify(state, (_, value) => {
    // 过滤掉 undefined
    if (typeof value === 'undefined') {
      return null;
    }
    // 过滤掉函数
    if (typeof value === 'function') {
      return null;
    }
    // 过滤掉 Symbol
    if (typeof value === 'symbol') {
      return null;
    }
    return value;
  });
}

/**
 * 创建脱水状态（SSR 时序列化到 HTML 中的状态）
 *
 * @description
 * 从 VNode 树中提取水合所需的信息，生成一段可嵌入 HTML 的 script 标签内容。
 * 客户端加载时读取此状态进行水合。
 *
 * @param vnode - VNode 节点
 * @param initialState - 可选的全局初始状态
 * @returns 可嵌入 HTML 的 script 标签字符串
 *
 * @example
 * ```typescript
 * const script = createDehydratedState(vnode, {
 *   user: { name: 'Alice' },
 * });
 * // <script id="__LYT_DEHYDRATED_STATE__" type="application/json">...</script>
 * ```
 */
export function createDehydratedState(
  vnode: VNode,
  initialState?: Record<string, unknown>
): string {
  // 重置计数器以确保一致性
  resetComponentIdCounter();

  // 先为 VNode 树添加水合标记，再收集提示
  const markedVNode = createHydrationMarkers(vnode);
  const hints = collectHydrationHints(markedVNode);

  // 构建完整的水合状态
  const hydrationState: HydrationState = {
    hints,
    initialState,
  };

  // 序列化为 JSON
  const json = serializeHydrationState(hydrationState);

  // 转义 script 标签中的特殊字符
  const safeJson = json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\/script/gi, '\\/script');

  return `<script id="${DEHYDRATED_STATE_ID}" type="application/json">${safeJson}</script>`;
}
