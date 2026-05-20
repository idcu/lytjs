/**
 * @lytjs/devtools - 组件树查看器
 */

import type { ComponentTreeNode } from './types';
import { isObject } from '@lytjs/common-is';

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
      const propsStr = Object.entries(node.props)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
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
