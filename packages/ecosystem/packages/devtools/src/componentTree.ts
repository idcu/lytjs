/**
 * @lytjs/devtools - 组件树查看器
 */

import type { ComponentTreeNode } from './types';
import { isObject } from '@lytjs/common-is';
import { safeStringify } from './safe-stringify';

// 组件 ID 计数器
let componentIdCounter = 0;

/**
 * 生成组件 ID
 */
function generateComponentId(): string {
  return `component-${++componentIdCounter}`;
}

/**
 * 提取组件信息
 */
function extractComponentInfo(component: {
  name?: string;
  displayName?: string;
  props?: Record<string, unknown>;
}): ComponentTreeNode | null {
  if (!component) return null;

  const id = generateComponentId();
  const name = component.name || component.displayName || 'Anonymous';

  // 提取 props
  const props: Record<string, unknown> = {};
  if (component.props && isObject(component.props)) {
    for (const [key, value] of Object.entries(component.props)) {
      if (typeof value !== 'function') {
        props[key] = value;
      }
    }
  }

  return {
    id,
    name,
    props: Object.keys(props).length > 0 ? props : undefined,
  };
}

/**
 * 递归构建组件树
 */
function buildComponentTreeRecursive(
  component: {
    name?: string;
    displayName?: string;
    props?: Record<string, unknown>;
    children?: unknown[];
  },
  parentId?: string,
): ComponentTreeNode | null {
  const node = extractComponentInfo(component);
  if (!node) return null;

  if (parentId) {
    node.parent = parentId;
  }

  // 递归处理子组件
  if (component.children && Array.isArray(component.children)) {
    const children: ComponentTreeNode[] = [];
    for (const child of component.children) {
      // ★ 2026-10-18 修复：`children?: unknown[]`，但**非对象子项**（字符串 / 数字 / null）
      //   此前会被 `extractComponentInfo` 当成组件 ⇒ 名字回退成 `Anonymous`
      //   ⇒ 面板里冒出**幽灵组件节点**（实测 `['纯文本', 42]` 生成 2 个 `Anonymous`）。
      //   这里只把对象当作组件。
      if (child === null || typeof child !== 'object') continue;

      const childNode = buildComponentTreeRecursive(
        child as {
          name?: string;
          displayName?: string;
          props?: Record<string, unknown>;
          children?: unknown[];
        },
        node.id,
      );
      if (childNode) {
        children.push(childNode);
      }
    }
    if (children.length > 0) {
      node.children = children;
    }
  }

  return node;
}

/**
 * 获取组件树
 */
export function getComponentTree(rootComponent?: {
  name?: string;
  displayName?: string;
  props?: Record<string, unknown>;
  children?: unknown[];
}): ComponentTreeNode[] {
  if (!rootComponent) {
    // 尝试从全局获取根组件
    const globalRoot = (globalThis as { __LYTJS_ROOT__?: unknown }).__LYTJS_ROOT__;
    if (!globalRoot) {
      return [];
    }
    rootComponent = globalRoot as {
      name?: string;
      displayName?: string;
      props?: Record<string, unknown>;
      children?: unknown[];
    };
  }

  const tree = buildComponentTreeRecursive(rootComponent);
  return tree ? [tree] : [];
}

/**
 * 序列化组件树为字符串
 */
export function serializeComponentTree(nodes: ComponentTreeNode[], indent = 0): string {
  let result = '';
  const prefix = '  '.repeat(indent);

  for (const node of nodes) {
    result += `${prefix}- ${node.name}`;
    if (node.props && Object.keys(node.props).length > 0) {
      // ★ 2026-10-18 修复：此前用 `JSON.stringify(v)` —— props 值含**循环引用**时直接抛
      //   （实测 `TypeError: Converting circular structure to JSON`），整个组件树面板打不出来。
      const propsStr = Object.entries(node.props)
        .map(([k, v]) => `${k}=${safeStringify(v)}`)
        .join(', ');
      result += ` (${propsStr})`;
    }
    result += '\n';

    if (node.children && node.children.length > 0) {
      result += serializeComponentTree(node.children, indent + 1);
    }
  }

  return result;
}

/**
 * 注册根组件（供开发时使用）
 */
export function registerRootComponent(component: unknown): void {
  (globalThis as { __LYTJS_ROOT__?: unknown }).__LYTJS_ROOT__ = component;
}

/**
 * 清除注册的根组件
 */
export function unregisterRootComponent(): void {
  delete (globalThis as { __LYTJS_ROOT__?: unknown }).__LYTJS_ROOT__;
}
