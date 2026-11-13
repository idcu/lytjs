// packages/renderer/src/server/server-components.ts
// Server Components 运行时支持
// Phase 1.4: 服务端组件运行时

// import type { VaporComponentDefinition } from '../vapor/vapor-app';

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

/** 请求作用域的 Server Component 注册表句柄 */
export interface ServerComponentRegistryHandle {
  registerComponent(component: ServerComponentDefinition): void;
  registerFunction(
    componentId: string,
    functionName: string,
    fn: (...args: unknown[]) => Promise<unknown>,
  ): void;
  getComponent(id: string): ServerComponentDefinition | undefined;
  getFunction(
    componentId: string,
    functionName: string,
  ): ((...args: unknown[]) => Promise<unknown>) | undefined;
  clear(): void;
}

// ============================================================
// 注册表
// ============================================================

function buildRegistry(registry: ServerComponentRegistry): ServerComponentRegistryHandle {
  return {
    registerComponent(component: ServerComponentDefinition): void {
      registry.components.set(component.id, component);
    },
    registerFunction(
      componentId: string,
      functionName: string,
      fn: (...args: unknown[]) => Promise<unknown>,
    ): void {
      if (!registry.functions.has(componentId)) {
        registry.functions.set(componentId, new Map());
      }
      registry.functions.get(componentId)!.set(functionName, fn);
    },
    getComponent(id: string): ServerComponentDefinition | undefined {
      return registry.components.get(id);
    },
    getFunction(
      componentId: string,
      functionName: string,
    ): ((...args: unknown[]) => Promise<unknown>) | undefined {
      return registry.functions.get(componentId)?.get(functionName);
    },
    clear(): void {
      registry.components.clear();
      registry.functions.clear();
    },
  };
}

/**
 * 创建**请求作用域**的 Server Component 注册表。
 *
 * SSR 每处理一个请求就应创建一个实例：服务端组件定义与可被客户端调用的
 * Server Function 都随实例隔离，避免 A 请求注册的函数被 B 请求分发。
 */
export function createServerComponentRegistry(): ServerComponentRegistryHandle {
  return buildRegistry({ components: new Map(), functions: new Map() });
}

/**
 * 模块级默认注册表 —— 仅供**客户端单例 / 单元测试**使用。
 *
 * SSR 必须使用 `createServerComponentRegistry()` 的实例（每请求一个）。
 *
 * @deprecated v8 将移除模块级单例，请显式创建实例。
 */
const defaultRegistry = buildRegistry({ components: new Map(), functions: new Map() });

// ============================================================
// 组件注册
// ============================================================

/**
 * 注册 Server Component（写入模块级默认注册表）
 */
export function registerServerComponent(component: ServerComponentDefinition): void {
  defaultRegistry.registerComponent(component);
}

/**
 * 注册服务端函数（写入模块级默认注册表）
 */
export function registerServerFunction(
  componentId: string,
  functionName: string,
  fn: (...args: unknown[]) => Promise<unknown>,
): void {
  defaultRegistry.registerFunction(componentId, functionName, fn);
}

/**
 * 获取 Server Component
 */
export function getServerComponent(id: string): ServerComponentDefinition | undefined {
  return defaultRegistry.getComponent(id);
}

/**
 * 获取服务端函数
 */
export function getServerFunction(
  componentId: string,
  functionName: string,
): ((...args: unknown[]) => Promise<unknown>) | undefined {
  return defaultRegistry.getFunction(componentId, functionName);
}

// ============================================================
// Server Action 处理
// ============================================================

/**
 * 处理 Server Action 请求
 * 用于处理客户端对服务端函数的调用
 *
 * ⚠️ **不做身份认证/授权**：本函数只负责按注册表分发。调用方（HTTP 框架层）
 * 必须先完成鉴权，再决定允许哪些 functionName 暴露；请求作用域注册表只能限制
 * “哪些函数可见”，不能代替权限校验。
 *
 * @param request - Server Action 请求
 * @param registry - 注册表实例（SSR 传入每请求实例；缺省用模块级默认注册表）
 */
export async function handleServerAction(
  request: ServerActionRequest,
  registry: ServerComponentRegistryHandle = defaultRegistry,
): Promise<ServerActionResponse> {
  const { componentName, functionName, args } = request;

  try {
    // 查找函数
    const fn = registry.getFunction(componentName, functionName);
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
export function createServerActionHandler(
  registry: ServerComponentRegistryHandle = defaultRegistry,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: any, res: any) => {
    const componentName = req.headers['x-server-component'];
    const functionName = req.headers['x-server-function'];

    if (!componentName || !functionName) {
      res.status(400).json({ error: 'Missing server component or function headers' });
      return;
    }

    const args = req.body?.args || [];

    const result = await handleServerAction(
      {
        componentName,
        functionName,
        args,
      },
      registry,
    );

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
  // ★ 2026-10-21：`Date` 判断必须看**原始值**（`this[key]`），不能看 replacer 收到的 `value`。
  //   `JSON.stringify` 的求值顺序是「先调 `value.toJSON()`，再调 replacer」——
  //   Date 自带 `toJSON()` ⇒ replacer 拿到的已经是 ISO **字符串** ⇒ `value instanceof Date`
  //   **永假** ⇒ 日期被当成普通字符串序列化，`deserializeServerData` 的 `Date` 分支永远不触发。
  //   （同一 bug 在 `ssr-kit/ssr` 的 `safeSerializeState` 里也出现过，这是第二份副本。）
  return JSON.stringify(data, function (this: unknown, key: string, value: unknown) {
    const raw = (this as Record<string, unknown> | undefined)?.[key];
    // 处理特殊类型
    if (raw instanceof Date) {
      return { __type: 'Date', value: raw.toISOString() };
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
  return JSON.parse(json, (_key, value) => {
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
 * 把 JSON 文本转义成可安全嵌入内联 `<script>` 的形式
 *
 * ★ 2026-10-21：原先直接把 `serializeData()` 的结果拼进
 *   `<script>window.__LYTJS_SERVER_DATA__=…;</script>`。只要数据里出现 `</script>`
 *   （用户昵称、文章内容、URL……任意可控字符串），浏览器就会**提前闭合脚本标签**，
 *   后面的内容被当成 HTML 解析 ⇒ 存储型 XSS。
 *   `JSON.stringify` **不会**转义 `<` / `>`，所以必须自己转义成 JSON 的 `\uXXXX` 形式：
 *   既不能闭合标签，`JSON.parse` 又能原样还原。
 */
function escapeForInlineScript(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * 渲染 Server Component
 */
export async function renderServerComponent(
  componentId: string,
  _context: Record<string, unknown> = {},
  registry: ServerComponentRegistryHandle = defaultRegistry,
): Promise<string> {
  const component = registry.getComponent(componentId);
  if (!component) {
    throw new Error(`[LytJS] Server component not found: ${componentId}`);
  }

  // 获取数据
  if (component.fetchData) {
    await component.fetchData();
  }

  // 渲染
  const html = await component.render();

  // 注入数据脚本（**必须转义**，见 escapeForInlineScript 的说明）
  const dataScript = component.serializeData
    ? `<script>window.__LYTJS_SERVER_DATA__=${escapeForInlineScript(component.serializeData())};</script>`
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
// Server Function 运行时支持
// ============================================================

/**
 * 创建服务端函数引用
 * 用于在服务端标记可被客户端调用的函数
 *
 * ★ 2026-10-21：编译器生成的**服务端**代码写的是
 *   `import { createServerReference } from '@lytjs/renderer/server'`
 *   （见 `compiler/src/server-components`），但本包既没有 `./server` 子路径导出，
 *   也没有这个函数 ⇒ 生成的代码**连 import 都解析不到**。
 *   这里补齐实现，并在 `package.json` 的 `exports` 里开 `./server`。
 */
export function createServerReference<T extends (...args: unknown[]) => Promise<unknown>>(
  id: string,
  fn: T,
): T {
  const serverFn = fn as T & { __serverReferenceId?: string; __isServerReference?: boolean };
  serverFn.__serverReferenceId = id;
  serverFn.__isServerReference = true;
  return fn;
}

// ============================================================
// 导出（函数已在上面定义）
// ============================================================
