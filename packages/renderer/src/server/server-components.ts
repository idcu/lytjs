// packages/renderer/src/server/server-components.ts
// Server Components 运行时支持
// Phase 1.4: 服务端组件运行时

import type { VaporComponentDefinition } from '../vapor/vapor-app';

// ============================================================
// 类型定义
// ============================================================

/** Server Component 定义 */
export interface ServerComponentDefinition {
  /** 组件 ID */
  id: string;
  /** 组件名称 */
  name: string;
  /** 渲染函数 */
  render: () => Promise<string>;
  /** 数据获取函数 */
  fetchData?: () => Promise<Record<string, unknown>>;
  /** 序列化数据 */
  serializeData?: () => string;
}

/** Server Action 请求 */
export interface ServerActionRequest {
  /** 组件名称 */
  componentName: string;
  /** 函数名称 */
  functionName: string;
  /** 参数 */
  args: unknown[];
}

/** Server Action 响应 */
export interface ServerActionResponse {
  /** 是否成功 */
  success: boolean;
  /** 返回数据 */
  data?: unknown;
  /** 错误信息 */
  error?: string;
}

/** Server Component 注册表 */
interface ServerComponentRegistry {
  components: Map<string, ServerComponentDefinition>;
  functions: Map<string, Map<string, (...args: unknown[]) => Promise<unknown>>>;
}

// ============================================================
// 全局注册表
// ============================================================

const registry: ServerComponentRegistry = {
  components: new Map(),
  functions: new Map(),
};

// ============================================================
// 组件注册
// ============================================================

/**
 * 注册 Server Component
 */
export function registerServerComponent(
  component: ServerComponentDefinition,
): void {
  registry.components.set(component.id, component);
}

/**
 * 注册服务端函数
 */
export function registerServerFunction(
  componentId: string,
  functionName: string,
  fn: (...args: unknown[]) => Promise<unknown>,
): void {
  if (!registry.functions.has(componentId)) {
    registry.functions.set(componentId, new Map());
  }
  registry.functions.get(componentId)!.set(functionName, fn);
}

/**
 * 获取 Server Component
 */
export function getServerComponent(id: string): ServerComponentDefinition | undefined {
  return registry.components.get(id);
}

/**
 * 获取服务端函数
 */
export function getServerFunction(
  componentId: string,
  functionName: string,
): ((...args: unknown[]) => Promise<unknown>) | undefined {
  return registry.functions.get(componentId)?.get(functionName);
}

// ============================================================
// Server Action 处理
// ============================================================

/**
 * 处理 Server Action 请求
 * 用于处理客户端对服务端函数的调用
 */
export async function handleServerAction(
  request: ServerActionRequest,
): Promise<ServerActionResponse> {
  const { componentName, functionName, args } = request;

  try {
    // 查找函数
    const fn = getServerFunction(componentName, functionName);
    if (!fn) {
      return {
        success: false,
        error: `Server function not found: ${componentName}.${functionName}`,
      };
    }

    // 执行函数
    const result = await fn(...args);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(`[LytJS Server Action Error] ${componentName}.${functionName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 创建 Server Action 处理器
 * 用于 Express/Fastify 等服务端框架
 */
export function createServerActionHandler() {
  return async (req: any, res: any) => {
    const componentName = req.headers['x-server-component'];
    const functionName = req.headers['x-server-function'];

    if (!componentName || !functionName) {
      res.status(400).json({ error: 'Missing server component or function headers' });
      return;
    }

    const args = req.body?.args || [];

    const result = await handleServerAction({
      componentName,
      functionName,
      args,
    });

    if (result.success) {
      res.json(result.data);
    } else {
      res.status(500).json({ error: result.error });
    }
  };
}

// ============================================================
// 数据序列化
// ============================================================

/**
 * 序列化 Server Component 数据
 */
export function serializeServerData(data: unknown): string {
  return JSON.stringify(data, (key, value) => {
    // 处理特殊类型
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    if (value instanceof Map) {
      return { __type: 'Map', value: Array.from(value.entries()) };
    }
    if (value instanceof Set) {
      return { __type: 'Set', value: Array.from(value.values()) };
    }
    if (typeof value === 'bigint') {
      return { __type: 'BigInt', value: value.toString() };
    }
    if (value === undefined) {
      return { __type: 'undefined' };
    }
    return value;
  });
}

/**
 * 反序列化 Server Component 数据
 */
export function deserializeServerData(json: string): unknown {
  return JSON.parse(json, (key, value) => {
    if (value && typeof value === 'object' && '__type' in value) {
      switch (value.__type) {
        case 'Date':
          return new Date(value.value);
        case 'Map':
          return new Map(value.value);
        case 'Set':
          return new Set(value.value);
        case 'BigInt':
          return BigInt(value.value);
        case 'undefined':
          return undefined;
      }
    }
    return value;
  });
}

// ============================================================
// Server Component 渲染
// ============================================================

/**
 * 渲染 Server Component
 */
export async function renderServerComponent(
  componentId: string,
  context: Record<string, unknown> = {},
): Promise<string> {
  const component = getServerComponent(componentId);
  if (!component) {
    throw new Error(`[LytJS] Server component not found: ${componentId}`);
  }

  // 获取数据
  let data: Record<string, unknown> = {};
  if (component.fetchData) {
    data = await component.fetchData();
  }

  // 渲染
  const html = await component.render();

  // 注入数据脚本
  const dataScript = component.serializeData
    ? `<script>window.__LYTJS_SERVER_DATA__=${component.serializeData()};</script>`
    : '';

  return html + dataScript;
}

// ============================================================
// defineServerComponent
// ============================================================

/**
 * 定义 Server Component
 *
 * @example
 * ```ts
 * export default defineServerComponent({
 *   id: 'product-list',
 *   name: 'ProductList',
 *   async fetchData() {
 *     const products = await db.products.findMany();
 *     return { products };
 *   },
 *   async render() {
 *     return '<div class="product-list">...</div>';
 *   }
 * });
 * ```
 */
export function defineServerComponent(
  options: Omit<ServerComponentDefinition, 'serializeData'> & {
    serializeData?: () => string;
  },
): ServerComponentDefinition {
  const component: ServerComponentDefinition = {
    ...options,
    serializeData: options.serializeData ?? (() => serializeServerData({})),
  };

  // 自动注册
  registerServerComponent(component);

  return component;
}

// ============================================================
// 导出（函数已在上面定义）
// ============================================================
