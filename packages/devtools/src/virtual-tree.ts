/**
 * Lyt.js DevTools — 虚拟滚动组件树
 *
 * 使用虚拟滚动技术渲染组件树，仅渲染可见节点，
 * 支持展开/折叠、搜索过滤、选中高亮等功能。
 * 可处理 1000+ 组件节点而不卡顿。
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 组件树节点 */
export interface ComponentTreeNode {
  /** 组件唯一 ID */
  id: string;
  /** 组件名称 */
  name: string;
  /** 子节点 */
  children?: ComponentTreeNode[];
  /** 状态摘要 */
  stateSummary?: string;
  /** props 数量 */
  propsCount?: number;
  /** 是否活跃 */
  active?: boolean;
}

/** 虚拟树选项 */
export interface VirtualTreeOptions {
  /** 节点高度（像素），默认 28 */
  nodeHeight?: number;
  /** 容器可见区域高度（像素），默认 400 */
  visibleHeight?: number;
  /** 缩进宽度（像素），默认 20 */
  indentWidth?: number;
  /** 是否默认展开所有节点，默认 false */
  defaultExpandAll?: boolean;
  /** 节点点击回调 */
  onNodeClick?: (node: ComponentTreeNode) => void;
}

/** 内部扁平化节点 */
interface FlatNode {
  /** 原始节点数据 */
  node: ComponentTreeNode;
  /** 层级深度 */
  depth: number;
  /** 是否展开 */
  expanded: boolean;
  /** 是否可见（父节点全部展开） */
  visible: boolean;
  /** 在扁平列表中的索引 */
  flatIndex: number;
}

// ============================================================
// VirtualComponentTree 类
// ============================================================

/**
 * 虚拟滚动组件树
 *
 * 仅渲染可见区域的节点，支持大量组件的高效展示。
 */
export class VirtualComponentTree {
  /** 容器 DOM 元素 */
  private container: HTMLElement;
  /** 节点高度 */
  private nodeHeight: number;
  /** 可见区域高度 */
  private visibleHeight: number;
  /** 缩进宽度 */
  private indentWidth: number;
  /** 节点点击回调 */
  private onNodeClick?: (node: ComponentTreeNode) => void;
  /** 原始组件树数据 */
  private components: ComponentTreeNode[] = [];
  /** 扁平化节点列表 */
  private flatNodes: FlatNode[] = [];
  /** 展开状态映射 */
  private expandedMap: Map<string, boolean> = new Map();
  /** 过滤查询 */
  private filterQuery: string = '';
  /** 选中的组件 ID */
  private selectedId: string | null = null;
  /** 当前滚动偏移 */
  private scrollTop: number = 0;
  /** 内部滚动容器 */
  private scrollContainer: HTMLElement | null = null;
  /** 内容容器（撑高） */
  private contentContainer: HTMLElement | null = null;
  /** 可视节点容器 */
  private viewportContainer: HTMLElement | null = null;
  /** 滚动事件处理器 */
  private boundScrollHandler: (e: Event) => void;
  /** 是否已销毁 */
  private destroyed: boolean = false;
  /** 是否默认展开所有节点 */
  private defaultExpandAll: boolean;

  constructor(container: HTMLElement, options?: VirtualTreeOptions) {
    this.container = container;
    this.nodeHeight = options?.nodeHeight ?? 28;
    this.visibleHeight = options?.visibleHeight ?? 400;
    this.indentWidth = options?.indentWidth ?? 20;
    this.onNodeClick = options?.onNodeClick;
    this.defaultExpandAll = options?.defaultExpandAll ?? false;

    this.boundScrollHandler = this.handleScroll.bind(this);

    // 初始渲染
    this.renderContainer();
  }

  // ============================================================
  // 核心 API
  // ============================================================

  /**
   * 设置组件数据
   *
   * @param components - 组件树节点数组
   */
  setComponents(components: ComponentTreeNode[]): void {
    this.components = components;

    // 如果设置了默认展开所有，则展开所有节点
    if (this.defaultExpandAll && this.components.length > 0) {
      this.expandAllInternal();
    }

    this.flatten();
    this.renderNodes();
  }

  /**
   * 设置选中的组件
   *
   * @param id - 组件 ID
   */
  setSelectedComponent(id: string): void {
    this.selectedId = id;
    this.renderNodes();
  }

  /**
   * 设置过滤查询
   *
   * @param query - 搜索字符串
   */
  setFilter(query: string): void {
    this.filterQuery = query;
    this.flatten();
    this.renderNodes();
  }

  /**
   * 展开所有节点
   */
  expandAll(): void {
    this.expandAllInternal();
    this.flatten();
    this.renderNodes();
  }

  /**
   * 折叠所有节点
   */
  collapseAll(): void {
    this.expandedMap.clear();
    this.flatten();
    this.renderNodes();
  }

  /**
   * 销毁虚拟树
   */
  destroy(): void {
    this.destroyed = true;
    if (this.scrollContainer) {
      this.scrollContainer.removeEventListener('scroll', this.boundScrollHandler);
    }
    this.container.innerHTML = '';
    this.flatNodes = [];
    this.expandedMap.clear();
    this.components = [];
    this.scrollContainer = null;
    this.contentContainer = null;
    this.viewportContainer = null;
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 判断是否所有节点都已展开
   */
  private isAllExpanded(): boolean {
    if (this.components.length === 0) return false;
    for (const node of this.components) {
      if (!this.expandedMap.get(node.id)) return false;
    }
    return true;
  }

  /**
   * 内部展开所有
   */
  private expandAllInternal(): void {
    const expandRecursive = (nodes: ComponentTreeNode[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          this.expandedMap.set(node.id, true);
          expandRecursive(node.children);
        }
      }
    };
    expandRecursive(this.components);
  }

  /**
   * 扁平化组件树
   */
  private flatten(): void {
    this.flatNodes = [];
    let flatIndex = 0;

    const query = this.filterQuery.toLowerCase();

    // 预计算每个节点及其子树是否有匹配
    const hasMatchInSubtree = (node: ComponentTreeNode): boolean => {
      if (!query) return true;
      if (node.name.toLowerCase().includes(query)) return true;
      if (node.children) {
        return node.children.some((child) => hasMatchInSubtree(child));
      }
      return false;
    };

    const walk = (nodes: ComponentTreeNode[], depth: number, parentVisible: boolean): void => {
      for (const node of nodes) {
        const matchesFilter = !query || node.name.toLowerCase().includes(query);
        const subtreeMatch = hasMatchInSubtree(node);
        const expanded = this.expandedMap.get(node.id) ?? false;

        // 节点可见条件：
        // - 无过滤时：父节点可见且父节点展开
        // - 有过滤时：父节点可见且（自身匹配或子树有匹配）
        let visible: boolean;
        if (!query) {
          visible = parentVisible;
        } else {
          visible = parentVisible && subtreeMatch;
        }

        const flatNode: FlatNode = {
          node,
          depth,
          expanded,
          visible,
          flatIndex: flatIndex++,
        };

        this.flatNodes.push(flatNode);

        // 递归处理子节点
        if (node.children && node.children.length > 0) {
          if (query) {
            // 有过滤时，如果子树有匹配则展开
            walk(node.children, depth + 1, visible);
          } else {
            // 无过滤时，只有展开的节点才显示子节点
            walk(node.children, depth + 1, visible && expanded);
          }
        }
      }
    };

    walk(this.components, 0, true);
  }

  /**
   * 获取可见节点列表
   */
  private getVisibleNodes(): FlatNode[] {
    return this.flatNodes.filter((n) => n.visible);
  }

  /**
   * 渲染容器结构
   */
  private renderContainer(): void {
    this.container.innerHTML = '';

    // 外层容器
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position: relative; overflow: hidden;';

    // 滚动容器
    this.scrollContainer = document.createElement('div');
    this.scrollContainer.style.cssText = `overflow-y: auto; height: ${this.visibleHeight}px; position: relative;`;
    this.scrollContainer.addEventListener('scroll', this.boundScrollHandler);

    // 内容容器（撑高，使滚动条正确）
    this.contentContainer = document.createElement('div');
    this.contentContainer.style.cssText = 'position: relative; width: 100%;';

    // 视口容器（绝对定位，只包含可见节点）
    this.viewportContainer = document.createElement('div');
    this.viewportContainer.style.cssText = 'position: absolute; top: 0; left: 0; right: 0;';

    this.contentContainer.appendChild(this.viewportContainer);
    this.scrollContainer.appendChild(this.contentContainer);
    wrapper.appendChild(this.scrollContainer);
    this.container.appendChild(wrapper);
  }

  /**
   * 渲染节点
   */
  private renderNodes(): void {
    if (!this.contentContainer || !this.viewportContainer || this.destroyed) return;

    const visibleNodes = this.getVisibleNodes();
    const totalHeight = visibleNodes.length * this.nodeHeight;

    // 设置内容容器高度
    this.contentContainer.style.height = `${totalHeight}px`;

    // 计算可见范围
    const startIndex = Math.floor(this.scrollTop / this.nodeHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.visibleHeight / this.nodeHeight) + 1,
      visibleNodes.length
    );

    // 清空视口
    this.viewportContainer.innerHTML = '';

    // 渲染可见节点
    for (let i = startIndex; i < endIndex; i++) {
      const flatNode = visibleNodes[i];
      const row = this.createNodeElement(flatNode, i);
      this.viewportContainer.appendChild(row);
    }
  }

  /**
   * 创建单个节点 DOM 元素
   */
  private createNodeElement(flatNode: FlatNode, visibleIndex: number): HTMLElement {
    const row = document.createElement('div');
    const isSelected = flatNode.node.id === this.selectedId;
    const isActive = flatNode.node.active;
    const hasChildren = flatNode.node.children && flatNode.node.children.length > 0;

    row.style.cssText = `
      position: absolute;
      top: ${visibleIndex * this.nodeHeight}px;
      left: 0;
      right: 0;
      height: ${this.nodeHeight}px;
      line-height: ${this.nodeHeight}px;
      padding-left: ${flatNode.depth * this.indentWidth + 8}px;
      cursor: pointer;
      font-family: monospace;
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      box-sizing: border-box;
      background: ${isSelected ? '#313244' : 'transparent'};
      color: ${isActive ? '#89b4fa' : '#cdd6f4'};
      border-bottom: 1px solid #1e1e2e;
    `;

    // 展开/折叠箭头
    const arrow = document.createElement('span');
    arrow.style.cssText = 'display: inline-block; width: 14px; text-align: center; margin-right: 4px; font-size: 10px; color: #585b70;';
    if (hasChildren) {
      arrow.textContent = flatNode.expanded ? '\u25BC' : '\u25B6';
    } else {
      arrow.textContent = '\u00B7';
    }
    row.appendChild(arrow);

    // 组件名称
    const nameSpan = document.createElement('span');
    nameSpan.textContent = flatNode.node.name;
    nameSpan.style.cssText = 'font-weight: bold;';
    row.appendChild(nameSpan);

    // 状态摘要
    if (flatNode.node.stateSummary) {
      const stateSpan = document.createElement('span');
      stateSpan.textContent = ` ${flatNode.node.stateSummary}`;
      stateSpan.style.cssText = 'color: #a6adc8; font-size: 10px; margin-left: 6px;';
      row.appendChild(stateSpan);
    }

    // props 数量
    if (flatNode.node.propsCount !== undefined && flatNode.node.propsCount > 0) {
      const propsSpan = document.createElement('span');
      propsSpan.textContent = ` [${flatNode.node.propsCount} props]`;
      propsSpan.style.cssText = 'color: #585b70; font-size: 10px; margin-left: 4px;';
      row.appendChild(propsSpan);
    }

    // 点击事件
    const capturedNode = flatNode.node;
    const capturedId = capturedNode.id;
    row.addEventListener('click', () => {
      // 展开/折叠
      if (hasChildren) {
        const isExpanded = this.expandedMap.get(capturedId) ?? false;
        this.expandedMap.set(capturedId, !isExpanded);
        this.flatten();
        this.renderNodes();
      }

      // 选中
      this.selectedId = capturedId;

      // 回调
      if (this.onNodeClick) {
        this.onNodeClick(capturedNode);
      }
    });

    return row;
  }

  /**
   * 滚动事件处理
   */
  private handleScroll(e: Event): void {
    if (this.destroyed) return;
    const target = e.target as HTMLElement;
    this.scrollTop = target.scrollTop;
    this.renderNodes();
  }

  // ============================================================
  // 调试/测试方法
  // ============================================================

  /**
   * 获取扁平化节点列表（用于测试）
   */
  getFlatNodes(): FlatNode[] {
    return [...this.flatNodes];
  }

  /**
   * 获取可见节点数量（用于测试）
   */
  getVisibleNodeCount(): number {
    return this.getVisibleNodes().length;
  }

  /**
   * 获取总节点数量（包含不可见，用于测试）
   */
  getTotalNodeCount(): number {
    return this.flatNodes.length;
  }
}
