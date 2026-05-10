/**
 * DevTools 组件树管理模块
 */

export interface ComponentInfo {
  id: string;
  name: string;
  parentId?: string;
  children: string[];
  props?: Record<string, unknown>;
  slots?: Record<string, unknown>;
}

const components = new Map<string, ComponentInfo>();

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
