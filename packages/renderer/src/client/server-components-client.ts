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
      // ★ 2026-10-25：错误消息统一为「服务端函数 <名字> 失败」——`callServer` 与
      //   `createServerProxy` 现在共用这一条路径（见下方 `createServerProxy`），
      //   消息里带上函数名比只给状态码可定位得多。
      const status = typeof response.status === 'number' ? `${response.status} ` : '';
      throw new Error(
        `[LytJS] Server function ${functionName} failed: ${status}${response.statusText ?? ''}`,
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
 *
 * ⚠️ 无 `window`（Node / 边缘运行时）时返回 `undefined`，**不抛 `ReferenceError`**。
 *    本模块末尾用 `typeof document !== 'undefined'` 判过环境，说明「可以非浏览器导入」；
 *    既然如此，这里直接写 `window.__LYTJS_SERVER_DATA__` 就自相矛盾。
 */
export function getServerData<T = unknown>(key?: string): T | undefined {
  const serverData = serverDataRoot();
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
  return !!serverDataRoot();
}

/** 读取注入的 `__LYTJS_SERVER_DATA__`（无 `window` 时为 `undefined`） */
function serverDataRoot(): Record<string, unknown> | undefined {
  if (typeof window === 'undefined') return undefined;
  const root = (window as unknown as { __LYTJS_SERVER_DATA__?: unknown }).__LYTJS_SERVER_DATA__;
  return root && typeof root === 'object' ? (root as Record<string, unknown>) : undefined;
}

// ============================================================
// Server Component Hydration
// ============================================================

/**
 * Hydration 状态
 */
const hydrationState = new Map<
  string,
  {
    hydrated: boolean;
    pending: boolean;
    error: Error | null;
  }
>();

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
 *
 * ⚠️ 返回**副本**：此前直接把 `Map` 里那个对象交出去，调用方（面板、调试器）
 * 只要改一下 `state.hydrated` 就篡改了内部状态机，`isHydrated()` 随之说谎。
 */
export function getHydrationState(componentId: string): {
  hydrated: boolean;
  pending: boolean;
  error: Error | null;
} {
  const state = hydrationState.get(componentId);
  if (!state) {
    return { hydrated: false, pending: false, error: null };
  }
  return { hydrated: state.hydrated, pending: state.pending, error: state.error };
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

/**
 * 创建客户端代理
 * 用于在客户端调用服务端函数
 *
 * ★ 2026-10-21：编译器生成的**客户端桩**写的是
 *   `import { createServerProxy } from '@lytjs/renderer/client'`
 *   （见 `compiler/src/server-components`），但本模块没有这个函数、包也没有 `./client`
 *   子路径导出 ⇒ 桩文件连 import 都解析不到。这里补齐实现（它做的是 `fetch`，
 *   本来就是**客户端**行为），并在 `package.json` 的 `exports` 里开 `./client`。
 */
export function createServerProxy<T extends (...args: unknown[]) => Promise<unknown>>(
  componentName: string,
  functionName: string,
): T {
  // ★ 2026-10-25（ADR 0011）：此前这里是 `callServer` 的**第二份实现** —— 自己拼了一份
  //   `fetch`，因此**完全无视** `configureServerAction()`：自定义 `endpoint` 不生效
  //   （照旧打 `/__lytjs_server_action`）、`headers` 丢失、`onError` 不触发。
  //   而编译器生成的客户端桩走的正是这个函数（`@lytjs/renderer/client`），
  //   即"配置了却不生效"发生在**主路径**上。收敛为单一实现，两者行为从此一致。
  return ((...args: unknown[]) => callServer(componentName, functionName, ...args)) as T;
}

// ============================================================
// 导出（函数已在上面定义）
// ============================================================
