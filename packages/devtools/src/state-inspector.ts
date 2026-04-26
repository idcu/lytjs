/**
 * Lyt.js DevTools — 状态检查器
 *
 * 显示和编辑当前选中组件的完整状态，包括 props、state、computed。
 * 支持嵌套对象展开/折叠、实时更新高亮、双击编辑和变化历史记录。
 *
 * 核心功能：
 * - StateInspector 类
 * - 显示当前选中组件的完整状态（props/state/computed）
 * - 状态值可展开/折叠（支持嵌套对象）
 * - 状态变化实时更新（高亮变化的属性）
 * - 手动编辑状态值（双击编辑）
 * - 状态变化历史记录
 *
 * 纯原生零依赖实现。
 */

import {
  type ComponentInfo,
  type StateChangeRecord,
  getSelectedComponent,
  getSelectedComponentId,
  getComponentById,
  getComponentStateChanges,
  setComponentState,
} from './hooks';
import type { DevToolsPanel } from './panel';

// ============================================================
// 类型定义
// ============================================================

/** 状态分类 */
type StateCategory = 'props' | 'state' | 'computed';

/** 状态属性条目 */
interface StateEntry {
  /** 属性名 */
  key: string;
  /** 属性值 */
  value: any;
  /** 分类 */
  category: StateCategory;
  /** 是否为响应式 */
  isReactive: boolean;
  /** 是否有缓存 */
  isCached: boolean;
  /** 是否只读 */
  isReadonly: boolean;
}

/** 展开的路径集合 */
type ExpandedPaths = Set<string>;

// ============================================================
// 工具函数
// ============================================================

/**
 * 获取值的类型描述
 */
function getValueType(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'function') return 'function';
  if (Array.isArray(value)) return `Array[${value.length}]`;
  if (value instanceof Date) return 'Date';
  if (value instanceof RegExp) return 'RegExp';
  if (typeof value === 'object') return 'Object';
  return typeof value;
}

/**
 * 格式化值用于显示
 */
function formatValue(value: any, maxLength: number = 80): string {
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
 * 判断值是否可展开（对象或数组）
 */
function isExpandable(value: any): boolean {
  return value !== null && typeof value === 'object' && !(value instanceof Date) && !(value instanceof RegExp);
}

/**
 * 安全地深拷贝
 */
function safeClone(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

// ============================================================
// StateInspector 类
// ============================================================

/**
 * 状态检查器
 *
 * 负责显示和编辑组件的 props、state、computed 状态。
 */
export class StateInspector {
  /** 面板引用 */
  private panel: DevToolsPanel;
  /** 当前内容容器 */
  private container: HTMLElement | null = null;
  /** 展开的路径集合 */
  private expandedPaths: ExpandedPaths = new Set<string>();
  /** 最近变化的属性路径（用于高亮） */
  private changedPaths = new Map<string, number>();
  /** 高亮清除定时器 */
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;
  /** 当前显示历史记录模式 */
  private showHistory: boolean = false;
  /** 更新定时器 */
  private updateTimer: ReturnType<typeof setTimeout> | null = null;

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
   * 渲染状态检查器到指定容器
   */
  render(container: HTMLElement): void {
    this.container = container;
    this.renderState();
  }

  /**
   * 渲染状态内容
   */
  private renderState(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

    const component = getSelectedComponent();

    if (!component) {
      const empty = document.createElement('div');
      empty.className = 'lyt-devtools-empty';
      empty.textContent = '请先在组件树中选择一个组件。';
      this.container.appendChild(empty);
      return;
    }

    // 组件标题
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 8px;
      margin-bottom: 8px;
      background: #181825;
      border-radius: 4px;
      border: 1px solid #313244;
    `;

    const nameEl = document.createElement('span');
    nameEl.style.cssText = 'font-weight: 600; color: #cba6f7; font-size: 13px;';
    nameEl.textContent = component.name;

    const historyBtn = document.createElement('button');
    historyBtn.style.cssText = `
      background: ${this.showHistory ? '#cba6f7' : 'transparent'};
      color: ${this.showHistory ? '#1e1e2e' : '#a6adc8'};
      border: 1px solid ${this.showHistory ? '#cba6f7' : '#313244'};
      padding: 2px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
      font-family: inherit;
    `;
    historyBtn.textContent = '变化历史';
    historyBtn.addEventListener('click', () => {
      this.showHistory = !this.showHistory;
      this.renderState();
    });

    header.appendChild(nameEl);
    header.appendChild(historyBtn);
    this.container.appendChild(header);

    if (this.showHistory) {
      this.renderHistory(component);
    } else {
      // 渲染各分类状态
      this.renderCategory(this.container, "props", component.props, true, false, false);
      this.renderCategory(this.container, "state", component.state, false, true, false);
      this.renderCategory(this.container, "computed", component.computed, false, false, true);
    }

    // 更新状态栏
    const stateCount = Object.keys(component.state).length;
    const propsCount = Object.keys(component.props).length;
    const computedCount = Object.keys(component.computed).length;
    this.panel.setStatusLeft(
      `<span class="lyt-devtools-status-dot"></span>` +
      `<span>${component.name}</span>` +
      `<span style="color: #585b70;">|</span>` +
      `<span>P:${propsCount} S:${stateCount} C:${computedCount}</span>`
    );
  }

  /**
   * 渲染状态分类区块
   */
  private renderCategory(
    parent: HTMLElement,
    category: StateCategory,
    data: Record<string, any>,
    isReadonly: boolean,
    isReactive: boolean,
    isCached: boolean
  ): void {
    const keys = Object.keys(data);

    if (keys.length === 0) return;

    // 分类标题
    const categoryHeader = document.createElement('div');
    categoryHeader.style.cssText = `
      display: flex;
      align-items: center;
      padding: 4px 8px;
      margin-top: 6px;
      margin-bottom: 2px;
      font-size: 11px;
      font-weight: 600;
      color: #6c7086;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    const labels: Record<StateCategory, string> = {
      props: 'Props',
      state: 'State',
      computed: 'Computed',
    };
    const colors: Record<StateCategory, string> = {
      props: '#89b4fa',
      state: '#a6e3a1',
      computed: '#f9e2af',
    };

    categoryHeader.innerHTML = `
      <span style="color: ${colors[category]}; margin-right: 6px;">\u25CF</span>
      ${labels[category]}
      <span style="color: #585b70; margin-left: 4px;">(${keys.length})</span>
      ${isReadonly ? '<span style="color: #585b70; margin-left: 6px; font-size: 10px;">[只读]</span>' : ''}
      ${isReactive ? '<span style="color: #585b70; margin-left: 6px; font-size: 10px;">[响应式]</span>' : ''}
      ${isCached ? '<span style="color: #585b70; margin-left: 6px; font-size: 10px;">[缓存]</span>' : ''}
    `;
    parent.appendChild(categoryHeader);

    // 渲染每个属性
    for (const key of keys) {
      const value = data[key];
      const path = `${category}.${key}`;
      const isChanged = this.changedPaths.has(path);
      const expandable = isExpandable(value);

      this.renderProperty(parent, {
        key,
        value,
        category,
        isReactive,
        isCached,
        isReadonly,
      }, path, 0, expandable);
    }
  }

  /**
   * 渲染单个属性
   */
  private renderProperty(
    parent: HTMLElement,
    entry: StateEntry,
    path: string,
    depth: number,
    expandable: boolean
  ): void {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      align-items: flex-start;
      padding: 2px 8px;
      border-radius: 2px;
      cursor: default;
      transition: background 0.1s ease;
      ${this.changedPaths.has(path) ? 'background: rgba(249, 226, 175, 0.1);' : ''}
    `;

    // 鼠标悬停效果
    row.addEventListener('mouseenter', () => {
      row.style.background = 'rgba(69, 71, 90, 0.3)';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = this.changedPaths.has(path) ? 'rgba(249, 226, 175, 0.1)' : '';
    });

    // 缩进
    const indent = document.createElement('span');
    indent.style.cssText = `display: inline-block; width: ${depth * 16}px; flex-shrink: 0;`;
    row.appendChild(indent);

    // 展开/折叠箭头
    const arrow = document.createElement('span');
    arrow.style.cssText = `
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      font-size: 9px;
      color: #6c7086;
      flex-shrink: 0;
      transition: transform 0.15s ease;
      ${expandable ? '' : 'visibility: hidden;'}
      ${this.expandedPaths.has(path) ? 'transform: rotate(90deg);' : ''}
    `;
    arrow.textContent = '\u25B6';
    row.appendChild(arrow);

    // 键名
    const keyEl = document.createElement('span');
    keyEl.style.cssText = `
      color: #89b4fa;
      margin-right: 6px;
      flex-shrink: 0;
      font-size: 12px;
      min-width: 60px;
    `;
    keyEl.textContent = entry.key;
    row.appendChild(keyEl);

    // 分隔符
    const colon = document.createElement('span');
    colon.style.cssText = 'color: #6c7086; margin-right: 6px; flex-shrink: 0;';
    colon.textContent = ':';
    row.appendChild(colon);

    // 值
    const valueEl = document.createElement('span');
    const valueType = getValueType(entry.value);
    const valueColors: Record<string, string> = {
      string: '#a6e3a1',
      number: '#fab387',
      boolean: '#89b4fa',
      null: '#6c7086',
      undefined: '#6c7086',
      function: '#cba6f7',
      Object: '#cdd6f4',
      Array: '#f9e2af',
      Date: '#f38ba8',
      RegExp: '#f38ba8',
    };

    valueEl.style.cssText = `
      color: ${valueColors[valueType] || '#cdd6f4'};
      font-size: 12px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: ${entry.isReadonly ? 'default' : 'text'};
    `;
    valueEl.textContent = formatValue(entry.value);
    row.appendChild(valueEl);

    // 类型标签
    const typeBadge = document.createElement('span');
    typeBadge.style.cssText = `
      color: #585b70;
      font-size: 10px;
      flex-shrink: 0;
      margin-left: 6px;
    `;
    typeBadge.textContent = valueType;
    row.appendChild(typeBadge);

    // 点击事件（展开/折叠）
    if (expandable) {
      row.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.expandedPaths.has(path)) {
          this.expandedPaths.delete(path);
        } else {
          this.expandedPaths.add(path);
        }
        this.renderState();
      });
    }

    // 双击编辑（仅 state 可编辑）
    if (!entry.isReadonly && entry.category === 'state') {
      valueEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.startEdit(row, entry, path, valueEl);
      });
    }

    parent.appendChild(row);

    // 如果展开且值可展开，渲染子属性
    if (expandable && this.expandedPaths.has(path)) {
      const value = entry.value;
      const childKeys = Object.keys(value);
      for (const childKey of childKeys) {
        const childPath = `${path}.${childKey}`;
        const childValue = value[childKey];
        const childExpandable = isExpandable(childValue);

        this.renderProperty(parent, {
          key: childKey,
          value: childValue,
          category: entry.category,
          isReactive: entry.isReactive,
          isCached: entry.isCached,
          isReadonly: entry.isReadonly,
        }, childPath, depth + 1, childExpandable);
      }
    }
  }

  // ============================================================
  // 编辑功能
  // ============================================================

  /**
   * 开始编辑状态值
   */
  private startEdit(
    row: HTMLElement,
    entry: StateEntry,
    path: string,
    valueEl: HTMLElement
  ): void {
    const componentId = getSelectedComponentId();
    if (!componentId) return;

    // 创建编辑输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.style.cssText = `
      background: #181825;
      border: 1px solid #cba6f7;
      color: #cdd6f4;
      font-size: 12px;
      font-family: inherit;
      padding: 1px 4px;
      border-radius: 2px;
      outline: none;
      width: 100%;
      box-sizing: border-box;
    `;

    // 根据类型设置初始值
    let editValue: any;
    if (typeof entry.value === 'string') {
      editValue = entry.value;
      input.value = entry.value;
    } else {
      editValue = JSON.stringify(entry.value);
      input.value = editValue;
    }

    // 替换值显示
    valueEl.style.display = 'none';
    row.insertBefore(input, valueEl.nextSibling);
    input.focus();
    input.select();

    // 确认编辑
    const confirmEdit = () => {
      let newValue: any;
      const rawValue = input.value;

      // 尝试解析值
      try {
        newValue = JSON.parse(rawValue);
      } catch {
        // 如果不是有效 JSON，当作字符串处理
        newValue = rawValue;
      }

      // 提取属性路径（去掉 "state." 前缀）
      const statePath = path.replace(/^state\./, '');

      // 设置新值
      setComponentState(componentId, statePath, newValue);

      // 移除输入框
      input.remove();
      valueEl.style.display = '';

      // 重新渲染
      this.renderState();
    };

    // 取消编辑
    const cancelEdit = () => {
      input.remove();
      valueEl.style.display = '';
    };

    // 键盘事件
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });

    // 失焦确认
    input.addEventListener('blur', () => {
      confirmEdit();
    });
  }

  // ============================================================
  // 变化历史
  // ============================================================

  /**
   * 渲染状态变化历史
   */
  private renderHistory(component: ComponentInfo): void {
    const records = getComponentStateChanges(component.id);

    if (records.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lyt-devtools-empty';
      empty.textContent = '暂无状态变化记录。';
      this.container!.appendChild(empty);
      return;
    }

    // 历史记录列表（倒序显示，最新的在上面）
    const list = document.createElement('div');
    list.style.cssText = 'max-height: 400px; overflow-y: auto;';

    const reversedRecords = [...records].reverse();

    for (let i = 0; i < reversedRecords.length; i++) {
      const record = reversedRecords[i];
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 6px 8px;
        border-bottom: 1px solid #313244;
        font-size: 11px;
        cursor: default;
        transition: background 0.1s ease;
      `;

      item.addEventListener('mouseenter', () => {
        item.style.background = 'rgba(69, 71, 90, 0.3)';
      });
      item.addEventListener('mouseleave', () => {
        item.style.background = '';
      });

      const time = new Date(record.timestamp).toLocaleTimeString();
      item.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
          <span style="color: #89b4fa; font-weight: 600;">${record.path}</span>
          <span style="color: #585b70;">${time}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="color: #f38ba8; text-decoration: line-through; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${formatValue(record.oldValue, 40)}</span>
          <span style="color: #6c7086;">\u2192</span>
          <span style="color: #a6e3a1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${formatValue(record.newValue, 40)}</span>
        </div>
      `;

      list.appendChild(item);
    }

    this.container!.appendChild(list);
  }

  // ============================================================
  // 更新处理
  // ============================================================

  /**
   * 全局更新事件处理
   */
  private onUpdate = (): void => {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    this.updateTimer = setTimeout(() => {
      this.renderState();
    }, 150);
  };

  /**
   * 标记属性变化（用于高亮）
   */
  markChanged(path: string): void {
    this.changedPaths.set(path, Date.now());

    // 3 秒后清除高亮
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
    this.highlightTimer = setTimeout(() => {
      this.changedPaths.clear();
      this.renderState();
    }, 3000);
  }

  /**
   * 强制刷新
   */
  refresh(): void {
    this.renderState();
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
    if (this.highlightTimer) {
      clearTimeout(this.highlightTimer);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('lyt-devtools-update', this.onUpdate);
    }
    this.container = null;
    this.expandedPaths.clear();
    this.changedPaths.clear();
  }
}
