/**
 * Lyt.js DevTools — 主入口
 *
 * DevTools 类是开发者工具的主入口，负责：
 * - 连接到 Lyt.js 应用实例
 * - 初始化所有子模块（组件树、状态检查器、事件追踪、时间旅行）
 * - 创建 DevTools 面板 DOM（浮动面板，可拖拽）
 * - 提供 show() / hide() 切换面板显示
 *
 * 使用方式：
 * ```ts
 * import { createDevTools } from '@lytjs/devtools'
 * import { createApp } from '@lytjs/core'
 *
 * const app = createApp({ ... })
 * app.use(createDevTools())
 * app.mount('#app')
 * ```
 *
 * 纯原生零依赖实现。
 */

import { DevToolsPanel, type TabType } from './panel';
import { ComponentTreeInspector } from './component-tree';
import { StateInspector } from './state-inspector';
import { EventTracker } from './event-tracker';
import { TimeTravelDebugger } from './time-travel';
import {
  connectToApp,
  disconnect,
  isAppConnected,
  clearRecords,
  refreshComponentTree,
  type DevToolsCallbacks,
  type LytApp,
  type StateChangeRecord,
  type EventRecord,
} from './hooks';

// ============================================================
// 类型定义
// ============================================================

/** DevTools 配置 */
export interface DevToolsConfig {
  /** 面板初始宽度 */
  width?: number;
  /** 面板初始高度 */
  height?: number;
  /** 面板初始 X 位置 */
  x?: number;
  /** 面板初始 Y 位置 */
  y?: number;
  /** 是否在启动时自动显示面板 */
  autoShow?: boolean;
  /** 面板标题 */
  title?: string;
}

/** Lyt 应用 API 接口（插件系统使用） */
interface AppAPI {
  use: (plugin: any, ...options: any[]) => AppAPI;
  provide: <T = any>(key: string | symbol, value: T) => void;
  inject: <T = any>(key: string | symbol, defaultValue?: T) => T | undefined;
  config: Record<string, any>;
  globalProperties: Record<string, any>;
}

// ============================================================
// DevTools 类
// ============================================================

/**
 * Lyt.js 开发者工具
 *
 * 提供浏览器端的调试能力，包括组件树检查、状态检查、事件追踪和时间旅行调试。
 */
export class DevTools {
  /** 调试面板 */
  private panel: DevToolsPanel;
  /** 组件树检查器 */
  private componentTree: ComponentTreeInspector;
  /** 状态检查器 */
  private stateInspector: StateInspector;
  /** 事件追踪器 */
  private eventTracker: EventTracker;
  /** 时间旅行调试器 */
  private timeTravel: TimeTravelDebugger;
  /** 是否已安装 */
  private _installed: boolean = false;
  /** 应用实例引用 */
  private app: LytApp | null = null;
  /** 配置 */
  private config: Required<DevToolsConfig>;

  constructor(config?: DevToolsConfig) {
    // 合并默认配置
    this.config = {
      width: config?.width ?? 420,
      height: config?.height ?? 560,
      x: config?.x ?? undefined,
      y: config?.y ?? undefined,
      autoShow: config?.autoShow ?? true,
      title: config?.title ?? 'Lyt DevTools',
    };

    // 创建面板
    this.panel = new DevToolsPanel({
      width: this.config.width,
      height: this.config.height,
      x: this.config.x,
      y: this.config.y,
      title: this.config.title,
    });

    // 创建子模块
    this.componentTree = new ComponentTreeInspector(this.panel, (componentId) => {
      // 组件选中时切换到状态标签
      this.panel.switchTab('state');
      this.stateInspector.refresh();
    });

    this.stateInspector = new StateInspector(this.panel);
    this.eventTracker = new EventTracker(this.panel);
    this.timeTravel = new TimeTravelDebugger(this.panel);

    // 注册标签页渲染器
    this.panel.registerTabRenderer('components', (container) => {
      this.componentTree.render(container);
    });

    this.panel.registerTabRenderer('state', (container) => {
      this.stateInspector.render(container);
    });

    this.panel.registerTabRenderer('events', (container) => {
      this.eventTracker.render(container);
    });

    this.panel.registerTabRenderer('router', (container) => {
      this.renderRouterTab(container);
    });

    // 初始渲染
    this.panel.renderContent();

    // 根据配置决定是否自动显示
    if (!this.config.autoShow) {
      this.panel.hide();
    }
  }

  // ============================================================
  // 安装
  // ============================================================

  /**
   * 安装到 Lyt.js 应用
   *
   * @param app - Lyt.js 应用实例
   */
  install(app: LytApp): void {
    if (this._installed) {
      console.warn('[Lyt DevTools] DevTools 已经安装，不能重复安装。');
      return;
    }

    this.app = app;
    this._installed = true;

    // 定义 DevTools 回调
    const callbacks: DevToolsCallbacks = {
      onComponentCreated: (info) => {
        // 组件创建时刷新组件树
        this.componentTree.refresh();
      },
      onComponentUpdated: (info) => {
        // 组件更新时刷新
        this.componentTree.refresh();
        this.stateInspector.refresh();
      },
      onComponentUnmounted: (componentId) => {
        // 组件卸载时刷新
        this.componentTree.refresh();
      },
      onStateChanged: (record: StateChangeRecord) => {
        // 状态变化时刷新状态检查器
        this.stateInspector.markChanged(`state.${record.path}`);
        this.stateInspector.refresh();
      },
      onEventEmitted: (record: EventRecord) => {
        // 事件触发时刷新事件追踪器
        this.eventTracker.refresh();
      },
    };

    // 连接到应用
    connectToApp(app, callbacks);

    // 更新面板连接状态
    this.panel.setConnected(true);

    console.log('[Lyt DevTools] 已安装到应用。按 Ctrl+Shift+D 切换面板显示。');
  }

  // ============================================================
  // 面板控制
  // ============================================================

  /**
   * 显示面板
   */
  show(): void {
    this.panel.show();
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    this.panel.hide();
  }

  /**
   * 切换面板显示状态
   */
  toggle(): void {
    this.panel.toggle();
  }

  /**
   * 面板是否可见
   */
  isVisible(): boolean {
    return this.panel.isVisible();
  }

  // ============================================================
  // 路由标签页（占位）
  // ============================================================

  /**
   * 渲染路由标签页内容
   * 当前为占位实现，后续可集成 @lytjs/router
   */
  private renderRouterTab(container: HTMLElement): void {
    container.innerHTML = '';

    const empty = document.createElement('div');
    empty.className = 'lyt-devtools-empty';
    empty.style.cssText = 'padding: 40px 24px;';

    empty.innerHTML = `
      <div style="font-size: 32px; margin-bottom: 12px;">\u{1F517}</div>
      <div style="color: #cdd6f4; font-size: 14px; margin-bottom: 8px; font-style: normal;">路由检查器</div>
      <div style="color: #585b70; font-size: 12px;">
        此功能需要安装 @lytjs/router 包。<br>
        路由检查器将显示当前路由信息、<br>
        路由守卫和导航历史。
      </div>
    `;

    container.appendChild(empty);
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 刷新组件树
   */
  refreshTree(): void {
    if (this.app) {
      refreshComponentTree(this.app);
    }
    this.componentTree.refresh();
  }

  /**
   * 清除所有记录（事件和状态变化）
   */
  clearAllRecords(): void {
    clearRecords();
    this.eventTracker.refresh();
    this.stateInspector.refresh();
  }

  /**
   * 获取面板实例（高级用法）
   */
  getPanel(): DevToolsPanel {
    return this.panel;
  }

  /**
   * 获取组件树检查器实例
   */
  getComponentTree(): ComponentTreeInspector {
    return this.componentTree;
  }

  /**
   * 获取状态检查器实例
   */
  getStateInspector(): StateInspector {
    return this.stateInspector;
  }

  /**
   * 获取事件追踪器实例
   */
  getEventTracker(): EventTracker {
    return this.eventTracker;
  }

  /**
   * 获取时间旅行调试器实例
   */
  getTimeTravel(): TimeTravelDebugger {
    return this.timeTravel;
  }

  // ============================================================
  // 销毁
  // ============================================================

  /**
   * 销毁 DevTools
   * 清理所有子模块和 DOM 元素
   */
  destroy(): void {
    this.componentTree.destroy();
    this.stateInspector.destroy();
    this.eventTracker.destroy();
    this.timeTravel.destroy();
    this.panel.destroy();
    disconnect();
    this._installed = false;
    this.app = null;

    console.log('[Lyt DevTools] 已销毁。');
  }
}

// ============================================================
// 插件工厂函数
// ============================================================

/**
 * 创建 DevTools 插件
 *
 * 返回一个符合 Lyt.js 插件接口的对象，可通过 app.use() 安装。
 *
 * @param config - DevTools 配置（可选）
 * @returns DevTools 插件对象
 *
 * @example
 * ```ts
 * import { createDevTools } from '@lytjs/devtools'
 * import { createApp } from '@lytjs/core'
 *
 * const app = createApp({ ... })
 * app.use(createDevTools({ width: 480, height: 640 }))
 * app.mount('#app')
 * ```
 */
export function createDevTools(config?: DevToolsConfig): {
  install: (app: AppAPI) => void;
} {
  let devtools: DevTools | null = null;

  return {
    install(app: AppAPI): void {
      // 避免重复安装
      if (devtools) {
        console.warn('[Lyt DevTools] 已经创建，不能重复安装。');
        return;
      }

      // 创建 DevTools 实例
      devtools = new DevTools(config);

      // 将 DevTools 实例挂载到全局属性上
      // 方便外部访问
      if (app.globalProperties) {
        app.globalProperties.__LYT_DEVTOOLS__ = devtools;
      }

      // 安装到应用
      // 注意：app API 和 LytApp 接口略有不同
      // 这里尝试获取 _instance
      const lytApp = app as any;
      if (lytApp._instance !== undefined || lytApp.mount) {
        devtools.install(lytApp as LytApp);
      }
    },
  };
}

// ============================================================
// 导出
// ============================================================

// 主类（已在上方 export class DevTools 定义处导出）

// 子模块
export { DevToolsPanel } from './panel';
export { ComponentTreeInspector } from './component-tree';
export { StateInspector } from './state-inspector';
export { EventTracker } from './event-tracker';
export { TimeTravelDebugger } from './time-travel';
export { RoutePanel } from './route-panel';
export { PerfPanel } from './perf-panel';
export { PerformanceCollector } from './perf-collector';
export { ComponentProfiler } from './component-profiler';
export { EventPanel } from './event-panel';
export { RouterPanel } from './router-panel-enhanced';
export { VirtualComponentTree } from './virtual-tree';
export { MemoryTracker } from './memory-tracker';
export { RenderTracker } from './render-tracker';
export { BatchAnalyzer } from './batch-analyzer';

// 钩子模块
export {
  connectToApp,
  disconnect,
  getAllComponents,
  getRootComponent,
  getComponentById,
  getChildComponents,
  getEventRecords,
  getStateChangeRecords,
  getComponentStateChanges,
  getComponentEvents,
  selectComponent,
  getSelectedComponent,
  getSelectedComponentId,
  setComponentState,
  refreshComponentTree,
  clearRecords,
  isAppConnected,
  getComponentCount,
} from './hooks';

// 类型导出
export type {
  DevToolsConfig,
  TabType,
} from './panel';

export type {
  ComponentInfo,
  EventRecord,
  StateChangeRecord,
  DevToolsCallbacks,
  LytApp,
} from './hooks';

export type {
  StateSnapshot,
} from './time-travel';

export type {
  RouteHistoryEntry,
  RoutePanelConfig,
} from './route-panel';

export type {
  PerfEntry,
  EnhancedPerfPanelConfig,
} from './perf-panel';

export type {
  Metric,
  FCPMetric,
  INPMetric,
  RenderMetric,
  UpdateFrequencyMetric,
  MemoryMetric,
  CustomMarkMetric,
  FPSMetric,
  PerformanceReport,
} from './perf-collector';

export type {
  RenderRecord,
  ProfileResult,
} from './component-profiler';

export type {
  CapturedEvent,
  EventPanelConfig,
} from './event-panel';

export type {
  RouteLocation,
  RouteNavigation,
  RouterPanelConfig,
} from './router-panel-enhanced';

export type {
  ComponentTreeNode,
  VirtualTreeOptions,
} from './virtual-tree';

export type {
  MemorySnapshot,
  MemoryTrendPoint,
  MemoryLeakResult,
  MemoryReport,
  MemoryTrackerConfig,
} from './memory-tracker';

export type {
  RenderRecord as RenderTrackerRecord,
  SlowRenderEntry,
  RenderComponentStats,
  RenderStats as RenderTrackerStats,
  RenderTimelineEntry,
  RenderTrackerConfig,
} from './render-tracker';

export type {
  BatchRecord,
  BatchNameStats,
  BatchStats,
  AnomalousBatch,
  BatchAnalyzerConfig,
} from './batch-analyzer';
