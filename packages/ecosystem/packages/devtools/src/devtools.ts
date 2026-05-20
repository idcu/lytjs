/**
 * @lytjs/devtools - 开发者工具主入口
 */

import type { DevToolsOptions, DevToolsAPI, SignalNode } from './types';
import {
  getComponentTree,
  serializeComponentTree,
  registerRootComponent,
  unregisterRootComponent,
} from './componentTree';
import {
  getStoreStates,
  getStoreState,
  setStoreState,
  dispatchStoreAction,
  serializeStoreStates,
  registerStore,
  unregisterStore,
  getRegisteredStoreIds,
  clearStoreRegistry,
  subscribeStore,
  unsubscribeStore,
  onStoreChange,
} from './storeInspector';
import {
  getCurrentRoute,
  navigateTo,
  navigateToName,
  goBack,
  serializeRouteInfo,
  getRoutes,
  registerRouter,
  unregisterRouter,
  isRouterRegistered,
  watchRouteChanges,
  unwatchRouteChanges,
  getRouteHistory,
  clearRouteHistory,
} from './routeInspector';
import {
  getSignalNodes,
  getSignalNode,
  getDependencyGraph,
  createSnapshot,
  getSnapshots,
  getTimeTravelState,
  restoreSnapshot,
  clearSnapshots,
  getPerformanceStats,
  getPerformanceRecords,
  clearPerformanceRecords,
  serializeSignalNode,
  serializeDependencyGraph,
  serializePerformanceStats,
  registerSignal,
  unregisterSignal,
  recordSignalUpdate,
  recordDependency,
  clearSignalRegistry,
} from './signalsInspector';
import { getVDOMTree, getVDOMStats, serializeVDOMTree } from './vdomInspector';

// DevTools 实例
let devtoolsInstance: DevTools | null = null;

/**
 * DevTools 类
 */
class DevTools implements DevToolsAPI {
  private options: Required<DevToolsOptions>;
  private isOpen = false;

  constructor(options: DevToolsOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      position: options.position ?? 'right',
      size: options.size ?? 300,
    };

    if (this.options.enabled) {
      this.init();
    }
  }

  /**
   * 初始化 DevTools
   */
  private init(): void {
    if (typeof window === 'undefined') return;

    // 创建面板
    this.createPanel();

    // 添加键盘快捷键（Ctrl+Shift+D 或 Cmd+Shift+D）
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.toggle();
      }
    });

    console.warn('[LytJS DevTools] Initialized. Press Ctrl+Shift+D to toggle.');
  }

  /**
   * 创建 DevTools 面板
   */
  private createPanel(): void {
    if (typeof document === 'undefined') return;

    // 检查是否已存在
    if (document.getElementById('lytjs-devtools')) return;

    const panel = document.createElement('div');
    panel.id = 'lytjs-devtools';
    panel.style.cssText = `
      position: fixed;
      top: 0;
      ${this.options.position}: -${this.options.size}px;
      width: ${this.options.size}px;
      height: 100vh;
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 12px;
      z-index: 999999;
      transition: ${this.options.position} 0.3s ease;
      display: flex;
      flex-direction: column;
      box-shadow: 2px 0 8px rgba(0,0,0,0.3);
    `;

    // 头部
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 10px 15px;
      background: #2d2d2d;
      border-bottom: 1px solid #3d3d3d;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span style="font-weight: bold; color: #4fc08d;">🛠️ LytJS DevTools</span>
      <button id="lytjs-devtools-close" style="
        background: transparent;
        border: none;
        color: #d4d4d4;
        cursor: pointer;
        font-size: 16px;
      ">✕</button>
    `;

    // 标签页
    const tabs = document.createElement('div');
    tabs.style.cssText = `
      display: flex;
      background: #252526;
      border-bottom: 1px solid #3d3d3d;
    `;
    tabs.innerHTML = `
      <button class="lytjs-devtools-tab active" data-tab="components" style="
        flex: 1;
        padding: 10px;
        background: #1e1e1e;
        border: none;
        color: #d4d4d4;
        cursor: pointer;
        border-bottom: 2px solid #4fc08d;
      ">Components</button>
      <button class="lytjs-devtools-tab" data-tab="store" style="
        flex: 1;
        padding: 10px;
        background: transparent;
        border: none;
        color: #d4d4d4;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      ">Store</button>
      <button class="lytjs-devtools-tab" data-tab="router" style="
        flex: 1;
        padding: 10px;
        background: transparent;
        border: none;
        color: #d4d4d4;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      ">Router</button>
      <button class="lytjs-devtools-tab" data-tab="signals" style="
        flex: 1;
        padding: 10px;
        background: transparent;
        border: none;
        color: #d4d4d4;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      ">Signals</button>
      <button class="lytjs-devtools-tab" data-tab="vdom" style="
        flex: 1;
        padding: 10px;
        background: transparent;
        border: none;
        color: #d4d4d4;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      ">VDOM</button>
      <button class="lytjs-devtools-tab" data-tab="performance" style="
        flex: 1;
        padding: 10px;
        background: transparent;
        border: none;
        color: #d4d4d4;
        cursor: pointer;
        border-bottom: 2px solid transparent;
      ">Performance</button>
    `;

    // 内容区域
    const content = document.createElement('div');
    content.id = 'lytjs-devtools-content';
    content.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 15px;
    `;

    panel.appendChild(header);
    panel.appendChild(tabs);
    panel.appendChild(content);
    document.body.appendChild(panel);

    // 绑定事件
    document.getElementById('lytjs-devtools-close')?.addEventListener('click', () => this.close());

    tabs.querySelectorAll('.lytjs-devtools-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const tabName = target.dataset.tab;

        tabs.querySelectorAll('.lytjs-devtools-tab').forEach((t) => {
          (t as HTMLElement).style.background = 'transparent';
          (t as HTMLElement).style.borderBottomColor = 'transparent';
        });
        target.style.background = '#1e1e1e';
        target.style.borderBottomColor = '#4fc08d';

        this.renderTab(tabName || 'components');
      });
    });

    this.renderTab('components');
  }

  /**
   * 渲染标签页内容
   */
  private renderTab(tab: string): void {
    const content = document.getElementById('lytjs-devtools-content');
    if (!content) return;

    switch (tab) {
      case 'components':
        content.innerHTML = this.renderComponentsTab();
        break;
      case 'store':
        content.innerHTML = this.renderStoreTab();
        break;
      case 'router':
        content.innerHTML = this.renderRouterTab();
        break;
      case 'signals':
        content.innerHTML = this.renderSignalsTab();
        break;
      case 'vdom':
        content.innerHTML = this.renderVDOMTab();
        break;
      case 'performance':
        content.innerHTML = this.renderPerformanceTab();
        break;
    }
  }

  /**
   * 渲染组件标签页
   */
  private renderComponentsTab(): string {
    const tree = getComponentTree();
    if (tree.length === 0) {
      return '<div style="color: #666; text-align: center; padding: 40px;">No components found.<br>Register your root component with registerRootComponent().</div>';
    }
    return `<pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${serializeComponentTree(tree)}</pre>`;
  }

  /**
   * 渲染 Store 标签页
   */
  private renderStoreTab(): string {
    const states = getStoreStates();
    if (states.length === 0) {
      return '<div style="color: #666; text-align: center; padding: 40px;">No stores registered.<br>Use registerStore() to register your stores.</div>';
    }

    let html = '<div style="margin-bottom: 10px;">';
    html += `<strong>Registered Stores:</strong> ${getRegisteredStoreIds().join(', ')}`;
    html += '</div>';
    html += `<pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${serializeStoreStates(states)}</pre>`;
    return html;
  }

  /**
   * 渲染 Signals 标签页
   */
  private renderSignalsTab(): string {
    const nodes = getSignalNodes();

    const html = `
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <strong>📊 Signals (${nodes.length})</strong>
          <div>
            <button id="lytjs-devtools-create-snapshot" style="
              background: #4fc08d;
              border: none;
              color: white;
              padding: 5px 10px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 11px;
            ">创建快照</button>
            <button id="lytjs-devtools-clear-signals" style="
              background: #ff4d4f;
              border: none;
              color: white;
              padding: 5px 10px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 11px;
              margin-left: 5px;
            ">清空</button>
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
          <button id="lytjs-devtools-tab-signals-list" style="
            flex: 1;
            padding: 8px;
            background: #4fc08d;
            border: none;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
          ">列表视图</button>
          <button id="lytjs-devtools-tab-signals-graph" style="
            flex: 1;
            padding: 8px;
            background: #333;
            border: none;
            color: #d4d4d4;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
          ">依赖图</button>
          <button id="lytjs-devtools-tab-signals-timetravel" style="
            flex: 1;
            padding: 8px;
            background: #333;
            border: none;
            color: #d4d4d4;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
          ">时间旅行</button>
        </div>
        
        <div id="lytjs-devtools-signals-content">
          ${this.renderSignalsList(nodes)}
        </div>
      </div>
    `;

    return html;
  }

  /**
   * 渲染信号列表
   */
  private renderSignalsList(nodes: SignalNode[]): string {
    if (nodes.length === 0) {
      return '<div style="color: #666; text-align: center; padding: 40px;">暂无信号数据<br>使用 registerSignal() 注册信号</div>';
    }

    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    nodes.forEach((node) => {
      const typeIcon = node.type === 'signal' ? '📌' : node.type === 'computed' ? '🧮' : '⚡';
      const typeColor =
        node.type === 'signal' ? '#4fc08d' : node.type === 'computed' ? '#1890ff' : '#faad14';

      html += `
        <div style="
          background: #252526;
          border-radius: 4px;
          padding: 10px;
          margin-bottom: 8px;
          border-left: 3px solid ${typeColor};
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold;">${typeIcon} ${node.name}</span>
            <span style="color: #888; font-size: 10px;">${node.type}</span>
          </div>
          <div style="color: #888; font-size: 11px; margin-top: 5px;">
            更新次数: ${node.updateCount} | 
            最后更新: ${node.lastUpdateTime ? new Date(node.lastUpdateTime).toLocaleTimeString() : 'N/A'}
          </div>
          ${node.averageUpdateTime > 0 ? `<div style="color: #888; font-size: 11px;">平均耗时: ${node.averageUpdateTime.toFixed(2)}ms</div>` : ''}
          <div style="color: #888; font-size: 10px; margin-top: 5px;">
            依赖: ${node.dependencies.length > 0 ? node.dependencies.join(', ') : '无'} |
            被依赖: ${node.dependents.length > 0 ? node.dependents.join(', ') : '无'}
          </div>
        </div>
      `;
    });
    html += '</div>';

    return html;
  }

  /**
   * 渲染 VDOM 标签页
   */
  private renderVDOMTab(): string {
    const roots = getVDOMTree();
    const stats = getVDOMStats();

    if (roots.length === 0) {
      return `
        <div style="color: #666; text-align: center; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 15px;">🌳</div>
          <div>No VDOM roots registered.</div>
          <div style="font-size: 11px; margin-top: 10px; color: #555;">
            Use registerVDOMRoot() to register your VDOM roots.
          </div>
        </div>
      `;
    }

    const html = `
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <strong>🌳 VDOM Tree</strong>
          <button id="lytjs-devtools-clear-vdom" style="
            background: #ff4d4f;
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
          ">清空</button>
        </div>
        
        <div style="background: #252526; border-radius: 4px; padding: 15px; margin-bottom: 15px;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
            <div>
              <div style="color: #888; font-size: 11px;">总节点数</div>
              <div style="font-size: 20px; font-weight: bold; color: #4fc08d;">${stats.totalNodes}</div>
            </div>
            <div>
              <div style="color: #888; font-size: 11px;">组件数</div>
              <div style="font-size: 20px; font-weight: bold; color: #1890ff;">${stats.componentCount}</div>
            </div>
            <div>
              <div style="color: #888; font-size: 11px;">元素数</div>
              <div style="font-size: 20px; font-weight: bold; color: #faad14;">${stats.elementCount}</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center; margin-top: 10px;">
            <div>
              <div style="color: #888; font-size: 11px;">文本节点</div>
              <div style="font-size: 16px; font-weight: bold; color: #888;">${stats.textCount}</div>
            </div>
            <div>
              <div style="color: #888; font-size: 11px;">根节点</div>
              <div style="font-size: 16px; font-weight: bold; color: #888;">${stats.rootCount}</div>
            </div>
            <div>
              <div style="color: #888; font-size: 11px;">最大深度</div>
              <div style="font-size: 16px; font-weight: bold; color: #888;">${stats.maxDepth}</div>
            </div>
          </div>
        </div>
        
        <div style="margin-bottom: 10px;">
          <input id="lytjs-devtools-vdom-search" type="text" placeholder="搜索标签名..." style="
            width: 100%;
            padding: 8px;
            background: #252526;
            border: 1px solid #3d3d3d;
            border-radius: 4px;
            color: #d4d4d4;
            font-size: 12px;
          " />
        </div>
        
        <div id="lytjs-devtools-vdom-tree" style="
          background: #252526;
          border-radius: 4px;
          padding: 15px;
          max-height: 400px;
          overflow: auto;
          font-family: 'Consolas', 'Monaco', monospace;
          font-size: 11px;
          line-height: 1.6;
        ">
          <pre style="margin: 0; white-space: pre-wrap; word-break: break-all;">${serializeVDOMTree()}</pre>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * 渲染 Performance 标签页
   */
  private renderPerformanceTab(): string {
    const stats = getPerformanceStats();
    const records = getPerformanceRecords(50);

    let html = `
      <div style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <strong>⚡ Performance</strong>
          <button id="lytjs-devtools-clear-performance" style="
            background: #ff4d4f;
            border: none;
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
          ">清空记录</button>
        </div>
        
        <div style="background: #252526; border-radius: 4px; padding: 15px; margin-bottom: 15px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div style="text-align: center;">
              <div style="color: #888; font-size: 11px;">总记录数</div>
              <div style="font-size: 24px; font-weight: bold; color: #4fc08d;">${stats.totalRecords}</div>
            </div>
            <div style="text-align: center;">
              <div style="color: #888; font-size: 11px;">平均耗时</div>
              <div style="font-size: 24px; font-weight: bold; color: #1890ff;">${stats.averageDuration.toFixed(2)}ms</div>
            </div>
            <div style="text-align: center;">
              <div style="color: #888; font-size: 11px;">最大耗时</div>
              <div style="font-size: 24px; font-weight: bold; color: #ff4d4f;">${stats.maxDuration.toFixed(2)}ms</div>
            </div>
            <div style="text-align: center;">
              <div style="color: #888; font-size: 11px;">最小耗时</div>
              <div style="font-size: 24px; font-weight: bold; color: #52c41a;">${stats.minDuration.toFixed(2)}ms</div>
            </div>
          </div>
        </div>
    `;

    if (Object.keys(stats.byType).length > 0) {
      html += `
        <div style="margin-bottom: 15px;">
          <strong style="display: block; margin-bottom: 10px;">按类型统计</strong>
          <div style="background: #252526; border-radius: 4px; padding: 10px;">
      `;

      Object.entries(stats.byType).forEach(([type, data]) => {
        const typeColor =
          type === 'signal' ? '#4fc08d' : type === 'computed' ? '#1890ff' : '#faad14';
        html += `
          <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333;">
            <span style="color: ${typeColor};">${type}</span>
            <span>${data.count} 次 | 平均 ${data.average.toFixed(2)}ms | 最大 ${data.max.toFixed(2)}ms</span>
          </div>
        `;
      });

      html += '</div></div>';
    }

    if (records.length > 0) {
      html += `
        <div>
          <strong style="display: block; margin-bottom: 10px;">最近记录 (50条)</strong>
          <div style="background: #252526; border-radius: 4px; padding: 10px; max-height: 300px; overflow-y: auto;">
      `;

      records
        .slice()
        .reverse()
        .forEach((record) => {
          const durationColor =
            record.duration > 16 ? '#ff4d4f' : record.duration > 8 ? '#faad14' : '#4fc08d';
          html += `
          <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #333; font-size: 11px;">
            <span>${record.name}</span>
            <span style="color: ${durationColor};">${record.duration.toFixed(2)}ms</span>
            <span style="color: #888;">${new Date(record.timestamp).toLocaleTimeString()}</span>
          </div>
        `;
        });

      html += '</div></div>';
    } else {
      html += '<div style="color: #666; text-align: center; padding: 40px;">暂无性能数据</div>';
    }

    html += '</div>';

    return html;
  }

  /**
   * 渲染 Router 标签页
   */
  private renderRouterTab(): string {
    if (!isRouterRegistered()) {
      return '<div style="color: #666; text-align: center; padding: 40px;">Router not registered.<br>Use registerRouter() to register your router.</div>';
    }

    const route = getCurrentRoute();
    const routes = getRoutes();

    let html = '<div style="margin-bottom: 15px;">';
    html += '<strong>Current Route:</strong>';
    html += '</div>';
    html += `<pre style="margin: 0 0 15px 0; white-space: pre-wrap; word-break: break-all; background: #252526; padding: 10px; border-radius: 4px;">${serializeRouteInfo(route)}</pre>`;

    if (routes.length > 0) {
      html += '<div style="margin-bottom: 10px;">';
      html += '<strong>All Routes:</strong>';
      html += '</div>';
      html += '<ul style="margin: 0; padding-left: 20px;">';
      for (const r of routes) {
        html += `<li>${r.path}${r.name ? ` (${r.name})` : ''}</li>`;
      }
      html += '</ul>';
    }

    return html;
  }

  /**
   * 打开面板
   */
  open(): void {
    if (!this.options.enabled) return;

    const panel = document.getElementById('lytjs-devtools');
    if (panel) {
      panel.style[this.options.position] = '0';
      this.isOpen = true;
      this.refresh();
    }
  }

  /**
   * 关闭面板
   */
  close(): void {
    if (typeof document === 'undefined') return;
    const panel = document.getElementById('lytjs-devtools');
    if (panel) {
      panel.style[this.options.position] = `-${this.options.size}px`;
      this.isOpen = false;
    }
  }

  /**
   * 切换面板
   */
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * 刷新内容
   */
  refresh(): void {
    const activeTab = document.querySelector('.lytjs-devtools-tab.active') as HTMLElement;
    if (activeTab) {
      this.renderTab(activeTab.dataset.tab || 'components');
    }
  }

  // API 方法
  getComponentTree = getComponentTree;
  getStoreStates = getStoreStates;
  getCurrentRoute = getCurrentRoute;
}

/**
 * 安装 DevTools
 */
export function installDevTools(options?: DevToolsOptions): DevToolsAPI {
  if (!devtoolsInstance) {
    devtoolsInstance = new DevTools(options);
  }
  return devtoolsInstance;
}

/**
 * 获取 DevTools 实例
 */
export function getDevTools(): DevToolsAPI | null {
  return devtoolsInstance;
}

/**
 * 卸载 DevTools
 */
export function uninstallDevTools(): void {
  if (devtoolsInstance) {
    devtoolsInstance.close();
    devtoolsInstance = null;
  }

  if (typeof document !== 'undefined') {
    const panel = document.getElementById('lytjs-devtools');
    if (panel) {
      panel.remove();
    }
  }
}

// 重新导出所有功能
export {
  // 组件树
  getComponentTree,
  serializeComponentTree,
  registerRootComponent,
  unregisterRootComponent,

  // Store 检查器
  getStoreStates,
  getStoreState,
  setStoreState,
  dispatchStoreAction,
  serializeStoreStates,
  registerStore,
  unregisterStore,
  getRegisteredStoreIds,
  clearStoreRegistry,
  subscribeStore,
  unsubscribeStore,
  onStoreChange,

  // 路由检查器
  getCurrentRoute,
  navigateTo,
  navigateToName,
  goBack,
  serializeRouteInfo,
  getRoutes,
  registerRouter,
  unregisterRouter,
  isRouterRegistered,
  watchRouteChanges,
  unwatchRouteChanges,
  getRouteHistory,
  clearRouteHistory,

  // 信号检查器
  getSignalNodes,
  getSignalNode,
  getDependencyGraph,
  createSnapshot,
  getSnapshots,
  getTimeTravelState,
  restoreSnapshot,
  clearSnapshots,
  getPerformanceStats,
  getPerformanceRecords,
  clearPerformanceRecords,
  serializeSignalNode,
  serializeDependencyGraph,
  serializePerformanceStats,
  registerSignal,
  unregisterSignal,
  recordSignalUpdate,
  recordDependency,
  clearSignalRegistry,
};

// 性能监控
export {
  initPerformanceMonitor,
  recordMetric,
  getMetrics,
  getStats,
  registerAlertRule,
  unregisterAlertRule,
  setAlertRuleEnabled,
  getAlertRules,
  getAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  clearAlerts,
  addObserver,
  removeObserver,
  clearMetrics,
  resetPerformanceMonitor,
  getPerformanceReport,
  serializePerformanceReport,
  startTimer,
} from './performance';

export type {
  MetricType,
  PerformanceMetric,
  AlertLevel,
  AlertRule,
  Alert,
  PerformanceStats,
  MonitorOptions,
} from './performance';

// 基准测试
export {
  runBenchmark,
  runAsyncBenchmark,
  getBenchmarkResults,
  getLatestBenchmarkResult,
  clearBenchmarkResults,
  serializeBenchmarkResult,
  serializeAllBenchmarkResults,
  compareBenchmarkResults,
  createLargeScaleBenchmark,
  getMemoryUsage,
  serializeMemoryUsage,
  createRegressionDetector,
  LARGE_SCALE_SCENARIOS,
} from './benchmark';

export type {
  BenchmarkResult,
  BenchmarkConfig,
  LargeScaleScenario,
  MemoryUsage,
} from './benchmark';

export type { DevToolsOptions, DevToolsAPI };
