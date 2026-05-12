// packages/renderer/src/vapor/vapor-hmr.ts
// Vapor 模式 HMR (Hot Module Replacement) 支持
// Phase 1.2: 实现 Vapor 组件热更新，保持组件状态

import type { VaporComponentDefinition } from './vapor-app';

// ============================================================
// HMR 类型定义
// ============================================================

/** HMR 更新类型 */
export type HMRUpdateType = 'template' | 'script' | 'style' | 'full';

/** HMR 更新信息 */
export interface HMRUpdate {
  type: HMRUpdateType;
  componentId: string;
  oldComponent: VaporComponentDefinition | null;
  newComponent: VaporComponentDefinition;
  timestamp: number;
}

/** HMR 状态保留策略 */
export interface HMRStatePreservation {
  /** 是否保留 ref 状态 */
  refs: boolean;
  /** 是否保留 reactive 状态 */
  reactive: boolean;
  /** 是否保留 computed 缓存 */
  computed: boolean;
  /** 是否保留 watch 副作用 */
  watches: boolean;
}

/** 默认状态保留策略 */
export const DEFAULT_STATE_PRESERVATION: HMRStatePreservation = {
  refs: true,
  reactive: true,
  computed: true,
  watches: false, // watch 通常需要重新创建
};

// ============================================================
// HMR 组件注册表
// ============================================================

/** 组件实例信息 */
interface ComponentInstance {
  id: string;
  component: VaporComponentDefinition;
  container: Element;
  state: Map<string, unknown>;
  mounted: boolean;
}

/** 组件注册表 */
const componentRegistry = new Map<string, ComponentInstance>();

/** 组件 ID 计数器 */
let componentIdCounter = 0;

/**
 * 生成唯一的组件 ID
 */
export function generateComponentId(): string {
  return `vapor-c-${++componentIdCounter}`;
}

/**
 * 注册组件实例
 */
export function registerComponent(
  id: string,
  component: VaporComponentDefinition,
  container: Element,
): void {
  componentRegistry.set(id, {
    id,
    component,
    container,
    state: new Map(),
    mounted: true,
  });
}

/**
 * 注销组件实例
 */
export function unregisterComponent(id: string): void {
  componentRegistry.delete(id);
}

/**
 * 获取组件实例
 */
export function getComponentInstance(id: string): ComponentInstance | undefined {
  return componentRegistry.get(id);
}

/**
 * 获取所有已注册的组件 ID
 */
export function getRegisteredComponentIds(): string[] {
  return Array.from(componentRegistry.keys());
}

// ============================================================
// 状态快照
// ============================================================

/**
 * 捕获组件状态快照
 */
export function captureStateSnapshot(id: string): Map<string, unknown> | null {
  const instance = componentRegistry.get(id);
  if (!instance) return null;

  // 返回状态副本
  return new Map(instance.state);
}

/**
 * 恢复组件状态
 */
export function restoreStateSnapshot(
  id: string,
  snapshot: Map<string, unknown>,
): boolean {
  const instance = componentRegistry.get(id);
  if (!instance) return false;

  // 合并状态
  for (const [key, value] of snapshot) {
    instance.state.set(key, value);
  }

  return true;
}

// ============================================================
// HMR 更新处理
// ============================================================

/** HMR 更新监听器 */
type HMRUpdateListener = (update: HMRUpdate) => void;

const hmrListeners = new Set<HMRUpdateListener>();

/**
 * 添加 HMR 更新监听器
 */
export function onHMRUpdate(listener: HMRUpdateListener): () => void {
  hmrListeners.add(listener);
  return () => hmrListeners.delete(listener);
}

/**
 * 触发 HMR 更新
 */
function emitHMRUpdate(update: HMRUpdate): void {
  for (const listener of hmrListeners) {
    try {
      listener(update);
    } catch (error) {
      console.error('[LytJS HMR] Listener error:', error);
    }
  }
}

/**
 * 处理组件更新
 * 
 * @param componentId 组件 ID
 * @param newComponent 新组件定义
 * @param updateType 更新类型
 * @param preservation 状态保留策略
 * @returns 是否成功更新
 */
export function handleComponentUpdate(
  componentId: string,
  newComponent: VaporComponentDefinition,
  updateType: HMRUpdateType,
  _preservation: HMRStatePreservation = DEFAULT_STATE_PRESERVATION,
): boolean {
  const instance = componentRegistry.get(componentId);
  if (!instance) {
    console.warn(`[LytJS HMR] Component not found: ${componentId}`);
    return false;
  }

  const oldComponent = instance.component;

  // 如果需要完全重新加载
  if (updateType === 'full') {
    // 触发更新事件
    emitHMRUpdate({
      type: 'full',
      componentId,
      oldComponent,
      newComponent,
      timestamp: Date.now(),
    });

    // 完全重新加载需要页面刷新
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    }
    return true;
  }

  // 捕获当前状态
  const stateSnapshot = captureStateSnapshot(componentId);

  // 更新组件定义
  instance.component = newComponent;

  // 根据更新类型处理
  switch (updateType) {
    case 'template':
      // 模板更新：重新渲染，保留状态
      if (stateSnapshot) {
        restoreStateSnapshot(componentId, stateSnapshot);
      }
      break;

    case 'script':
      // 脚本更新：需要完全重新加载
      emitHMRUpdate({
        type: 'script',
        componentId,
        oldComponent,
        newComponent,
        timestamp: Date.now(),
      });
      // 脚本变更通常需要完全重新加载
      if (typeof window !== 'undefined' && window.location) {
        window.location.reload();
      }
      return true;

    case 'style':
      // 样式更新：不需要重新渲染组件
      break;
  }

  // 触发更新事件
  emitHMRUpdate({
    type: updateType,
    componentId,
    oldComponent,
    newComponent,
    timestamp: Date.now(),
  });

  return true;
}

// ============================================================
// Vite HMR 集成
// ============================================================

/**
 * 创建 Vite HMR accept 处理器
 * 
 * 用于在组件中调用：
 * ```ts
 * if (import.meta.hot) {
 *   import.meta.hot.accept((newModule) => {
 *     createVaporHMRHandler('my-component-id')(newModule);
 *   });
 * }
 * ```
 */
export function createVaporHMRHandler(componentId: string) {
  return (newModule: { default: VaporComponentDefinition } | null) => {
    if (!newModule) {
      console.warn(`[LytJS HMR] No new module for ${componentId}`);
      return;
    }

    const newComponent = newModule.default;
    if (!newComponent) {
      console.warn(`[LytJS HMR] No default export in new module for ${componentId}`);
      return;
    }

    // 检测更新类型
    const instance = componentRegistry.get(componentId);
    if (!instance) {
      console.warn(`[LytJS HMR] Component instance not found: ${componentId}`);
      return;
    }

    const oldComponent = instance.component;

    // 检测模板变化
    const templateChanged = oldComponent.template !== newComponent.template;

    // 检测 setup 变化（脚本变化）
    const setupChanged =
      oldComponent.setup?.toString() !== newComponent.setup?.toString();

    // 确定更新类型
    let updateType: HMRUpdateType;
    if (setupChanged) {
      updateType = 'script';
    } else if (templateChanged) {
      updateType = 'template';
    } else {
      updateType = 'style';
    }

    handleComponentUpdate(componentId, newComponent, updateType);
  };
}

/**
 * 生成 HMR 代码
 * 
 * 在编译时注入到组件代码中
 */
export function generateHMRCode(componentId: string): string {
  return `
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule && newModule.default) {
      const instance = window.__LYTJS_HMR_REGISTRY__?.get('${componentId}');
      if (instance) {
        instance.component = newModule.default;
        // 触发重新渲染
        if (instance.container && instance.component.template) {
          // Vapor 模式会自动通过 effect 重新渲染
        }
      }
    }
  });
}
`;
}

// ============================================================
// 全局 HMR 注册表
// ============================================================

// 在浏览器环境中创建全局注册表
if (typeof window !== 'undefined') {
  (window as any).__LYTJS_HMR_REGISTRY__ = componentRegistry;
}

// ============================================================
// HMR 工具函数
// ============================================================

/**
 * 检测是否支持 HMR
 */
export function isHMRAvailable(): boolean {
  return typeof import.meta !== 'undefined' && !!(import.meta as any).hot;
}

/**
 * 手动触发组件重新渲染
 */
export function forceRerender(componentId: string): boolean {
  const instance = componentRegistry.get(componentId);
  if (!instance) return false;

  // 触发重新渲染
  emitHMRUpdate({
    type: 'template',
    componentId,
    oldComponent: instance.component,
    newComponent: instance.component,
    timestamp: Date.now(),
  });

  return true;
}

/**
 * 清理所有 HMR 状态
 */
export function clearHMRState(): void {
  componentRegistry.clear();
  hmrListeners.clear();
  componentIdCounter = 0;
}
