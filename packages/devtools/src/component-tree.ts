/**
 * Lyt.js DevTools — 组件树检查器
 *
 * 遍历应用组件树，生成可视化的树形结构，支持组件选择、搜索过滤和高亮。
 *
 * 核心功能：
 * - ComponentTreeInspector 类
 * - 遍历应用组件树，生成树形结构
 * - 显示每个组件的名称、状态数量、是否有更新、渲染耗时
 * - 点击组件节点显示详情
 * - 高亮选中组件（给对应 DOM 元素加边框）
 * - 组件搜索/过滤功能
 *
 * 纯原生零依赖实现。
 */

import {
  type ComponentInfo,
  getAllComponents,
  getRootComponent,
  getComponentById,
  getChildComponents,
  selectComponent,
  getSelectedComponentId,
} from './hooks';
import type { DevToolsPanel } from './panel';

// ============================================================
// 类型定义
// ============================================================

/** 组件树节点数据 */
interface TreeNodeData {
  /** 组件信息 */
  info: ComponentInfo;
  /** 子节点 */
  children: TreeNodeData[];
  /** 层级深度 */
  depth: number;
  /** 是否展开 */
  expanded: boolean;
}

/** 组件选中回调 */
type ComponentSelectCallback = (componentId: string | null) => void;

// ============================================================
// 组件树检查器类
// ============================================================

/**
 * 组件树检查器
 *
 * 负责渲染和管理组件树视图，包括搜索、过滤、选择等功能。
 */
export class ComponentTreeInspector {
  /** 面板引用 */
  private panel: DevToolsPanel;
  /** 组件选中回调 */
  private onSelect: ComponentSelectCallback;
  /** 搜索关键词 */
  private searchKeyword: string = '';
  /** 展开的节点 ID 集合 */
  private expandedNodes = new Set<string>();
  /** 当前内容容器 */
  private container: HTMLElement | null = null;
  /** 更新定时器 */
  private updateTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(panel: DevToolsPanel, onSelect?: ComponentSelectCallback) {
    this.panel = panel;
    this.onSelect = onSelect || (() => {});

    // 默认展开根节点
    const root = getRootComponent();
    if (root) {
      this.expandedNodes.add(root.id);
    }

    // 监听全局更新事件
    if (typeof window !== 'undefined') {
      window.addEventListener('lyt-devtools-update', this.onUpdate);
    }
  }

  // ============================================================
  // 渲染
  // ============================================================

  /**
   * 渲染组件树到指定容器
   */
  render(container: HTMLElement): void {
    this.container = container;
    this.renderTree();
  }

  /**
   * 渲染完整组件树
   */
  private renderTree(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

    // 创建搜索框
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'lyt-devtools-search';
    searchInput.placeholder = '搜索组件...';
    searchInput.value = this.searchKeyword;
    searchInput.addEventListener('input', (e) => {
      this.searchKeyword = (e.target as HTMLInputElement).value;
      this.renderTree();
    });
    this.container.appendChild(searchInput);

    // 获取所有组件
    const components = getAllComponents();

    if (components.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lyt-devtools-empty';
      empty.textContent = '暂无组件，请确保应用已挂载。';
      this.container.appendChild(empty);
      return;
    }

    // 构建树形结构
    const tree = this.buildTree();

    // 渲染树节点
    for (const node of tree) {
      const nodeEl = this.renderTreeNode(node);
      if (nodeEl) {
        this.container.appendChild(nodeEl);
      }
    }

    // 更新状态栏
    this.panel.setStatusLeft(
      `<span class="lyt-devtools-status-dot"></span><span>${components.length} 个组件</span>`
    );
  }

  /**
   * 构建组件树形数据结构
   */
  private buildTree(): TreeNodeData[] {
    const components = getAllComponents();
    const nodeMap = new Map<string, TreeNodeData>();
    const roots: TreeNodeData[] = [];

    // 创建所有节点
    for (const info of components) {
      // 搜索过滤
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        const nameMatch = info.name.toLowerCase().includes(keyword);
        const idMatch = info.id.toLowerCase().includes(keyword);
        if (!nameMatch && !idMatch) continue;
      }

      const node: TreeNodeData = {
        info,
        children: [],
        depth: 0,
        expanded: this.expandedNodes.has(info.id),
      };
      nodeMap.set(info.id, node);
    }

    // 建立父子关系
    for (const node of nodeMap.values()) {
      const parentId = node.info.parentId;
      if (parentId && nodeMap.has(parentId)) {
        const parent = nodeMap.get(parentId)!;
        parent.children.push(node);
        node.depth = parent.depth + 1;
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * 渲染单个树节点
   */
  private renderTreeNode(node: TreeNodeData): HTMLElement | null {
    const { info, depth, expanded } = node;
    const selectedId = getSelectedComponentId();
    const isSelected = info.id === selectedId;

    // 节点容器
    const nodeEl = document.createElement('div');
    nodeEl.className = 'lyt-tree-node';
    nodeEl.style.cssText = `
      display: flex;
      align-items: center;
      padding: 3px 8px;
      cursor: pointer;
      border-radius: 3px;
      margin-bottom: 1px;
      transition: background 0.1s ease;
      ${isSelected ? 'background: rgba(203, 166, 247, 0.15); border-left: 2px solid #cba6f7;' : ''}
    `;

    // 鼠标悬停效果
    nodeEl.addEventListener('mouseenter', () => {
      if (!isSelected) {
        nodeEl.style.background = 'rgba(69, 71, 90, 0.5)';
      }
    });
    nodeEl.addEventListener('mouseleave', () => {
      if (!isSelected) {
        nodeEl.style.background = '';
      }
    });

    // 缩进
    const indent = document.createElement('span');
    indent.style.cssText = `display: inline-block; width: ${depth * 16}px; flex-shrink: 0;`;
    nodeEl.appendChild(indent);

    // 展开/折叠箭头
    const hasChildren = info.childIds.length > 0;
    const arrow = document.createElement('span');
    arrow.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      font-size: 10px;
      color: #6c7086;
      flex-shrink: 0;
      transition: transform 0.15s ease;
      ${hasChildren ? '' : 'visibility: hidden;'}
      ${expanded ? 'transform: rotate(90deg);' : ''}
    `;
    arrow.textContent = '\u25B6';
    nodeEl.appendChild(arrow);

    // 组件图标
    const icon = document.createElement('span');
    icon.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      font-size: 12px;
      margin-right: 4px;
      flex-shrink: 0;
    `;
    icon.textContent = info.isUnmounted ? '\u{1F480}' : '\u{1F4E6}';
    nodeEl.appendChild(icon);

    // 组件名称
    const nameEl = document.createElement('span');
    nameEl.style.cssText = `
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
      color: ${isSelected ? '#cba6f7' : '#cdd6f4'};
    `;
    nameEl.textContent = info.name;
    nodeEl.appendChild(nameEl);

    // 状态数量标签
    const stateCount = Object.keys(info.state).length;
    if (stateCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'lyt-devtools-badge lyt-devtools-badge-blue';
      badge.textContent = `${stateCount}`;
      badge.title = `${stateCount} 个状态属性`;
      nodeEl.appendChild(badge);
    }

    // 计算属性标签
    const computedCount = Object.keys(info.computed).length;
    if (computedCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'lyt-devtools-badge lyt-devtools-badge-green';
      badge.textContent = `C:${computedCount}`;
      badge.title = `${computedCount} 个计算属性`;
      badge.style.marginLeft = '3px';
      nodeEl.appendChild(badge);
    }

    // 挂载状态标签
    if (!info.isMounted && !info.isUnmounted) {
      const badge = document.createElement('span');
      badge.className = 'lyt-devtools-badge lyt-devtools-badge-yellow';
      badge.textContent = '未挂载';
      badge.style.marginLeft = '3px';
      nodeEl.appendChild(badge);
    } else if (info.isUnmounted) {
      const badge = document.createElement('span');
      badge.className = 'lyt-devtools-badge lyt-devtools-badge-red';
      badge.textContent = '已卸载';
      badge.style.marginLeft = '3px';
      nodeEl.appendChild(badge);
    }

    // 点击事件
    nodeEl.addEventListener('click', (e) => {
      e.stopPropagation();

      // 如果有子节点，切换展开状态
      if (hasChildren) {
        if (this.expandedNodes.has(info.id)) {
          this.expandedNodes.delete(info.id);
        } else {
          this.expandedNodes.add(info.id);
        }
      }

      // 选中组件
      selectComponent(info.id);
      this.onSelect(info.id);

      // 高亮对应 DOM 元素
      this.panel.highlightElement(info.el);

      // 重新渲染
      this.renderTree();
    });

    // 鼠标悬停时高亮 DOM 元素
    nodeEl.addEventListener('mouseenter', () => {
      this.panel.highlightElement(info.el);
    });
    nodeEl.addEventListener('mouseleave', () => {
      const selected = getSelectedComponentId();
      const selectedInfo = selected ? getComponentById(selected) : null;
      this.panel.highlightElement(selectedInfo?.el ?? null);
    });

    // 如果展开，递归渲染子节点
    if (expanded && hasChildren) {
      const children = getChildComponents(info.id);
      for (const childInfo of children) {
        // 搜索过滤
        if (this.searchKeyword) {
          const keyword = this.searchKeyword.toLowerCase();
          const nameMatch = childInfo.name.toLowerCase().includes(keyword);
          const idMatch = childInfo.id.toLowerCase().includes(keyword);
          if (!nameMatch && !idMatch) continue;
        }

        const childNode: TreeNodeData = {
          info: childInfo,
          children: [],
          depth: depth + 1,
          expanded: this.expandedNodes.has(childInfo.id),
        };
        const childEl = this.renderTreeNode(childNode);
        if (childEl) {
          nodeEl.appendChild(childEl);
        }
      }
    }

    return nodeEl;
  }

  // ============================================================
  // 更新处理
  // ============================================================

  /**
   * 全局更新事件处理
   * 使用防抖避免频繁更新
   */
  private onUpdate = (): void => {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    this.updateTimer = setTimeout(() => {
      this.renderTree();
    }, 100);
  };

  /**
   * 强制刷新组件树
   */
  refresh(): void {
    this.renderTree();
  }

  // ============================================================
  // 销毁
  // ============================================================

  /**
   * 销毁检查器
   */
  destroy(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('lyt-devtools-update', this.onUpdate);
    }
    this.container = null;
  }
}
