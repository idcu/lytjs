/**
 * Lyt.js DevTools — 调试面板 UI
 *
 * 创建和管理浮动调试面板，纯 DOM 实现，不依赖任何 UI 框架。
 *
 * 核心功能：
 * - DevToolsPanel 类：创建和管理调试面板
 * - 浮动面板 UI（纯 DOM 创建）
 * - 顶部标签栏：组件树 / 状态 / 事件 / 路由
 * - 内容区域：根据选中标签显示不同内容
 * - 底部状态栏：显示当前选中组件信息
 * - 面板可拖拽（mousedown/mousemove/mouseup）
 * - 面板可折叠/展开
 * - 暗色主题样式（内联 CSS）
 * - 面板大小可调整
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 标签页类型 */
export type TabType = 'components' | 'state' | 'events' | 'router';

/** 标签页配置 */
interface TabConfig {
  /** 标签 ID */
  id: TabType;
  /** 标签显示名称 */
  label: string;
  /** 标签图标（纯文本） */
  icon: string;
}

/** 面板配置 */
export interface PanelConfig {
  /** 面板初始宽度 */
  width?: number;
  /** 面板初始高度 */
  height?: number;
  /** 面板初始 X 位置 */
  x?: number;
  /** 面板初始 Y 位置 */
  y?: number;
  /** 面板最小宽度 */
  minWidth?: number;
  /** 面板最小高度 */
  minHeight?: number;
  /** 面板标题 */
  title?: string;
}

/** 标签页内容渲染器 */
type TabContentRenderer = (container: HTMLElement) => void;

// ============================================================
// 暗色主题 CSS
// ============================================================

/** 面板暗色主题样式 */
const PANEL_STYLES = `
/* === Lyt DevTools 面板基础样式 === */
.lyt-devtools-panel {
  position: fixed;
  z-index: 999999;
  background: #1e1e2e;
  border: 1px solid #313244;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  color: #cdd6f4;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  transition: opacity 0.2s ease;
}

/* === 标题栏 === */
.lyt-devtools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 36px;
  min-height: 36px;
  background: #181825;
  border-bottom: 1px solid #313244;
  cursor: move;
  border-radius: 8px 8px 0 0;
}

.lyt-devtools-title {
  font-size: 13px;
  font-weight: 600;
  color: #cba6f7;
  display: flex;
  align-items: center;
  gap: 6px;
}

.lyt-devtools-title-icon {
  font-size: 14px;
}

.lyt-devtools-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.lyt-devtools-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #a6adc8;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: all 0.15s ease;
}

.lyt-devtools-btn:hover {
  background: #313244;
  color: #cdd6f4;
  border-color: #45475a;
}

.lyt-devtools-btn-close:hover {
  background: #f38ba8;
  color: #1e1e2e;
  border-color: #f38ba8;
}

/* === 标签栏 === */
.lyt-devtools-tabs {
  display: flex;
  background: #181825;
  border-bottom: 1px solid #313244;
  padding: 0 8px;
  min-height: 32px;
}

.lyt-devtools-tab {
  padding: 6px 12px;
  cursor: pointer;
  color: #a6adc8;
  border-bottom: 2px solid transparent;
  transition: all 0.15s ease;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.lyt-devtools-tab:hover {
  color: #cdd6f4;
  background: #1e1e2e;
}

.lyt-devtools-tab.active {
  color: #cba6f7;
  border-bottom-color: #cba6f7;
}

.lyt-devtools-tab-icon {
  font-size: 12px;
}

/* === 内容区域 === */
.lyt-devtools-content {
  flex: 1;
  overflow: auto;
  padding: 8px;
  background: #1e1e2e;
}

.lyt-devtools-content::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.lyt-devtools-content::-webkit-scrollbar-track {
  background: transparent;
}

.lyt-devtools-content::-webkit-scrollbar-thumb {
  background: #45475a;
  border-radius: 3px;
}

.lyt-devtools-content::-webkit-scrollbar-thumb:hover {
  background: #585b70;
}

/* === 底部状态栏 === */
.lyt-devtools-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 24px;
  min-height: 24px;
  background: #181825;
  border-top: 1px solid #313244;
  font-size: 11px;
  color: #6c7086;
  border-radius: 0 0 8px 8px;
}

.lyt-devtools-status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lyt-devtools-status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lyt-devtools-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a6e3a1;
}

.lyt-devtools-status-dot.disconnected {
  background: #f38ba8;
}

/* === 调整大小手柄 === */
.lyt-devtools-resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  z-index: 10;
}

.lyt-devtools-resize-handle::after {
  content: '';
  position: absolute;
  bottom: 3px;
  right: 3px;
  width: 8px;
  height: 8px;
  border-right: 2px solid #585b70;
  border-bottom: 2px solid #585b70;
}

/* === 折叠状态 === */
.lyt-devtools-panel.collapsed .lyt-devtools-tabs,
.lyt-devtools-panel.collapsed .lyt-devtools-content,
.lyt-devtools-panel.collapsed .lyt-devtools-statusbar,
.lyt-devtools-panel.collapsed .lyt-devtools-resize-handle {
  display: none;
}

.lyt-devtools-panel.collapsed {
  width: auto !important;
  height: auto !important;
  border-radius: 8px;
}

/* === 通用组件样式 === */
.lyt-devtools-search {
  width: 100%;
  padding: 6px 8px;
  background: #181825;
  border: 1px solid #313244;
  border-radius: 4px;
  color: #cdd6f4;
  font-size: 12px;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  margin-bottom: 8px;
}

.lyt-devtools-search:focus {
  border-color: #cba6f7;
}

.lyt-devtools-search::placeholder {
  color: #585b70;
}

.lyt-devtools-empty {
  text-align: center;
  color: #585b70;
  padding: 24px;
  font-style: italic;
}

.lyt-devtools-badge {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}

.lyt-devtools-badge-blue {
  background: #89b4fa;
  color: #1e1e2e;
}

.lyt-devtools-badge-green {
  background: #a6e3a1;
  color: #1e1e2e;
}

.lyt-devtools-badge-yellow {
  background: #f9e2af;
  color: #1e1e2e;
}

.lyt-devtools-badge-red {
  background: #f38ba8;
  color: #1e1e2e;
}

/* === 高亮动画 === */
@keyframes lyt-devtools-highlight {
  0% { background-color: rgba(203, 166, 247, 0.3); }
  100% { background-color: transparent; }
}

.lyt-devtools-highlight {
  animation: lyt-devtools-highlight 1s ease-out;
}
`;

// ============================================================
// 标签页配置
// ============================================================

const TABS: TabConfig[] = [
  { id: 'components', label: '组件树', icon: '\u{1F333}' },
  { id: 'state', label: '状态', icon: '\u{1F4CA}' },
  { id: 'events', label: '事件', icon: '\u{26A1}' },
  { id: 'router', label: '路由', icon: '\u{1F517}' },
];

// ============================================================
// DevToolsPanel 类
// ============================================================

/**
 * DevTools 调试面板
 *
 * 创建和管理浮动调试面板，支持拖拽、折叠、大小调整等功能。
 */
export class DevToolsPanel {
  /** 面板根 DOM 元素 */
  private panelEl: HTMLDivElement;
  /** 标题栏元素 */
  private headerEl: HTMLDivElement;
  /** 标签栏元素 */
  private tabsEl: HTMLDivElement;
  /** 内容区域元素 */
  private contentEl: HTMLDivElement;
  /** 底部状态栏元素 */
  private statusbarEl: HTMLDivElement;
  /** 当前激活的标签 */
  private activeTab: TabType = 'components';
  /** 标签页内容渲染器映射 */
  private tabRenderers = new Map<TabType, TabContentRenderer>();
  /** 面板是否可见 */
  private _visible: boolean = true;
  /** 面板是否折叠 */
  private _collapsed: boolean = false;
  /** 面板配置 */
  private config: Required<PanelConfig>;
  /** 拖拽状态 */
  private dragState: {
    isDragging: boolean;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  };
  /** 调整大小状态 */
  private resizeState: {
    isResizing: boolean;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  };
  /** 样式元素引用 */
  private styleEl: HTMLStyleElement;
  /** 状态栏左侧文本 */
  private statusLeftEl: HTMLSpanElement;
  /** 状态栏右侧文本 */
  private statusRightEl: HTMLSpanElement;
  /** 高亮覆盖层 */
  private highlightOverlay: HTMLDivElement | null = null;

  constructor(config?: PanelConfig) {
    // 合并默认配置
    this.config = {
      width: config?.width ?? 420,
      height: config?.height ?? 560,
      x: config?.x ?? (window.innerWidth - (config?.width ?? 420) - 20),
      y: config?.y ?? 60,
      minWidth: config?.minWidth ?? 320,
      minHeight: config?.minHeight ?? 200,
      title: config?.title ?? 'Lyt DevTools',
    };

    // 初始化拖拽和调整大小状态
    this.dragState = { isDragging: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
    this.resizeState = { isResizing: false, startX: 0, startY: 0, startWidth: 0, startHeight: 0 };

    // 注入样式
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = PANEL_STYLES;
    document.head.appendChild(this.styleEl);

    // 创建面板 DOM
    this.panelEl = this.createPanelElement();
    this.headerEl = this.panelEl.querySelector('.lyt-devtools-header') as HTMLDivElement;
    this.tabsEl = this.panelEl.querySelector('.lyt-devtools-tabs') as HTMLDivElement;
    this.contentEl = this.panelEl.querySelector('.lyt-devtools-content') as HTMLDivElement;
    this.statusbarEl = this.panelEl.querySelector('.lyt-devtools-statusbar') as HTMLDivElement;
    this.statusLeftEl = this.statusbarEl.querySelector('.lyt-devtools-status-left') as HTMLSpanElement;
    this.statusRightEl = this.statusbarEl.querySelector('.lyt-devtools-status-right') as HTMLSpanElement;

    // 添加到文档
    document.body.appendChild(this.panelEl);

    // 绑定事件
    this.bindDragEvents();
    this.bindResizeEvents();
    this.bindKeyboardEvents();

    // 监听窗口大小变化
    window.addEventListener('resize', this.onWindowResize);
  }

  // ============================================================
  // DOM 创建
  // ============================================================

  /**
   * 创建面板 DOM 结构
   */
  private createPanelElement(): HTMLDivElement {
    const panel = document.createElement('div');
    panel.className = 'lyt-devtools-panel';
    panel.style.width = `${this.config.width}px`;
    panel.style.height = `${this.config.height}px`;
    panel.style.left = `${this.config.x}px`;
    panel.style.top = `${this.config.y}px`;

    // 标题栏
    const header = document.createElement('div');
    header.className = 'lyt-devtools-header';

    const title = document.createElement('span');
    title.className = 'lyt-devtools-title';
    title.innerHTML = `<span class="lyt-devtools-title-icon">\u{1F50D}</span>${this.config.title}`;

    const actions = document.createElement('div');
    actions.className = 'lyt-devtools-header-actions';

    // 折叠按钮
    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'lyt-devtools-btn';
    collapseBtn.textContent = '\u{2014}';
    collapseBtn.title = '折叠/展开';
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCollapse();
    });

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lyt-devtools-btn lyt-devtools-btn-close';
    closeBtn.textContent = '\u2715';
    closeBtn.title = '关闭面板';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    actions.appendChild(collapseBtn);
    actions.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(actions);

    // 标签栏
    const tabs = document.createElement('div');
    tabs.className = 'lyt-devtools-tabs';
    for (const tab of TABS) {
      const tabEl = document.createElement('div');
      tabEl.className = `lyt-devtools-tab${tab.id === this.activeTab ? ' active' : ''}`;
      tabEl.dataset.tab = tab.id;
      tabEl.innerHTML = `<span class="lyt-devtools-tab-icon">${tab.icon}</span>${tab.label}`;
      tabEl.addEventListener('click', () => this.switchTab(tab.id));
      tabs.appendChild(tabEl);
    }

    // 内容区域
    const content = document.createElement('div');
    content.className = 'lyt-devtools-content';

    // 底部状态栏
    const statusbar = document.createElement('div');
    statusbar.className = 'lyt-devtools-statusbar';

    const statusLeft = document.createElement('span');
    statusLeft.className = 'lyt-devtools-status-left';
    statusLeft.innerHTML = '<span class="lyt-devtools-status-dot"></span><span>就绪</span>';

    const statusRight = document.createElement('span');
    statusRight.className = 'lyt-devtools-status-right';
    statusRight.textContent = 'v0.0.1';

    statusbar.appendChild(statusLeft);
    statusbar.appendChild(statusRight);

    // 调整大小手柄
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'lyt-devtools-resize-handle';

    // 组装
    panel.appendChild(header);
    panel.appendChild(tabs);
    panel.appendChild(content);
    panel.appendChild(statusbar);
    panel.appendChild(resizeHandle);

    return panel;
  }

  // ============================================================
  // 标签页管理
  // ============================================================

  /**
   * 切换标签页
   */
  switchTab(tabId: TabType): void {
    if (this.activeTab === tabId) return;

    this.activeTab = tabId;

    // 更新标签栏样式
    const tabEls = this.tabsEl.querySelectorAll('.lyt-devtools-tab');
    tabEls.forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tabId);
    });

    // 重新渲染内容
    this.renderContent();
  }

  /**
   * 注册标签页内容渲染器
   */
  registerTabRenderer(tabId: TabType, renderer: TabContentRenderer): void {
    this.tabRenderers.set(tabId, renderer);

    // 如果当前标签就是该标签，立即渲染
    if (this.activeTab === tabId) {
      this.renderContent();
    }
  }

  /**
   * 渲染当前标签页内容
   */
  renderContent(): void {
    // 清空内容区域
    this.contentEl.innerHTML = '';

    // 获取渲染器
    const renderer = this.tabRenderers.get(this.activeTab);
    if (renderer) {
      renderer(this.contentEl);
    } else {
      this.contentEl.innerHTML = '<div class="lyt-devtools-empty">暂无内容</div>';
    }
  }

  /**
   * 获取当前激活的标签页 ID
   */
  getActiveTab(): TabType {
    return this.activeTab;
  }

  /**
   * 获取内容区域 DOM 元素
   */
  getContentElement(): HTMLElement {
    return this.contentEl;
  }

  // ============================================================
  // 面板显示/隐藏
  // ============================================================

  /**
   * 显示面板
   */
  show(): void {
    this._visible = true;
    this.panelEl.style.display = 'flex';
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    this._visible = false;
    this.panelEl.style.display = 'none';
  }

  /**
   * 切换面板显示状态
   */
  toggle(): void {
    if (this._visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 面板是否可见
   */
  isVisible(): boolean {
    return this._visible;
  }

  // ============================================================
  // 面板折叠/展开
  // ============================================================

  /**
   * 切换折叠状态
   */
  toggleCollapse(): void {
    this._collapsed = !this._collapsed;
    this.panelEl.classList.toggle('collapsed', this._collapsed);
  }

  /**
   * 是否折叠
   */
  isCollapsed(): boolean {
    return this._collapsed;
  }

  // ============================================================
  // 拖拽功能
  // ============================================================

  /**
   * 绑定拖拽事件
   */
  private bindDragEvents(): void {
    // 鼠标按下开始拖拽
    this.headerEl.addEventListener('mousedown', (e: MouseEvent) => {
      // 不拖拽按钮
      if ((e.target as HTMLElement).closest('.lyt-devtools-btn')) return;

      this.dragState.isDragging = true;
      this.dragState.startX = e.clientX;
      this.dragState.startY = e.clientY;
      this.dragState.startLeft = this.panelEl.offsetLeft;
      this.dragState.startTop = this.panelEl.offsetTop;

      e.preventDefault();
    });

    // 鼠标移动
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.dragState.isDragging) return;

      const dx = e.clientX - this.dragState.startX;
      const dy = e.clientY - this.dragState.startY;

      let newLeft = this.dragState.startLeft + dx;
      let newTop = this.dragState.startTop + dy;

      // 限制在窗口范围内
      newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 100));
      newTop = Math.max(0, Math.min(newTop, window.innerHeight - 36));

      this.panelEl.style.left = `${newLeft}px`;
      this.panelEl.style.top = `${newTop}px`;
    });

    // 鼠标释放停止拖拽
    document.addEventListener('mouseup', () => {
      this.dragState.isDragging = false;
    });
  }

  // ============================================================
  // 调整大小功能
  // ============================================================

  /**
   * 绑定调整大小事件
   */
  private bindResizeEvents(): void {
    const resizeHandle = this.panelEl.querySelector('.lyt-devtools-resize-handle') as HTMLElement;

    resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
      this.resizeState.isResizing = true;
      this.resizeState.startX = e.clientX;
      this.resizeState.startY = e.clientY;
      this.resizeState.startWidth = this.panelEl.offsetWidth;
      this.resizeState.startHeight = this.panelEl.offsetHeight;

      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.resizeState.isResizing) return;

      const dx = e.clientX - this.resizeState.startX;
      const dy = e.clientY - this.resizeState.startY;

      const newWidth = Math.max(
        this.config.minWidth,
        this.resizeState.startWidth + dx
      );
      const newHeight = Math.max(
        this.config.minHeight,
        this.resizeState.startHeight + dy
      );

      this.panelEl.style.width = `${newWidth}px`;
      this.panelEl.style.height = `${newHeight}px`;
    });

    document.addEventListener('mouseup', () => {
      this.resizeState.isResizing = false;
    });
  }

  // ============================================================
  // 键盘快捷键
  // ============================================================

  /**
   * 绑定键盘事件
   */
  private bindKeyboardEvents(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ctrl+Shift+D 切换面板显示
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggle();
      }

      // Escape 关闭面板
      if (e.key === 'Escape' && this._visible) {
        this.hide();
      }
    });
  }

  // ============================================================
  // 窗口大小变化处理
  // ============================================================

  /**
   * 窗口大小变化时调整面板位置
   */
  private onWindowResize = (): void => {
    const panelRect = this.panelEl.getBoundingClientRect();
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 36;

    if (panelRect.left > maxX) {
      this.panelEl.style.left = `${maxX}px`;
    }
    if (panelRect.top > maxY) {
      this.panelEl.style.top = `${maxY}px`;
    }
  };

  // ============================================================
  // 状态栏更新
  // ============================================================

  /**
   * 更新状态栏左侧文本
   */
  setStatusLeft(html: string): void {
    this.statusLeftEl.innerHTML = html;
  }

  /**
   * 更新状态栏右侧文本
   */
  setStatusRight(text: string): void {
    this.statusRightEl.textContent = text;
  }

  /**
   * 设置连接状态
   */
  setConnected(connected: boolean): void {
    const dot = this.statusLeftEl.querySelector('.lyt-devtools-status-dot');
    if (dot) {
      dot.classList.toggle('disconnected', !connected);
    }
  }

  // ============================================================
  // 组件高亮
  // ============================================================

  /**
   * 高亮指定 DOM 元素
   */
  highlightElement(el: Element | null): void {
    // 移除之前的高亮
    this.clearHighlight();

    if (!el) return;

    // 创建高亮覆盖层
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.style.cssText = `
      position: fixed;
      z-index: 999998;
      pointer-events: none;
      border: 2px solid #cba6f7;
      background: rgba(203, 166, 247, 0.1);
      border-radius: 2px;
      transition: all 0.15s ease;
    `;

    const rect = el.getBoundingClientRect();
    this.highlightOverlay.style.left = `${rect.left}px`;
    this.highlightOverlay.style.top = `${rect.top}px`;
    this.highlightOverlay.style.width = `${rect.width}px`;
    this.highlightOverlay.style.height = `${rect.height}px`;

    document.body.appendChild(this.highlightOverlay);
  }

  /**
   * 清除高亮
   */
  clearHighlight(): void {
    if (this.highlightOverlay) {
      this.highlightOverlay.remove();
      this.highlightOverlay = null;
    }
  }

  // ============================================================
  // 销毁
  // ============================================================

  /**
   * 销毁面板，清理所有 DOM 和事件
   */
  destroy(): void {
    // 移除样式
    this.styleEl.remove();

    // 移除面板
    this.panelEl.remove();

    // 清除高亮
    this.clearHighlight();

    // 移除事件监听
    window.removeEventListener('resize', this.onWindowResize);

    // 清空渲染器
    this.tabRenderers.clear();
  }
}
