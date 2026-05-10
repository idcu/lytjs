/**
 * DevTools 组件树管理模块
 */

import type { ComponentTreeNode } from './types';

export interface ComponentInfo {
  id: string;
  name: string;
  parentId?: string;
  children: string[];
  props?: Record<string, unknown>;
  slots?: Record<string, unknown>;
}

const components = new Map<string, ComponentInfo>();
let idCounter = 0;

/**
 * 生成组件 ID
 */
export function generateComponentId(): string {
  return `component-${++idCounter}-${Date.now().toString(36)}`;
}

export function registerComponent(info: ComponentInfo): void {
  components.set(info.id, info);
  if (info.parentId) {
    const parent = components.get(info.parentId);
    if (parent && !parent.children.includes(info.id)) {
      parent.children.push(info.id);
    }
  }
}

export function unregisterComponent(id: string): void {
  const component = components.get(id);
  if (component?.parentId) {
    const parent = components.get(component.parentId);
    if (parent) {
      parent.children = parent.children.filter(cid => cid !== id);
    }
  }
  components.delete(id);
}

export function getComponentById(id: string): ComponentInfo | undefined {
  return components.get(id);
}

export function getAllComponents(): ComponentInfo[] {
  return Array.from(components.values());
}

export function getRootComponents(): ComponentInfo[] {
  return Array.from(components.values()).filter(c => !c.parentId);
}

export function clearComponents(): void {
  components.clear();
}

/**
 * 获取组件数量
 */
export function getComponentCount(): number {
  return components.size;
}

/**
 * 构建层级组件树
 * 将扁平的组件列表转换为树形结构
 */
export function buildComponentTree(): ComponentTreeNode[] {
  const roots: ComponentTreeNode[] = [];
  const nodeMap = new Map<string, ComponentTreeNode>();

  // 首先创建所有节点
  for (const component of components.values()) {
    const node: ComponentTreeNode = {
      id: component.id,
      name: component.name,
      type: 'component',
      children: [],
      props: component.props || {},
      emits: [],
      slots: Object.keys(component.slots || {}),
    };
    nodeMap.set(component.id, node);
  }

  // 然后建立父子关系
  for (const component of components.values()) {
    const node = nodeMap.get(component.id);
    if (!node) continue;

    if (component.parentId) {
      const parent = nodeMap.get(component.parentId);
      if (parent) {
        node.parent = component.parentId;
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * 获取组件树（兼容旧接口，返回树形结构）
 */
export function getComponentTree(): ComponentTreeNode[] {
  return buildComponentTree();
}

/**
 * 清除组件注册表并重置计数器
 */
export function clearComponentRegistry(): void {
  components.clear();
  idCounter = 0;
}
