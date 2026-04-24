/**
 * Lyt.js DevTools — 事件面板
 *
 * 独立的事件检查器，捕获和展示组件事件（emit 调用）。
 * 支持过滤、暂停/恢复、环形缓冲区、导出 JSON 等功能。
 *
 * 纯原生零依赖实现。
 */

// ============================================================
// 类型定义
// ============================================================

/** 捕获的事件 */
export interface CapturedEvent {
  /** 事件名称 */
  name: string;
  /** 事件载荷 */
  payload: any;
  /** 来源组件 */
  sourceComponent?: string;
  /** 捕获时间戳 */
  timestamp: number;
  /** 事件序号 */
  index: number;
}

/** 事件面板配置 */
export interface EventPanelConfig {
  /** 最大缓冲区大小（环形缓冲区），默认 200 */
  maxBuffer?: number;
  /** 是否自动滚动到最新事件，默认 true */
  autoScroll?: boolean;
  /** 面板标题，默认 "事件面板" */
  title?: string;
}

// ============================================================
// EventPanel 类
// ============================================================

/**
 * 事件面板
 *
 * 捕获和展示组件事件，支持过滤、暂停/恢复、环形缓冲区和导出。
 */
export class EventPanel {
  /** 事件缓冲区 */
  private buffer: CapturedEvent[] = [];
  /** 最大缓冲区大小 */
  private maxBuffer: number;
  /** 是否自动滚动 */
  private autoScroll: boolean;
  /** 面板标题 */
  private title: string;
  /** 是否暂停 */
  private _paused: boolean = false;
  /** 过滤模式 */
  private filterPattern: string = '';
  /** 事件计数器（单调递增） */
  private counter: number = 0;
  /** 环形缓冲区写入位置 */
  private writeIndex: number = 0;
  /** 缓冲区是否已满 */
  private bufferFull: boolean = false;
  /** DOM 根元素 */
  private element: HTMLElement | null = null;

  constructor(config?: EventPanelConfig) {
    this.maxBuffer = config?.maxBuffer ?? 200;
    this.autoScroll = config?.autoScroll ?? true;
    this.title = config?.title ?? '事件面板';
  }

  // ============================================================
  // 核心 API
  // ============================================================

  /**
   * 捕获一个事件
   *
   * @param name - 事件名称
   * @param payload - 事件载荷
   * @param sourceComponent - 来源组件名称（可选）
   */
  captureEvent(name: string, payload: any, sourceComponent?: string): void {
    if (this._paused) return;

    const event: CapturedEvent = {
      name,
      payload,
      sourceComponent,
      timestamp: Date.now(),
      index: this.counter++,
    };

    // 环形缓冲区写入
    if (this.bufferFull) {
      this.buffer[this.writeIndex] = event;
    } else {
      this.buffer.push(event);
      if (this.buffer.length >= this.maxBuffer) {
        this.bufferFull = true;
      }
    }
    this.writeIndex = (this.writeIndex + 1) % this.maxBuffer;
  }

  /**
   * 获取所有事件（经过过滤）
   *
   * @returns 过滤后的事件数组
   */
  getEvents(): CapturedEvent[] {
    let events = this.bufferFull
      ? this.buffer.slice(this.writeIndex).concat(this.buffer.slice(0, this.writeIndex))
      : [...this.buffer];

    if (this.filterPattern) {
      const pattern = this.filterPattern.toLowerCase();
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(pattern) ||
          (e.sourceComponent && e.sourceComponent.toLowerCase().includes(pattern))
      );
    }

    return events;
  }

  /**
   * 获取所有事件（不经过过滤）
   *
   * @returns 全部事件数组
   */
  getAllEvents(): CapturedEvent[] {
    return this.bufferFull
      ? this.buffer.slice(this.writeIndex).concat(this.buffer.slice(0, this.writeIndex))
      : [...this.buffer];
  }

  /**
   * 清除所有事件
   */
  clear(): void {
    this.buffer = [];
    this.writeIndex = 0;
    this.bufferFull = false;
  }

  /**
   * 设置过滤模式
   *
   * @param pattern - 过滤字符串
   */
  setFilter(pattern: string): void {
    this.filterPattern = pattern;
  }

  /**
   * 获取当前过滤模式
   */
  getFilter(): string {
    return this.filterPattern;
  }

  /**
   * 暂停事件捕获
   */
  pause(): void {
    this._paused = true;
  }

  /**
   * 恢复事件捕获
   */
  resume(): void {
    this._paused = false;
  }

  /**
   * 是否暂停中
   */
  isPaused(): boolean {
    return this._paused;
  }

  /**
   * 导出事件为 JSON 字符串
   *
   * @returns JSON 字符串
   */
  exportJSON(): string {
    const events = this.getEvents();
    return JSON.stringify(events, null, 2);
  }

  /**
   * 获取缓冲区中的事件总数
   */
  getCount(): number {
    return this.bufferFull ? this.maxBuffer : this.buffer.length;
  }

  /**
   * 获取最大缓冲区大小
   */
  getMaxBuffer(): number {
    return this.maxBuffer;
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
    root.className = 'lyt-event-panel';
    root.style.cssText = 'font-family: monospace; font-size: 12px; color: #cdd6f4;';

    // 标题栏
    const header = document.createElement('div');
    header.style.cssText =
      'display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #1e1e2e; border-bottom: 1px solid #313244;';

    const titleEl = document.createElement('span');
    titleEl.textContent = this.title;
    titleEl.style.cssText = 'font-weight: bold; font-size: 13px;';
    header.appendChild(titleEl);

    // 按钮区域
    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display: flex; gap: 4px;';

    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = this._paused ? '恢复' : '暂停';
    pauseBtn.style.cssText =
      'padding: 2px 8px; border: 1px solid #45475a; background: #313244; color: #cdd6f4; cursor: pointer; border-radius: 3px; font-size: 11px;';
    pauseBtn.addEventListener('click', () => {
      if (this._paused) {
        this.resume();
      } else {
        this.pause();
      }
      pauseBtn.textContent = this._paused ? '恢复' : '暂停';
      this.render();
    });
    btnGroup.appendChild(pauseBtn);

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清除';
    clearBtn.style.cssText =
      'padding: 2px 8px; border: 1px solid #45475a; background: #313244; color: #cdd6f4; cursor: pointer; border-radius: 3px; font-size: 11px;';
    clearBtn.addEventListener('click', () => {
      this.clear();
      this.render();
    });
    btnGroup.appendChild(clearBtn);

    const exportBtn = document.createElement('button');
    exportBtn.textContent = '导出';
    exportBtn.style.cssText =
      'padding: 2px 8px; border: 1px solid #45475a; background: #313244; color: #cdd6f4; cursor: pointer; border-radius: 3px; font-size: 11px;';
    exportBtn.addEventListener('click', () => {
      const json = this.exportJSON();
      // 创建下载
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lyt-events-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
    btnGroup.appendChild(exportBtn);

    header.appendChild(btnGroup);
    root.appendChild(header);

    // 过滤栏
    const filterBar = document.createElement('div');
    filterBar.style.cssText = 'padding: 6px 12px; background: #181825; border-bottom: 1px solid #313244;';

    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = '过滤事件名称...';
    filterInput.value = this.filterPattern;
    filterInput.style.cssText =
      'width: 100%; padding: 4px 8px; border: 1px solid #45475a; background: #1e1e2e; color: #cdd6f4; border-radius: 3px; font-size: 11px; box-sizing: border-box;';
    filterInput.addEventListener('input', () => {
      this.setFilter(filterInput.value);
      this.render();
    });
    filterBar.appendChild(filterInput);
    root.appendChild(filterBar);

    // 事件列表
    const listContainer = document.createElement('div');
    listContainer.style.cssText = 'max-height: 400px; overflow-y: auto; padding: 4px 0;';

    const events = this.getEvents();
    if (events.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding: 20px; text-align: center; color: #585b70;';
      empty.textContent = '暂无事件';
      listContainer.appendChild(empty);
    } else {
      for (const event of events) {
        const row = document.createElement('div');
        row.style.cssText =
          'padding: 4px 12px; border-bottom: 1px solid #1e1e2e; cursor: pointer;';

        const time = new Date(event.timestamp);
        const timeStr = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}:${String(time.getSeconds()).padStart(2, '0')}.${String(time.getMilliseconds()).padStart(3, '0')}`;

        let payloadStr = '';
        try {
          payloadStr = JSON.stringify(event.payload);
          if (payloadStr.length > 50) payloadStr = payloadStr.slice(0, 50) + '...';
        } catch {
          payloadStr = String(event.payload);
        }

        const sourceStr = event.sourceComponent ? ` [${event.sourceComponent}]` : '';

        row.textContent = `${timeStr} ${event.name}${sourceStr} ${payloadStr}`;
        listContainer.appendChild(row);
      }
    }

    root.appendChild(listContainer);

    // 自动滚动
    if (this.autoScroll) {
      listContainer.scrollTop = listContainer.scrollHeight;
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
    this.clear();
  }
}
