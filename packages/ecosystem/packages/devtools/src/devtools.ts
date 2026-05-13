/**
 * @lytjs/devtools - 开发者工具主入口
 */

import type { DevToolsOptions, DevToolsAPI } from './types';
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
} from './routeInspector';

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

    console.log('[LytJS DevTools] Initialized. Press Ctrl+Shift+D to toggle.');
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
};

export type { DevToolsOptions, DevToolsAPI };
