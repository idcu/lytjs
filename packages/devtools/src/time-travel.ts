/**
 * Lyt.js DevTools — 时间旅行调试
 *
 * 提供状态快照系统和时间轴控件，支持回到任意历史时间点查看和恢复状态。
 *
 * 核心功能：
 * - TimeTravelDebugger 类
 * - 状态快照系统（每次状态变化时保存快照）
 * - 快照包含完整的组件状态树
 * - 最多保存 100 个快照（内存限制）
 * - 时间轴控件（滑块拖拽、播放/暂停、步进按钮）
 * - 回到历史时间点时恢复状态并重新渲染
 * - 快照列表显示
 *
 * 纯原生零依赖实现。
 */

import {
  type ComponentInfo,
  type StateChangeRecord,
  getAllComponents,
  getComponentById,
  getSelectedComponentId,
  selectComponent,
} from './hooks';
import type { DevToolsPanel } from './panel';

// ============================================================
// 类型定义
// ============================================================

/** 状态快照 */
export interface StateSnapshot {
  /** 快照唯一 ID */
  id: number;
  /** 快照时间戳 */
  timestamp: number;
  /** 快照描述 */
  description: string;
  /** 所有组件的状态快照 */
  components: Map<string, ComponentSnapshot>;
  /** 触发此快照的状态变化记录（可选） */
  trigger?: StateChangeRecord;
}

/** 单个组件的状态快照 */
interface ComponentSnapshot {
  /** 组件 ID */
  id: string;
  /** 组件名称 */
  name: string;
  /** 组件 state 深拷贝 */
  state: Record<string, any>;
  /** 组件 props 深拷贝 */
  props: Record<string, any>;
  /** 组件 computed 深拷贝 */
  computed: Record<string, any>;
  /** 是否已挂载 */
  isMounted: boolean;
}

/** 播放状态 */
type PlayState = 'stopped' | 'playing' | 'paused';

// ============================================================
// 工具函数
// ============================================================

/**
 * 深拷贝对象（仅支持可序列化数据）
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Map) {
    const cloned = new Map();
    for (const [key, value] of obj) {
      cloned.set(key, deepClone(value));
    }
    return cloned as unknown as T;
  }
  if (Array.isArray(obj)) return obj.map(item => deepClone(item)) as unknown as T;
  const cloned = {} as T;
  for (const key of Object.keys(obj as any)) {
    cloned[key] = deepClone((obj as any)[key]);
  }
  return cloned;
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

// ============================================================
// TimeTravelDebugger 类
// ============================================================

/**
 * 时间旅行调试器
 *
 * 通过状态快照系统记录应用状态变化历史，
 * 提供时间轴控件让开发者回到任意时间点查看状态。
 */
export class TimeTravelDebugger {
  /** 面板引用 */
  private panel: DevToolsPanel;
  /** 当前内容容器 */
  private container: HTMLElement | null = null;
  /** 快照列表 */
  private snapshots: StateSnapshot[] = [];
  /** 快照 ID 计数器 */
  private snapshotCounter: number = 0;
  /** 最大快照数量 */
  private maxSnapshots: number = 100;
  /** 当前查看的快照索引（-1 表示当前实时状态） */
  private currentIndex: number = -1;
  /** 播放状态 */
  private playState: PlayState = 'stopped';
  /** 播放速度（毫秒/步） */
  private playSpeed: number = 500;
  /** 播放定时器 */
  private playTimer: ReturnType<typeof setInterval> | null = null;
  /** 是否启用自动快照 */
  private autoSnapshot: boolean = true;
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
  // 快照管理
  // ============================================================

  /**
   * 创建状态快照
   *
   * @param description - 快照描述
   * @param trigger - 触发此快照的状态变化记录
   */
  takeSnapshot(description?: string, trigger?: StateChangeRecord): StateSnapshot {
    const components = getAllComponents();
    const componentSnapshots = new Map<string, ComponentSnapshot>();

    for (const comp of components) {
      componentSnapshots.set(comp.id, {
        id: comp.id,
        name: comp.name,
        state: deepClone(comp.state),
        props: deepClone(comp.props),
        computed: deepClone(comp.computed),
        isMounted: comp.isMounted,
      });
    }

    const snapshot: StateSnapshot = {
      id: ++this.snapshotCounter,
      timestamp: Date.now(),
      description: description || `快照 #${this.snapshotCounter}`,
      components: componentSnapshots,
      trigger,
    };

    this.snapshots.push(snapshot);

    // 限制快照数量
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.splice(0, this.snapshots.length - this.maxSnapshots);
    }

    // 如果当前在实时状态，更新索引
    if (this.currentIndex === -1 || this.currentIndex === this.snapshots.length - 2) {
      this.currentIndex = this.snapshots.length - 1;
    }

    return snapshot;
  }

  /**
   * 获取所有快照
   */
  getSnapshots(): StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 获取指定索引的快照
   */
  getSnapshot(index: number): StateSnapshot | null {
    return this.snapshots[index] ?? null;
  }

  /**
   * 获取当前快照索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 清空所有快照
   */
  clearSnapshots(): void {
    this.snapshots = [];
    this.snapshotCounter = 0;
    this.currentIndex = -1;
    this.stopPlayback();
    this.renderTimeTravel();
  }

  /**
   * 设置自动快照开关
   */
  setAutoSnapshot(enabled: boolean): void {
    this.autoSnapshot = enabled;
  }

  // ============================================================
  // 时间旅行
  // ============================================================

  /**
   * 跳转到指定快照
   *
   * @param index - 快照索引
   */
  travelTo(index: number): void {
    if (index < 0 || index >= this.snapshots.length) return;

    this.currentIndex = index;
    this.renderTimeTravel();
  }

  /**
   * 跳转到上一个快照
   */
  stepBack(): void {
    if (this.currentIndex > 0) {
      this.travelTo(this.currentIndex - 1);
    }
  }

  /**
   * 跳转到下一个快照
   */
  stepForward(): void {
    if (this.currentIndex < this.snapshots.length - 1) {
      this.travelTo(this.currentIndex + 1);
    }
  }

  /**
   * 跳转到最新状态（实时）
   */
  goToLatest(): void {
    this.currentIndex = -1;
    this.stopPlayback();
    this.renderTimeTravel();
  }

  /**
   * 恢复指定快照的状态到实际组件
   *
   * 注意：这是一个破坏性操作，会修改组件的实际状态。
   */
  restoreSnapshot(index: number): boolean {
    const snapshot = this.snapshots[index];
    if (!snapshot) return false;

    for (const [compId, compSnapshot] of snapshot.components) {
      const comp = getComponentById(compId);
      if (!comp || !comp.instance) continue;

      // 恢复 state
      if (comp.instance.state && typeof comp.instance.state === 'object') {
        const stateKeys = Object.keys(compSnapshot.state);
        for (const key of stateKeys) {
          try {
            comp.instance.state[key] = deepClone(compSnapshot.state[key]);
          } catch (e) {
            console.warn(`[Lyt DevTools] 恢复状态失败: ${comp.name}.${key}`, e);
          }
        }
      }
    }

    return true;
  }

  // ============================================================
  // 播放控制
  // ============================================================

  /**
   * 开始自动回放
   */
  startPlayback(): void {
    if (this.playState === 'playing') return;

    // 如果在最新状态，从头开始
    if (this.currentIndex === -1 || this.currentIndex >= this.snapshots.length - 1) {
      this.currentIndex = 0;
    }

    this.playState = 'playing';
    this.renderTimeTravel();

    this.playTimer = setInterval(() => {
      if (this.currentIndex < this.snapshots.length - 1) {
        this.currentIndex++;
        this.renderTimeTravel();
      } else {
        this.stopPlayback();
      }
    }, this.playSpeed);
  }

  /**
   * 暂停回放
   */
  pausePlayback(): void {
    if (this.playState !== 'playing') return;
    this.playState = 'paused';

    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }

    this.renderTimeTravel();
  }

  /**
   * 停止回放
   */
  stopPlayback(): void {
    this.playState = 'stopped';

    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }

    this.renderTimeTravel();
  }

  /**
   * 设置播放速度
   */
  setPlaySpeed(speed: number): void {
    this.playSpeed = speed;

    // 如果正在播放，重新启动以应用新速度
    if (this.playState === 'playing') {
      this.pausePlayback();
      this.startPlayback();
    }
  }

  /**
   * 获取播放状态
   */
  getPlayState(): PlayState {
    return this.playState;
  }

  // ============================================================
  // 渲染
  // ============================================================

  /**
   * 渲染时间旅行调试器到指定容器
   */
  render(container: HTMLElement): void {
    this.container = container;
    this.renderTimeTravel();
  }

  /**
   * 渲染时间旅行内容
   */
  private renderTimeTravel(): void {
    if (!this.container) return;

    this.container.innerHTML = '';

    // 工具栏
    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display: flex; gap: 4px; margin-bottom: 8px; align-items: center; flex-wrap: wrap;';

    // 手动快照按钮
    const snapshotBtn = document.createElement('button');
    snapshotBtn.style.cssText = this.createButtonStyle('#a6e3a1', '#1e1e2e');
    snapshotBtn.textContent = '\u{1F4F8} 快照';
    snapshotBtn.title = '手动创建快照';
    snapshotBtn.addEventListener('click', () => {
      this.takeSnapshot('手动快照');
      this.renderTimeTravel();
    });
    toolbar.appendChild(snapshotBtn);

    // 回到最新按钮
    const latestBtn = document.createElement('button');
    latestBtn.style.cssText = this.createButtonStyle('#89b4fa', '#1e1e2e');
    latestBtn.textContent = '\u{1F504} 最新';
    latestBtn.title = '回到最新状态';
    latestBtn.addEventListener('click', () => {
      this.goToLatest();
    });
    toolbar.appendChild(latestBtn);

    // 清空按钮
    const clearBtn = document.createElement('button');
    clearBtn.style.cssText = this.createButtonStyle('#f38ba8', '#1e1e2e');
    clearBtn.textContent = '\u{1F5D1} 清空';
    clearBtn.title = '清空所有快照';
    clearBtn.addEventListener('click', () => {
      this.clearSnapshots();
    });
    toolbar.appendChild(clearBtn);

    // 自动快照开关
    const autoLabel = document.createElement('label');
    autoLabel.style.cssText = 'display: flex; align-items: center; gap: 4px; font-size: 11px; color: #a6adc8; margin-left: 8px; cursor: pointer;';
    const autoCheckbox = document.createElement('input');
    autoCheckbox.type = 'checkbox';
    autoCheckbox.checked = this.autoSnapshot;
    autoCheckbox.style.cssText = 'cursor: pointer;';
    autoCheckbox.addEventListener('change', () => {
      this.autoSnapshot = autoCheckbox.checked;
    });
    autoLabel.appendChild(autoCheckbox);
    autoLabel.appendChild(document.createTextNode('自动快照'));
    toolbar.appendChild(autoLabel);

    this.container.appendChild(toolbar);

    // 播放控制栏
    if (this.snapshots.length > 0) {
      this.renderPlaybackControls(this.container);
    }

    // 快照列表
    this.renderSnapshotList(this.container);

    // 更新状态栏
    const isLive = this.currentIndex === -1;
    this.panel.setStatusLeft(
      `<span class="lyt-devtools-status-dot"></span>` +
      `<span>${this.snapshots.length} 个快照</span>` +
      `<span style="color: #585b70;">|</span>` +
      `<span>${isLive ? '实时' : `历史 #${this.currentIndex + 1}`}</span>`
    );
  }

  /**
   * 渲染播放控制栏
   */
  private renderPlaybackControls(parent: HTMLElement): void {
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px;
      background: #181825;
      border: 1px solid #313244;
      border-radius: 4px;
      margin-bottom: 8px;
    `;

    // 步退按钮
    const stepBackBtn = document.createElement('button');
    stepBackBtn.style.cssText = this.createSmallButtonStyle();
    stepBackBtn.textContent = '\u23EE';
    stepBackBtn.title = '步退';
    stepBackBtn.disabled = this.currentIndex <= 0;
    stepBackBtn.addEventListener('click', () => this.stepBack());
    controls.appendChild(stepBackBtn);

    // 播放/暂停按钮
    const playPauseBtn = document.createElement('button');
    playPauseBtn.style.cssText = this.createSmallButtonStyle();
    if (this.playState === 'playing') {
      playPauseBtn.textContent = '\u23F8';
      playPauseBtn.title = '暂停';
      playPauseBtn.addEventListener('click', () => this.pausePlayback());
    } else {
      playPauseBtn.textContent = '\u25B6';
      playPauseBtn.title = '播放';
      playPauseBtn.addEventListener('click', () => this.startPlayback());
    }
    controls.appendChild(playPauseBtn);

    // 停止按钮
    const stopBtn = document.createElement('button');
    stopBtn.style.cssText = this.createSmallButtonStyle();
    stopBtn.textContent = '\u23F9';
    stopBtn.title = '停止';
    stopBtn.disabled = this.playState === 'stopped';
    stopBtn.addEventListener('click', () => this.stopPlayback());
    controls.appendChild(stopBtn);

    // 步进按钮
    const stepForwardBtn = document.createElement('button');
    stepForwardBtn.style.cssText = this.createSmallButtonStyle();
    stepForwardBtn.textContent = '\u23ED';
    stepForwardBtn.title = '步进';
    stepForwardBtn.disabled = this.currentIndex >= this.snapshots.length - 1;
    stepForwardBtn.addEventListener('click', () => this.stepForward());
    controls.appendChild(stepForwardBtn);

    // 时间轴滑块
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = String(Math.max(0, this.snapshots.length - 1));
    slider.value = String(Math.max(0, this.currentIndex));
    slider.style.cssText = `
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: #313244;
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `;
    slider.addEventListener('input', (e) => {
      const index = parseInt((e.target as HTMLInputElement).value, 10);
      this.travelTo(index);
    });
    controls.appendChild(slider);

    // 速度选择
    const speedSelect = document.createElement('select');
    speedSelect.style.cssText = `
      background: #1e1e2e;
      color: #cdd6f4;
      border: 1px solid #313244;
      border-radius: 3px;
      padding: 2px 4px;
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
      outline: none;
    `;
    const speeds = [
      { value: 200, label: '0.5x' },
      { value: 500, label: '1x' },
      { value: 1000, label: '2x' },
      { value: 2000, label: '4x' },
    ];
    for (const speed of speeds) {
      const option = document.createElement('option');
      option.value = String(speed.value);
      option.textContent = speed.label;
      if (speed.value === this.playSpeed) option.selected = true;
      speedSelect.appendChild(option);
    }
    speedSelect.addEventListener('change', (e) => {
      this.setPlaySpeed(parseInt((e.target as HTMLSelectElement).value, 10));
    });
    controls.appendChild(speedSelect);

    // 当前位置 / 总数
    const positionLabel = document.createElement('span');
    positionLabel.style.cssText = 'color: #6c7086; font-size: 11px; flex-shrink: 0; min-width: 40px; text-align: right;';
    positionLabel.textContent = this.currentIndex === -1
      ? `--/${this.snapshots.length}`
      : `${this.currentIndex + 1}/${this.snapshots.length}`;
    controls.appendChild(positionLabel);

    parent.appendChild(controls);
  }

  /**
   * 渲染快照列表
   */
  private renderSnapshotList(parent: HTMLElement): void {
    if (this.snapshots.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'lyt-devtools-empty';
      empty.textContent = '暂无快照。点击"快照"按钮手动创建，或开启"自动快照"。';
      parent.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'max-height: 300px; overflow-y: auto;';

    // 倒序显示（最新的在上面）
    const reversed = [...this.snapshots].reverse();

    for (let i = reversed.length - 1; i >= 0; i--) {
      const snapshot = reversed[i];
      const actualIndex = this.snapshots.indexOf(snapshot);
      const isActive = actualIndex === this.currentIndex;

      const item = document.createElement('div');
      item.style.cssText = `
        display: flex;
        align-items: center;
        padding: 4px 8px;
        border-bottom: 1px solid rgba(49, 50, 68, 0.5);
        cursor: pointer;
        font-size: 11px;
        transition: background 0.1s ease;
        ${isActive ? 'background: rgba(203, 166, 247, 0.15); border-left: 2px solid #cba6f7;' : ''}
      `;

      // 鼠标悬停效果
      item.addEventListener('mouseenter', () => {
        if (!isActive) item.style.background = 'rgba(69, 71, 90, 0.3)';
      });
      item.addEventListener('mouseleave', () => {
        if (!isActive) item.style.background = '';
      });

      // 序号
      const numEl = document.createElement('span');
      numEl.style.cssText = 'color: #585b70; margin-right: 6px; flex-shrink: 0; min-width: 24px;';
      numEl.textContent = `#${snapshot.id}`;
      item.appendChild(numEl);

      // 时间
      const timeEl = document.createElement('span');
      timeEl.style.cssText = 'color: #585b70; margin-right: 8px; flex-shrink: 0; font-size: 10px;';
      timeEl.textContent = formatTime(snapshot.timestamp);
      item.appendChild(timeEl);

      // 描述
      const descEl = document.createElement('span');
      descEl.style.cssText = 'color: #cdd6f4; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      descEl.textContent = snapshot.description;
      item.appendChild(descEl);

      // 组件数量
      const compCountEl = document.createElement('span');
      compCountEl.style.cssText = 'color: #6c7086; flex-shrink: 0; font-size: 10px; margin-left: 4px;';
      compCountEl.textContent = `${snapshot.components.size} 组件`;
      item.appendChild(compCountEl);

      // 恢复按钮
      const restoreBtn = document.createElement('span');
      restoreBtn.style.cssText = `
        color: #585b70;
        cursor: pointer;
        margin-left: 6px;
        font-size: 10px;
        padding: 1px 4px;
        border: 1px solid #313244;
        border-radius: 2px;
        flex-shrink: 0;
        transition: all 0.15s ease;
      `;
      restoreBtn.textContent = '恢复';
      restoreBtn.title = '恢复此快照的状态';
      restoreBtn.addEventListener('mouseenter', () => {
        restoreBtn.style.color = '#f9e2af';
        restoreBtn.style.borderColor = '#f9e2af';
      });
      restoreBtn.addEventListener('mouseleave', () => {
        restoreBtn.style.color = '#585b70';
        restoreBtn.style.borderColor = '#313244';
      });
      restoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`确定要恢复快照 #${snapshot.id} 的状态吗？\n这将修改组件的实际状态。`)) {
          this.restoreSnapshot(actualIndex);
        }
      });
      item.appendChild(restoreBtn);

      // 点击跳转
      item.addEventListener('click', () => {
        this.travelTo(actualIndex);
      });

      list.appendChild(item);
    }

    parent.appendChild(list);
  }

  // ============================================================
  // 样式辅助
  // ============================================================

  /**
   * 创建按钮样式
   */
  private createButtonStyle(bgColor: string, textColor: string): string {
    return `
      background: ${bgColor};
      color: ${textColor};
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      font-family: inherit;
      white-space: nowrap;
      flex-shrink: 0;
      transition: opacity 0.15s ease;
    `;
  }

  /**
   * 创建小按钮样式
   */
  private createSmallButtonStyle(): string {
    return `
      background: transparent;
      color: #cdd6f4;
      border: 1px solid #313244;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s ease;
      padding: 0;
    `;
  }

  // ============================================================
  // 更新处理
  // ============================================================

  /**
   * 全局更新事件处理
   * 自动创建快照
   */
  private onUpdate = (): void => {
    if (!this.autoSnapshot) return;
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    this.updateTimer = setTimeout(() => {
      this.takeSnapshot('自动快照');
      // 不重新渲染整个面板，避免循环
      // 只在用户查看时间旅行标签时才渲染
    }, 300);
  };

  /**
   * 强制刷新
   */
  refresh(): void {
    this.renderTimeTravel();
  }

  // ============================================================
  // 销毁
  // ============================================================

  /**
   * 销毁调试器
   */
  destroy(): void {
    this.stopPlayback();
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('lyt-devtools-update', this.onUpdate);
    }
    this.container = null;
    this.snapshots = [];
  }
}
