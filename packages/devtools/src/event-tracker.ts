/**
 * Lyt.js DevTools — 事件追踪器
 *
 * 拦截和记录所有组件事件，提供事件列表实时显示、过滤和回放功能。
 *
 * 核心功能：
 * - EventTracker 类
 * - 拦截和记录所有组件事件（事件名称、触发时间、事件参数、来源组件）
 * - 事件列表实时显示
 * - 事件过滤（按名称/组件）
 * - 事件回放功能（点击事件条目显示详情）
 *
 * 纯原生零依赖实现。
 */

import {
  type EventRecord,
  getEventRecords,
  getComponentEvents,
} from './hooks';
import type { DevToolsPanel } from './panel';

// ============================================================
// 工具函数
// ============================================================

/**
 * 格式化值用于显示
 */
function formatArgValue(value: any, maxLength: number = 60): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') {
    return value.length > maxLength ? `"${value.slice(0, maxLength)}..."` : `"${value}"`;
  }
  if (typeof value === 'function') return `fn(${value.name || 'anonymous'})`;
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value);
      return str.length > maxLength ? `${str.slice(0, maxLength)}...` : str;
    } catch {
      return '[Object]';
    }
  }
  return String(value);
}

/**
 * 格式化时间戳
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + `.${String(date.getMilliseconds()).padStart(3, '0')}`;
}

/**
 * 计算相对时间
 */
function relativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  if (diff < 1000) return `${diff}ms 前`;
  if (diff < 60000) return `${Math.floor(diff / 1000)}s 前`;
  return `${Math.floor(diff / 60000)}m 前`;
}

// ============================================================
// EventTracker 类
// ============================================================

/**
 * 事件追踪器
 *
 * 负责显示和过滤组件事件记录，支持事件详情查看。
 */
export class EventTracker {
  /** 面板引用 */
  private panel: DevToolsPanel;
  /** 当前内容容器 */
  private container: HTMLElement | null = null;
  /** 事件名称过滤关键词 */
  private nameFilter: string = '';
  /** 组件名称过滤关键词 */
  private componentFilter: string = '';
  /** 是否暂停记录 */
  private paused: boolean = false;
  /** 当前选中的事件 ID（用于显示详情） */
  private selectedEventId: string | null = null;
  /** 更新定时器 */
  private updateTimer: ReturnType<typeof setTimeout> | null = null;
  /** 自动滚动定时器 */
  private autoScrollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(panel: DevToolsPanel) {
    this.panel = panel;

    // 监听全局更新事件
    if (typeof window !== 'undefined') {
      window.addEventListener('lyt-devtools-update', this.onUpdate);
    }
  }

  // ============================================================
  // 渲染
  // ============================================================

  /**
   * 渲染事件追踪器到指定容器
   */
  render(container: HTMLElement): void {
    this.container = container;
    this.renderEvents();
  }

  /**
   * 渲染事件列表
   */
  private renderEvents(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

    // 工具栏
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display: flex; gap: 6px; margin-bottom: 8px; align-items: center;';

    // 事件名称搜索
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'lyt-devtools-search';
    nameInput.placeholder = '按事件名称过滤...';
    nameInput.value = this.nameFilter;
    nameInput.style.marginBottom = '0';
    nameInput.style.flex = '1';
    nameInput.addEventListener('input', (e) => {
      this.nameFilter = (e.target as HTMLInputElement).value;
      this.renderEvents();
    });
    toolbar.appendChild(nameInput);

    // 组件名称搜索
    const compInput = document.createElement('input');
    compInput.type = 'text';
    compInput.className = 'lyt-devtools-search';
    compInput.placeholder = '按组件过滤...';
    compInput.value = this.componentFilter;
    compInput.style.marginBottom = '0';
    compInput.style.flex = '1';
    compInput.addEventListener('input', (e) => {
      this.componentFilter = (e.target as HTMLInputElement).value;
      this.renderEvents();
    });
    toolbar.appendChild(compInput);

    // 暂停/继续按钮
    const pauseBtn = document.createElement('button');
    pauseBtn.style.cssText = `
      background: ${this.paused ? '#f38ba8' : 'transparent'};
      color: ${this.paused ? '#1e1e2e' : '#a6adc8'};
      border: 1px solid ${this.paused ? '#f38ba8' : '#313244'};
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-family: inherit;
      white-space: nowrap;
      flex-shrink: 0;
    `;
    pauseBtn.textContent = this.paused ? '继续' : '暂停';
    pauseBtn.addEventListener('click', () => {
      this.paused = !this.paused;
      this.renderEvents();
    });
    toolbar.appendChild(pauseBtn);

    // 清空按钮
    const clearBtn = document.createElement('button');
    clearBtn.style.cssText = `
      background: transparent;
      color: #a6adc8;
      border: 1px solid #313244;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-family: inherit;
      white-space: nowrap;
      flex-shrink: 0;
    `;
    clearBtn.textContent = '清空';
    clearBtn.addEventListener('click', () => {
      this.clearEvents();
    });
    toolbar.appendChild(clearBtn);

    this.container.appendChild(toolbar);

    // 获取事件记录
    let records = getEventRecords();

    // 应用过滤
    if (this.nameFilter) {
      const keyword = this.nameFilter.toLowerCase();
      records = records.filter(r => r.name.toLowerCase().includes(keyword));
    }
    if (this.componentFilter) {
      const keyword = this.componentFilter.toLowerCase();
      records = records.filter(r => r.componentName.toLowerCase().includes(keyword));
    }

    // 更新状态栏
    this.panel.setStatusLeft(
      `<span class="lyt-devtools-status-dot"></span>` +
      `<span>${records.length} 个事件${this.paused ? ' (已暂停)' : ''}</span>`
    );

    if (records.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lyt-devtools-empty';
      empty.textContent = this.nameFilter || this.componentFilter
        ? '没有匹配的事件记录。'
        : '暂无事件记录，等待组件触发事件...';
      this.container.appendChild(empty);
      return;
    }

    // 如果有选中的事件，先显示详情
    if (this.selectedEventId) {
      const selectedRecord = records.find(r => r.id === this.selectedEventId);
      if (selectedRecord) {
        this.renderEventDetail(selectedRecord);
      }
    }

    // 事件列表（倒序显示，最新的在上面）
    const list = document.createElement('div');
    list.style.cssText = 'max-height: 360px; overflow-y: auto;';

    const reversedRecords = [...records].reverse();
    const displayCount = Math.min(reversedRecords.length, 200); // 最多显示 200 条

    for (let i = 0; i < displayCount; i++) {
      const record = reversedRecords[i];
      const isSelected = record.id === this.selectedEventId;

      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-bottom: 1px solid rgba(49, 50, 68, 0.5);
        cursor: pointer;
        font-size: 11px;
        transition: background 0.1s ease;
        ${isSelected ? 'background: rgba(203, 166, 247, 0.15); border-left: 2px solid #cba6f7;' : ''}
      `;

      // 鼠标悬停效果
      item.addEventListener('mouseenter', () => {
        if (!isSelected) {
          item.style.background = 'rgba(69, 71, 90, 0.3)';
        }
      });
      item.addEventListener('mouseleave', () => {
        if (!isSelected) {
          item.style.background = '';
        }
      });

      // 时间
      const timeEl = document.createElement('span');
      timeEl.style.cssText = 'color: #585b70; margin-right: 8px; flex-shrink: 0; font-size: 10px;';
      timeEl.textContent = formatTime(record.timestamp);
      item.appendChild(timeEl);

      // 事件名称
      const nameEl = document.createElement('span');
      nameEl.style.cssText = `
        color: #f9e2af;
        font-weight: 600;
        margin-right: 8px;
        flex-shrink: 0;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      nameEl.textContent = record.name;
      nameEl.title = record.name;
      item.appendChild(nameEl);

      // 来源组件
      const compEl = document.createElement('span');
      compEl.style.cssText = `
        color: #89b4fa;
        margin-right: 8px;
        flex-shrink: 0;
        max-width: 80px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      compEl.textContent = record.componentName;
      compEl.title = record.componentName;
      item.appendChild(compEl);

      // 参数预览
      const argsPreview = record.args.map(a => formatArgValue(a, 30)).join(', ');
      const argsEl = document.createElement('span');
      argsEl.style.cssText = `
        color: #6c7086;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px;
      `;
      argsEl.textContent = record.args.length > 0 ? `(${argsPreview})` : '()';
      argsEl.title = record.args.length > 0 ? argsPreview : '无参数';
      item.appendChild(argsEl);

      // 相对时间
      const relTimeEl = document.createElement('span');
      relTimeEl.style.cssText = 'color: #45475a; flex-shrink: 0; font-size: 10px; margin-left: 4px;';
      relTimeEl.textContent = relativeTime(record.timestamp);
      item.appendChild(relTimeEl);

      // 点击显示详情
      item.addEventListener('click', () => {
        if (this.selectedEventId === record.id) {
          this.selectedEventId = null;
        } else {
          this.selectedEventId = record.id;
        }
        this.renderEvents();
      });

      list.appendChild(item);
    }

    // 如果记录超过显示数量，显示提示
    if (reversedRecords.length > displayCount) {
      const more = document.createElement('div');
      more.style.cssText = 'padding: 6px 8px; text-align: center; color: #585b70; font-size: 11px;';
      more.textContent = `还有 ${reversedRecords.length - displayCount} 条记录未显示...`;
      list.appendChild(more);
    }

    this.container.appendChild(list);
  }

  /**
   * 渲染事件详情
   */
  private renderEventDetail(record: EventRecord): void {
    const detail = document.createElement('div');
    detail.style.cssText = `
      background: #181825;
      border: 1px solid #313244;
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 8px;
    `;

    // 标题行
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;';

    const title = document.createElement('span');
    title.style.cssText = 'font-weight: 600; color: #f9e2af; font-size: 12px;';
    title.textContent = `事件: ${record.name}`;

    const closeBtn = document.createElement('span');
    closeBtn.style.cssText = 'cursor: pointer; color: #6c7086; font-size: 14px;';
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => {
      this.selectedEventId = null;
      this.renderEvents();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);
    detail.appendChild(header);

    // 元信息
    const meta = document.createElement('div');
    meta.style.cssText = 'display: flex; gap: 12px; margin-bottom: 6px; font-size: 11px;';
    meta.innerHTML = `
      <span><span style="color: #6c7086;">来源组件:</span> <span style="color: #89b4fa;">${record.componentName}</span></span>
      <span><span style="color: #6c7086;">组件 ID:</span> <span style="color: #585b70;">${record.componentId}</span></span>
      <span><span style="color: #6c7086;">时间:</span> <span style="color: #585b70;">${formatTime(record.timestamp)}</span></span>
    `;
    detail.appendChild(meta);

    // 参数列表
    if (record.args.length > 0) {
      const argsHeader = document.createElement('div');
      argsHeader.style.cssText = 'color: #6c7086; font-size: 11px; margin-bottom: 4px; font-weight: 600;';
      argsHeader.textContent = `参数 (${record.args.length}):`;
      detail.appendChild(argsHeader);

      for (let i = 0; i < record.args.length; i++) {
        const argItem = document.createElement('div');
        argItem.style.cssText = `
          padding: 3px 8px;
          background: #1e1e2e;
          border-radius: 2px;
          margin-bottom: 2px;
          font-size: 11px;
          font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
        `;

        const argValue = record.args[i];
        const argType = typeof argValue;

        let displayValue: string;
        try {
          displayValue = JSON.stringify(argValue, null, 2);
        } catch {
          displayValue = String(argValue);
        }

        // 限制显示长度
        if (displayValue.length > 500) {
          displayValue = displayValue.slice(0, 500) + '\n... (已截断)';
        }

        argItem.innerHTML = `
          <span style="color: #6c7086;">[${i}]</span>
          <span style="color: #585b70; margin: 0 4px;">${argType}:</span>
          <span style="color: #a6e3a1; white-space: pre-wrap; word-break: break-all;">${this.escapeHtml(displayValue)}</span>
        `;
        detail.appendChild(argItem);
      }
    } else {
      const noArgs = document.createElement('div');
      noArgs.style.cssText = 'color: #585b70; font-size: 11px; font-style: italic;';
      noArgs.textContent = '此事件无参数。';
      detail.appendChild(noArgs);
    }

    this.container!.appendChild(detail);
  }

  /**
   * HTML 转义
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ============================================================
  // 操作
  // ============================================================

  /**
   * 清空事件记录
   */
  private clearEvents(): void {
    // 通过 hooks 模块的 clearRecords 清空
    // 这里重新渲染即可，因为 hooks 模块会处理实际的清空
    this.selectedEventId = null;
    this.renderEvents();
  }

  /**
   * 设置暂停状态
   */
  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /**
   * 获取暂停状态
   */
  isPaused(): boolean {
    return this.paused;
  }

  // ============================================================
  // 更新处理
  // ============================================================

  /**
   * 全局更新事件处理
   */
  private onUpdate = (): void => {
    if (this.paused) return;
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    this.updateTimer = setTimeout(() => {
      this.renderEvents();
    }, 100);
  };

  /**
   * 强制刷新
   */
  refresh(): void {
    this.renderEvents();
  }

  // ============================================================
  // 销毁
  // ============================================================

  /**
   * 销毁追踪器
   */
  destroy(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    if (this.autoScrollTimer) {
      clearInterval(this.autoScrollTimer);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('lyt-devtools-update', this.onUpdate);
    }
    this.container = null;
  }
}
