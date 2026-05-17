/**
 * @lytjs/devtools - VDOM 节点树检查器
 *
 * 提供虚拟 DOM 树的可视化和检查功能
 */

import type { VNode } from '@lytjs/vdom';

export interface VDOMNodeInfo {
  id: string;
  type: string;
  tagName?: string;
  text?: string;
  props?: Record<string, unknown>;
  children: VDOMNodeInfo[];
  parentId?: string;
  depth: number;
  componentId?: string;
  isComponent: boolean;
  key?: string | number;
  ref?: string;
  domElement?: HTMLElement | null;
}

interface VDOMRegistry {
  roots: Map<string, VDOMNodeInfo>;
  nodes: Map<string, VDOMNodeInfo>;
  idCounter: number;
}

const registry: VDOMRegistry = {
  roots: new Map(),
  nodes: new Map(),
  idCounter: 0,
};

const componentVDOMMap = new Map<string, string[]>();

function generateId(): string {
  return `vdom-${++registry.idCounter}-${Date.now().toString(36)}`;
}

function getVNodeType(vnode: VNode): { type: string; tagName?: string; isComponent: boolean } {
  if (typeof vnode.type === 'string') {
    return { type: 'element', tagName: vnode.type, isComponent: false };
  } else if (typeof vnode.type === 'object' && vnode.type !== null) {
    const name = (vnode.type as { name?: string }).name || 'AnonymousComponent';
    return { type: 'component', tagName: name, isComponent: true };
  } else if (typeof vnode.type === 'function') {
    const name = (vnode.type as { name?: string }).name || 'FunctionalComponent';
    return { type: 'component', tagName: name, isComponent: true };
  }
  return { type: 'unknown', isComponent: false };
}

function extractTextContent(vnode: VNode): string | undefined {
  if (vnode.children === null || vnode.children === undefined) {
    return undefined;
  }
  
  if (typeof vnode.children === 'string') {
    return vnode.children;
  }
  
  if (typeof vnode.children === 'number') {
    return String(vnode.children);
  }
  
  if (Array.isArray(vnode.children)) {
    const texts: string[] = [];
    for (const child of vnode.children) {
      if (typeof child === 'string') {
        texts.push(child);
      } else if (typeof child === 'number') {
        texts.push(String(child));
      } else if (child && typeof child === 'object' && 'children' in child) {
        const childText = extractTextContent(child as VNode);
        if (childText) texts.push(childText);
      }
    }
    return texts.length > 0 ? texts.join('') : undefined;
  }
  
  return undefined;
}

function extractProps(vnode: VNode): Record<string, unknown> | undefined {
  if (!vnode.props || Object.keys(vnode.props).length === 0) {
    return undefined;
  }
  
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(vnode.props)) {
    if (key.startsWith('on')) continue;
    if (typeof value === 'function') continue;
    props[key] = value;
  }
  
  return Object.keys(props).length > 0 ? props : undefined;
}

export function registerVDOMRoot(
  vnode: VNode,
  componentId?: string
): string {
  const id = generateId();
  const nodeInfo = processVNode(vnode, id, null, 0, componentId);
  
  if (nodeInfo) {
    registry.roots.set(id, nodeInfo);
    registry.nodes.set(id, nodeInfo);
    
    if (componentId) {
      const existing = componentVDOMMap.get(componentId) || [];
      existing.push(id);
      componentVDOMMap.set(componentId, existing);
    }
  }
  
  return id;
}

function processVNode(
  vnode: VNode | string | number | null | undefined,
  parentId: string | undefined,
  _parentDom: HTMLElement | null,
  depth: number,
  componentId?: string
): VDOMNodeInfo | null {
  if (vnode === null || vnode === undefined) {
    return null;
  }
  
  if (typeof vnode === 'string' || typeof vnode === 'number') {
    const id = generateId();
    const text = typeof vnode === 'number' ? String(vnode) : vnode;
    const nodeInfo: VDOMNodeInfo = {
      id,
      type: 'text',
      text,
      children: [],
      parentId,
      depth,
      isComponent: false,
    };
    registry.nodes.set(id, nodeInfo);
    return nodeInfo;
  }
  
  if (typeof vnode !== 'object') {
    return null;
  }
  
  const id = generateId();
  const { type, tagName, isComponent } = getVNodeType(vnode);
  const text = extractTextContent(vnode);
  const props = extractProps(vnode);
  
  const key = vnode.key !== null && vnode.key !== undefined && typeof vnode.key !== 'symbol' 
    ? vnode.key 
    : undefined;
  const el = vnode.el;
  const domElement = el && el instanceof HTMLElement ? el : null;
  
  const nodeInfo: VDOMNodeInfo = {
    id,
    type,
    tagName,
    text: type === 'text' || !tagName ? text : undefined,
    props,
    children: [],
    parentId,
    depth,
    componentId,
    isComponent,
    key,
    ref: typeof vnode.ref === 'string' ? vnode.ref : undefined,
    domElement,
  };
  
  registry.nodes.set(id, nodeInfo);
  
  if (vnode.children && Array.isArray(vnode.children)) {
    for (const child of vnode.children) {
      const childInfo = processVNode(
        child as VNode,
        id,
        domElement,
        depth + 1,
        componentId
      );
      if (childInfo) {
        nodeInfo.children.push(childInfo);
      }
    }
  }
  
  return nodeInfo;
}

export function unregisterVDOMRoot(id: string): void {
  const node = registry.roots.get(id);
  if (node) {
    cleanupNode(node);
    registry.roots.delete(id);
  }
}

function cleanupNode(node: VDOMNodeInfo): void {
  registry.nodes.delete(node.id);
  for (const child of node.children) {
    cleanupNode(child);
  }
}

export function getVDOMRoots(): VDOMNodeInfo[] {
  return Array.from(registry.roots.values());
}

export function getVDOMNodeById(id: string): VDOMNodeInfo | undefined {
  return registry.nodes.get(id);
}

export function getVDOMTree(): VDOMNodeInfo[] {
  return getVDOMRoots();
}

export function findVDOMNodesByTag(tagName: string): VDOMNodeInfo[] {
  const results: VDOMNodeInfo[] = [];
  for (const node of registry.nodes.values()) {
    if (node.tagName === tagName) {
      results.push(node);
    }
  }
  return results;
}

export function findVDOMNodesByProp(
  propName: string,
  value?: unknown
): VDOMNodeInfo[] {
  const results: VDOMNodeInfo[] = [];
  for (const node of registry.nodes.values()) {
    if (node.props && propName in node.props) {
      if (value === undefined || node.props[propName] === value) {
        results.push(node);
      }
    }
  }
  return results;
}

export function getVDOMStats(): {
  totalNodes: number;
  rootCount: number;
  maxDepth: number;
  componentCount: number;
  elementCount: number;
  textCount: number;
} {
  let maxDepth = 0;
  let componentCount = 0;
  let elementCount = 0;
  let textCount = 0;
  
  for (const node of registry.nodes.values()) {
    if (node.depth > maxDepth) maxDepth = node.depth;
    if (node.isComponent) componentCount++;
    else if (node.type === 'element') elementCount++;
    else if (node.type === 'text') textCount++;
  }
  
  return {
    totalNodes: registry.nodes.size,
    rootCount: registry.roots.size,
    maxDepth,
    componentCount,
    elementCount,
    textCount,
  };
}

export function clearVDOMRegistry(): void {
  registry.roots.clear();
  registry.nodes.clear();
  registry.idCounter = 0;
  componentVDOMMap.clear();
}

export function serializeVDOMNode(node: VDOMNodeInfo, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';
  
  if (node.type === 'text') {
    result += `${spaces}📝 "${node.text || ''}"\n`;
  } else if (node.isComponent) {
    result += `${spaces}🧩 <${node.tagName || 'Component'}`;
    if (node.key !== undefined) result += ` key="${node.key}"`;
    result += '>\n';
  } else if (node.type === 'element') {
    result += `${spaces}🏷️ <${node.tagName || 'unknown'}`;
    if (node.key !== undefined) result += ` key="${node.key}"`;
    if (node.props) {
      const propStr = Object.entries(node.props)
        .slice(0, 3)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      if (propStr) result += ` ${propStr}`;
      if (Object.keys(node.props).length > 3) {
        result += ' ...';
      }
    }
    result += '>\n';
  }
  
  for (const child of node.children) {
    result += serializeVDOMNode(child, indent + 1);
  }
  
  if ((node.isComponent || node.type === 'element') && node.children.length === 0) {
    result += `${spaces}  (empty)\n`;
  }
  
  return result;
}

export function serializeVDOMTree(): string {
  const roots = getVDOMRoots();
  if (roots.length === 0) {
    return 'No VDOM roots registered.';
  }
  
  let result = `📦 VDOM Tree (${roots.length} root(s))\n`;
  result += '─'.repeat(40) + '\n';
  
  for (const root of roots) {
    result += serializeVDOMNode(root);
    result += '\n';
  }
  
  const stats = getVDOMStats();
  result += '─'.repeat(40) + '\n';
  result += `📊 Stats: ${stats.totalNodes} nodes, ${stats.componentCount} components, `;
  result += `${stats.elementCount} elements, ${stats.textCount} text nodes\n`;
  result += `📏 Max depth: ${stats.maxDepth}\n`;
  
  return result;
}

export function getVDOMPath(nodeId: string): VDOMNodeInfo[] {
  const path: VDOMNodeInfo[] = [];
  let current = registry.nodes.get(nodeId);
  
  while (current) {
    path.unshift(current);
    current = current.parentId ? registry.nodes.get(current.parentId) : undefined;
  }
  
  return path;
}

export function highlightVDOMNode(nodeId: string): void {
  const node = registry.nodes.get(nodeId);
  if (node?.domElement) {
    const el = node.domElement;
    const originalOutline = el.style.outline;
    const originalBackground = el.style.backgroundColor;
    
    el.style.outline = '2px solid #4fc08d';
    el.style.backgroundColor = 'rgba(79, 192, 141, 0.1)';
    
    setTimeout(() => {
      el.style.outline = originalOutline;
      el.style.backgroundColor = originalBackground;
    }, 2000);
  }
}

export function inspectVDOMNode(nodeId: string): {
  node: VDOMNodeInfo;
  path: VDOMNodeInfo[];
  domElement?: HTMLElement | null;
} | null {
  const node = registry.nodes.get(nodeId);
  if (!node) return null;
  
  return {
    node,
    path: getVDOMPath(nodeId),
    domElement: node.domElement,
  };
}
