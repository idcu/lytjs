// packages/renderer/src/client/server-components-client.ts
// Server Components 客户端运行时
// Phase 1.4: 客户端调用服务端组件

// ============================================================
// 类型定义
// ============================================================

/** Server Action 配置 */
export interface ServerActionConfig {
  /** 服务端 action 端点 */
  endpoint?: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 错误处理 */
  onError?: (error: Error) => void;
}

// ============================================================
// 默认配置
// ============================================================

let defaultConfig: ServerActionConfig = {
  endpoint: '/__lytjs_server_action',
  headers: {},
  onError: (error) => console.error('[LytJS Server Action Error]', error),
};

/**
 * 配置 Server Action
 */
export function configureServerAction(config: Partial<ServerActionConfig>): void {
  defaultConfig = { ...defaultConfig, ...config };
}

// ============================================================
// Server Action 调用
// ============================================================

/**
 * 调用服务端函数
 *
 * @example
 * ```ts
 * // 在客户端调用服务端函数
 * const result = await callServer('ProductList', 'fetchProducts', { category: 'electronics' });
 * ```
 */
export async function callServer<T = unknown>(
  componentName: string,
  functionName: string,
  ...args: unknown[]
): Promise<T> {
  const { endpoint, headers, onError } = defaultConfig;

  try {
    const response = await fetch(endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-Component': componentName,
        'X-Server-Function': functionName,
        ...headers,
      },
      body: JSON.stringify({ args }),
    });

    if (!response.ok) {
      throw new Error(
        `Server action failed: ${response.status} ${response.statusText}`
      );
    }

    const result = await response.json();
    return result as T;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    throw err;
  }
}

/**
 * 创建服务端函数代理
 *
 * @example
 * ```ts
 * // 创建类型安全的服务端函数调用
 * const fetchProducts = createServerFunction<Product[]>('ProductList', 'fetchProducts');
 * const products = await fetchProducts({ category: 'electronics' });
 * ```
 */
export function createServerFunction<T>(
  componentName: string,
  functionName: string,
): (...args: unknown[]) => Promise<T> {
  return (...args: unknown[]) => callServer<T>(componentName, functionName, ...args);
}

// ============================================================
// Server Component 数据访问
// ============================================================

/**
 * 获取服务端预取的数据
 */
export function getServerData<T = unknown>(key?: string): T | undefined {
  const serverData = (window as any).__LYTJS_SERVER_DATA__;
  if (!serverData) return undefined;

  if (key) {
    return serverData[key] as T | undefined;
  }

  return serverData as T;
}

/**
 * 检查是否有服务端数据
 */
export function hasServerData(): boolean {
  return !!(window as any).__LYTJS_SERVER_DATA__;
}

// ============================================================
// Server Component Hydration
// ============================================================

/**
 * Hydration 状态
 */
const hydrationState = new Map<string, {
  hydrated: boolean;
  pending: boolean;
  error: Error | null;
}>();

/**
 * 检查组件是否已 hydration
 */
export function isHydrated(componentId: string): boolean {
  return hydrationState.get(componentId)?.hydrated ?? false;
}

/**
 * 标记组件为已 hydration
 */
export function markHydrated(componentId: string): void {
  hydrationState.set(componentId, {
    hydrated: true,
    pending: false,
    error: null,
  });
}

/**
 * 获取 hydration 状态
 */
export function getHydrationState(componentId: string): {
  hydrated: boolean;
  pending: boolean;
  error: Error | null;
} {
  return hydrationState.get(componentId) ?? {
    hydrated: false,
    pending: false,
    error: null,
  };
}

// ============================================================
// 自动 Hydration
// ============================================================

/**
 * 自动 hydrate 所有 Server Components
 */
export async function autoHydrate(): Promise<void> {
  // 查找所有需要 hydration 的元素
  const elements = document.querySelectorAll('[data-server-component]');

  for (const el of elements) {
    const componentId = el.getAttribute('data-server-component');
    if (!componentId) continue;

    // 检查是否已 hydration
    if (isHydrated(componentId)) continue;

    // 标记为 pending
    hydrationState.set(componentId, {
      hydrated: false,
      pending: true,
      error: null,
    });

    try {
      // 动态导入组件
      const module = await import(/* @vite-ignore */ `/components/${componentId}.client.js`);

      if (module.default && typeof module.default.hydrate === 'function') {
        await module.default.hydrate(el);
      }

      markHydrated(componentId);
    } catch (error) {
      hydrationState.set(componentId, {
        hydrated: false,
        pending: false,
        error: error instanceof Error ? error : new Error(String(error)),
      });

      console.error(`[LytJS] Failed to hydrate ${componentId}:`, error);
    }
  }
}

// ============================================================
// 初始化
// ============================================================

// 自动执行 hydration
if (typeof document !== 'undefined' && document.readyState === 'complete') {
  autoHydrate();
} else if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', autoHydrate);
}

// ============================================================
// 导出
// ============================================================

export {
  callServer,
  createServerFunction,
  getServerData,
  hasServerData,
  isHydrated,
  markHydrated,
  getHydrationState,
  autoHydrate,
  configureServerAction,
};
