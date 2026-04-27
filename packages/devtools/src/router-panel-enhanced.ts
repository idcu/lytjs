/**
 * Lyt.js DevTools — 路由面板（增强版）
 *
 * 独立的路由检查器，展示当前路由信息、导航历史和路由匹配信息。
 * 支持历史记录查看、详情展示等功能。
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 路由位置信息 */
export interface RouteLocation {
  /** 路由路径 */
  path: string;
  /** 路由参数 */
  params?: Record<string, string>;
  /** 查询参数 */
  query?: Record<string, string>;
  /** 哈希 */
  hash?: string;
  /** 路由名称 */
  name?: string;
  /** 是否完全匹配 */
  matched?: boolean;
}

/** 路由导航记录 */
export interface RouteNavigation {
  /** 导航序号 */
  index: number;
  /** 目标路由 */
  to: RouteLocation;
  /** 来源路由 */
  from: RouteLocation;
  /** 导航时间戳 */
  timestamp: number;
  /** 导航类型 */
  type: 'push' | 'replace' | 'pop';
}

/** 路由面板配置 */
export interface RouterPanelConfig {
  /** 最大历史记录条数，默认 50 */
  maxHistory?: number;
  /** 面板标题，默认 "路由面板" */
  title?: string;
}

// ============================================================
// RouterPanel 类
// ============================================================

/**
 * 路由面板
 *
 * 展示当前路由信息、导航历史和路由匹配信息。
 */
export class RouterPanel {
  /** 当前路由 */
  private currentRoute: RouteLocation | null = null;
  /** 导航历史 */
  private history: RouteNavigation[] = [];
  /** 最大历史记录条数 */
  private maxHistory: number;
  /** 面板标题 */
  private title: string;
  /** 导航计数器 */
  private navCounter: number = 0;
  /** DOM 根元素 */
  private element: HTMLElement | null = null;
  /** 选中的历史条目索引 */
  private selectedHistoryIndex: number = -1;

  constructor(config?: RouterPanelConfig) {
    this.maxHistory = config?.maxHistory ?? 50;
    this.title = config?.title ?? '路由面板';
  }

  // ============================================================
  // 核心 API
  // ============================================================

  /**
   * 路由变化回调
   *
   * @param to - 目标路由
   * @param from - 来源路由
   * @param type - 导航类型
   */
  onRouteChange(to: RouteLocation, from: RouteLocation, type?: 'push' | 'replace' | 'pop'): void {
    const navigation: RouteNavigation = {
      index: this.navCounter++,
      to: { ...to },
      from: { ...from },
      timestamp: Date.now(),
      type: type ?? 'push',
    };

    this.history.push(navigation);

    // 限制历史长度
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(this.history.length - this.maxHistory);
    }

    this.currentRoute = { ...to };
    this.selectedHistoryIndex = -1;
  }

  /**
   * 获取当前路由
   *
   * @returns 当前路由信息，如果没有则为 null
   */
  getCurrentRoute(): RouteLocation | null {
    return this.currentRoute ? { ...this.currentRoute } : null;
  }

  /**
   * 获取导航历史
   *
   * @returns 导航历史数组
   */
  getHistory(): RouteNavigation[] {
    return this.history.map((nav) => ({
      ...nav,
      to: { ...nav.to },
      from: { ...nav.from },
    }));
  }

  /**
   * 清除导航历史
   */
  clearHistory(): void {
    this.history = [];
    this.navCounter = 0;
    this.selectedHistoryIndex = -1;
  }

  /**
   * 获取历史记录条数
   */
  getHistoryCount(): number {
    return this.history.length;
  }

  /**
   * 获取最大历史记录条数
   */
  getMaxHistory(): number {
    return this.maxHistory;
  }

  /**
   * 选中某条历史记录
   *
   * @param index - 历史记录在 getHistory() 返回数组中的索引
   */
  selectHistoryEntry(index: number): void {
    if (index >= 0 && index < this.history.length) {
      this.selectedHistoryIndex = index;
    }
  }

  /**
   * 获取选中的历史记录
   */
  getSelectedHistoryEntry(): RouteNavigation | null {
    if (this.selectedHistoryIndex >= 0 && this.selectedHistoryIndex < this.history.length) {
      const nav = this.history[this.selectedHistoryIndex];
      return {
        ...nav,
        to: { ...nav.to },
        from: { ...nav.from },
      };
    }
    return null;
  }

  // ============================================================
  // 渲染
  // ============================================================

  /**
   * 渲染面板 DOM 元素
   *
   * @returns 面板 DOM 元素
   */
  render(): HTMLElement {
    if (this.element) {
      this.element.remove();
    }

    const root = document.createElement('div');
    root.className = 'lyt-router-panel';
    root.style.cssText = 'font-family: monospace; font-size: 12px; color: #cdd6f4;';

    // 标题栏
    const header = document.createElement('div');
    header.style.cssText =
      'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #1e1e2e; border-bottom: 1px solid #313244;';

    const titleEl = document.createElement('span');
    titleEl.textContent = this.title;
    titleEl.style.cssText = 'font-weight: bold; font-size: 13px;';
    header.appendChild(titleEl);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清除历史';
    clearBtn.style.cssText =
      'padding: 2px 8px; border: 1px solid #45475a; background: #313244; color: #cdd6f4; cursor: pointer; border-radius: 3px; font-size: 11px;';
    clearBtn.addEventListener('click', () => {
      this.clearHistory();
      this.render();
    });
    header.appendChild(clearBtn);

    root.appendChild(header);

    // 当前路由信息
    const currentSection = document.createElement('div');
    currentSection.style.cssText = 'padding: 8px 12px; background: #181825; border-bottom: 1px solid #313244;';

    const currentLabel = document.createElement('div');
    currentLabel.style.cssText = 'color: #a6adc8; font-size: 11px; margin-bottom: 4px;';
    currentLabel.textContent = '当前路由';
    currentSection.appendChild(currentLabel);

    if (this.currentRoute) {
      const pathEl = document.createElement('div');
      pathEl.style.cssText = 'font-weight: bold; font-size: 14px; color: #89b4fa;';
      pathEl.textContent = this.currentRoute.path;
      currentSection.appendChild(pathEl);

      if (this.currentRoute.params && Object.keys(this.currentRoute.params).length > 0) {
        const paramsEl = document.createElement('div');
        paramsEl.style.cssText = 'margin-top: 4px; color: #a6e3a1; font-size: 11px;';
        paramsEl.textContent = `params: ${JSON.stringify(this.currentRoute.params)}`;
        currentSection.appendChild(paramsEl);
      }

      if (this.currentRoute.query && Object.keys(this.currentRoute.query).length > 0) {
        const queryEl = document.createElement('div');
        queryEl.style.cssText = 'margin-top: 2px; color: #f9e2af; font-size: 11px;';
        queryEl.textContent = `query: ${JSON.stringify(this.currentRoute.query)}`;
        currentSection.appendChild(queryEl);
      }

      if (this.currentRoute.name) {
        const nameEl = document.createElement('div');
        nameEl.style.cssText = 'margin-top: 2px; color: #cba6f7; font-size: 11px;';
        nameEl.textContent = `name: ${this.currentRoute.name}`;
        currentSection.appendChild(nameEl);
      }
    } else {
      const emptyEl = document.createElement('div');
      emptyEl.style.cssText = 'color: #585b70; font-size: 11px;';
      emptyEl.textContent = '暂无路由信息';
      currentSection.appendChild(emptyEl);
    }

    root.appendChild(currentSection);

    // 导航历史
    const historySection = document.createElement('div');
    historySection.style.cssText = 'padding: 8px 12px; background: #1e1e2e; border-bottom: 1px solid #313244;';

    const historyLabel = document.createElement('div');
    historyLabel.style.cssText = 'color: #a6adc8; font-size: 11px; margin-bottom: 4px;';
    historyLabel.textContent = `导航历史 (${this.history.length})`;
    historySection.appendChild(historyLabel);

    root.appendChild(historySection);

    // 历史列表
    const listContainer = document.createElement('div');
    listContainer.style.cssText = 'max-height: 300px; overflow-y: auto;';

    if (this.history.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 20px; text-align: center; color: #585b70;';
      empty.textContent = '暂无导航记录';
      listContainer.appendChild(empty);
    } else {
      for (let i = this.history.length - 1; i >= 0; i--) {
        const nav = this.history[i];
        const row = document.createElement('div');
        const isSelected = i === this.selectedHistoryIndex;
        row.style.cssText = `padding: 4px 12px; border-bottom: 1px solid #1e1e2e; cursor: pointer;${isSelected ? ' background: #313244;' : ''}`;

        const time = new Date(nav.timestamp);
        const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}`;

        const typeIcon = nav.type === 'pop' ? '<-' : nav.type === 'replace' ? '=' : '>';
        row.textContent = `${timeStr} ${typeIcon} ${nav.from.path} -> ${nav.to.path}`;

        const capturedI = i;
        row.addEventListener('click', () => {
          this.selectHistoryEntry(capturedI);
          this.render();
        });

        listContainer.appendChild(row);
      }
    }

    root.appendChild(listContainer);

    // 选中条目详情
    if (this.selectedHistoryIndex >= 0) {
      const selected = this.history[this.selectedHistoryIndex];
      if (selected) {
        const detailSection = document.createElement('div');
        detailSection.style.cssText = 'padding: 8px 12px; background: #181825; border-top: 1px solid #313244;';

        const detailLabel = document.createElement('div');
        detailLabel.style.cssText = 'color: #a6adc8; font-size: 11px; margin-bottom: 4px;';
        detailLabel.textContent = '导航详情';
        detailSection.appendChild(detailLabel);

        const detailContent = document.createElement('div');
        detailContent.style.cssText = 'font-size: 11px; line-height: 1.6;';

        const fromRoute = selected.from;
        const toRoute = selected.to;

        detailContent.innerHTML = `
          <div><span style="color:#a6adc8;">类型:</span> ${selected.type}</div>
          <div><span style="color:#a6adc8;">来源:</span> ${fromRoute.path}</div>
          ${fromRoute.params ? `<div><span style="color:#a6adc8;">来源参数:</span> ${JSON.stringify(fromRoute.params)}</div>` : ''}
          ${fromRoute.query ? `<div><span style="color:#a6adc8;">来源查询:</span> ${JSON.stringify(fromRoute.query)}</div>` : ''}
          <div><span style="color:#a6adc8;">目标:</span> ${toRoute.path}</div>
          ${toRoute.params ? `<div><span style="color:#a6adc8;">目标参数:</span> ${JSON.stringify(toRoute.params)}</div>` : ''}
          ${toRoute.query ? `<div><span style="color:#a6adc8;">目标查询:</span> ${JSON.stringify(toRoute.query)}</div>` : ''}
          <div><span style="color:#a6adc8;">时间:</span> ${new Date(selected.timestamp).toLocaleString('zh-CN')}</div>
        `;

        detailSection.appendChild(detailContent);
        root.appendChild(detailSection);
      }
    }

    this.element = root;
    return root;
  }

  /**
   * 销毁面板
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.clearHistory();
    this.currentRoute = null;
  }
}
