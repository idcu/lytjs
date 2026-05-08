/**
 * @lytjs/devtools - Component tree inspection
 */

import type { ComponentTreeNode } from './types';

// Component registry for tracking instances
const componentRegistry = new Map<string, any>();
let componentIdCounter = 0;

/**
 * Generate a unique component ID
 */
export function generateComponentId(): string {
  return `component-${++componentIdCounter}`;
}

/**
 * Register a component instance
 */
export function registerComponent(instance: any, id: string): void {
  componentRegistry.set(id, instance);
}

/**
 * Unregister a component instance
 */
export function unregisterComponent(id: string): void {
  componentRegistry.delete(id);
}

/**
 * Get component tree starting from root
 * This is a simplified implementation - in production would traverse actual component tree
 */
export function getComponentTree(): ComponentTreeNode[] {
  const roots: ComponentTreeNode[] = [];
  
  for (const [id, instance] of componentRegistry) {
    // Check if it's a root component (no parent in registry)
    const isRoot = !instance.parent || !componentRegistry.has(instance.parent);
    if (isRoot) {
      roots.push(buildComponentNode(id, instance));
    }
  }
  
  return roots;
}

/**
 * Build a component tree node
 */
function buildComponentNode(id: string, instance: any): ComponentTreeNode {
  const node: ComponentTreeNode = {
    id,
    name: instance.name || instance.type?.name || 'Anonymous',
    type: 'component',
    children: [],
    props: instance.props || {},
    emits: instance.emits || [],
    slots: Object.keys(instance.slots || {}),
  };
  
  // Add children
  if (instance.children) {
    for (const child of instance.children) {
      if (child && child._devtoolsId) {
        const childInstance = componentRegistry.get(child._devtoolsId);
        if (childInstance) {
          node.children.push(buildComponentNode(child._devtoolsId, childInstance));
        }
      }
    }
  }
  
  return node;
}

/**
 * Get a component by ID
 */
export function getComponentById(id: string): ComponentTreeNode | undefined {
  const instance = componentRegistry.get(id);
  if (!instance) return undefined;
  return buildComponentNode(id, instance);
}

/**
 * Get component count
 */
export function getComponentCount(): number {
  return componentRegistry.size;
}

/**
 * Clear component registry
 */
export function clearComponentRegistry(): void {
  componentRegistry.clear();
  componentIdCounter = 0;
}
