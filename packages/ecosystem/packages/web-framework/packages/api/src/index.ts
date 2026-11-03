/**
 * @lytjs/api
 *
 * LytJS API Router Engine
 *
 * @packageDocumentation
 */

import type {
  ApiRouterOptions,
  ApiRouteConfig,
  ApiMatch,
  ApiRequestContext,
  ApiResponse,
  ApiRouter,
  ApiHandler,
  ApiMiddleware,
  HttpMethod,
} from './types';
import { scanApiTree } from './utils';
import { pathToFileURL } from 'node:url';

/**
 * handler 可抛出它来表达非 200 响应（4xx 业务错误 / 自定义头）。
 *
 * ⚠️ 2026-10-27 新增：此前 handler 从不执行，也就没有"错误如何表达"的契约。
 *   约定：`throw new ApiError(404, '用户不存在')` → `{ status: 404, body: { error: '用户不存在' } }`。
 */
export class ApiError extends Error {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    details?: Record<string, unknown>,
    headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.headers = headers ?? {};
    this.details = details;
  }
}

/** HTTP 方法列表（从模块导出推断可用方法时用） */
const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

/** 把文件路径转成可被 `import()` 消费的 URL（Windows 下必需） */
function toFileUrl(filePath: string): string {
  return filePath.startsWith('file:') ? filePath : pathToFileURL(filePath).href;
}

/** 默认配置选项 */
const DEFAULT_OPTIONS: Required<Omit<ApiRouterOptions, 'resolveHandler'>> = {
  apiDir: 'src/api',
  extensions: ['.ts', '.tsx', '.js', '.jsx'],
  middlewarePattern: '_middleware',
  ignorePatterns: ['node_modules', '.git', 'dist'],
  strictMode: false,
};

/**
 * 创建 API 路由器
 */
export function createApiRouter(options?: ApiRouterOptions): ApiRouter {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let routes: ApiRouteConfig[] = [];

  /**
   * 首次扫描的 promise。
   *
   * ⚠️ 2026-11-03 修（P1）：此前 `refresh()` 是**发射后不管**（`refresh().catch(...)`），
   *   而 `createApiRouter()` 同步返回 ⇒ 服务刚起来的**头几个请求会 404**（路由表还没填好），
   *   等一会儿又「自己好了」。这类竞态在单测里永远看不到（测试总是 await 过一轮）。
   *   现在保留 promise，`handleRequest` 先 await 它。
   */
  let scanPromise: Promise<void> = Promise.resolve();
  /** 根目录中间件：对所有请求生效（含未命中路由的 404） */
  let rootMiddleware: string[] = [];

  async function refresh() {
    const result = scanApiTree(
      config.apiDir,
      config.apiDir,
      config.extensions,
      config.ignorePatterns,
      config.middlewarePattern,
    );
    routes = result.routes;
    rootMiddleware = result.rootMiddleware;
    if (config.strictMode) {
      for (const file of result.middlewareFiles) {
        // 严格模式：中间件必须真的被用上；这里只做记录性提示，不阻断启动
        void file;
      }
    }
  }

  function ready(): Promise<void> {
    return scanPromise;
  }

  /** 路径参数解码（`/users/%E4%B8%AD` ⇒ `{ id: '中' }`） */
  function decodeSegment(segment: string): string {
    try {
      return decodeURIComponent(segment);
    } catch {
      return segment;
    }
  }

  function match(method: HttpMethod, path: string): ApiMatch | null {
    const normalizedPath = path.split('?')[0] || '/';

    const accepts = (route: ApiRouteConfig) =>
      route.methods.includes(method) || route.dynamicMethods === true;

    // 精确匹配优先：**先看路径是否存在，再看方法**。
    // ⚠️ 2026-11-03：此前把「方法不匹配」的静态路由直接跳过，于是
    //   `/users/create.post.ts` 的 GET 请求会被 `/users/:id` 接走（params.id='create'）
    //   ⇒ 用户看到 200 和一份「id 是 create 的用户」，而不是 405。
    //   现在静态路径一旦存在就由它负责：方法不对 ⇒ 405（Allow 由 methodsForPath 给出）。
    const exact = routes.find((route) => route.path === normalizedPath);
    if (exact) {
      return accepts(exact) ? { route: exact, method, params: {}, path: normalizedPath } : null;
    }

    // 动态匹配
    const pathSegments = normalizedPath.split('/').filter(Boolean).map(decodeSegment);

    for (const route of routes) {
      if (!accepts(route)) continue;

      const routeSegments = route.path.split('/').filter(Boolean);
      if (routeSegments.length !== pathSegments.length) continue;

      const params: Record<string, string> = {};
      let matched = true;

      for (let i = 0; i < routeSegments.length; i++) {
        const routeSeg = routeSegments[i]!;
        const pathSeg = pathSegments[i]!;
        if (routeSeg.startsWith(':')) {
          params[routeSeg.slice(1)] = pathSeg;
        } else if (routeSeg !== pathSeg) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return { route, method, params, path: normalizedPath };
      }
    }

    return null;
  }

  /** 该路径上存在哪些方法（用于 405 + Allow） */
  function methodsForPath(path: string): HttpMethod[] {
    const normalizedPath = path.split('?')[0] || '/';
    const allowed = new Set<HttpMethod>();
    for (const route of routes) {
      const probe = match(route.methods[0]!, normalizedPath);
      if (probe && probe.route === route) {
        for (const m of route.methods) allowed.add(m);
      }
    }
    if (allowed.has('GET')) allowed.add('HEAD');
    return [...allowed];
  }

  async function loadMiddleware(path: string): Promise<ApiMiddleware[]> {
    const mod = (await import(/* @vite-ignore */ toFileUrl(path))) as Record<string, unknown>;
    const candidate = mod.default ?? mod.middleware ?? mod[path];
    if (typeof candidate === 'function') return [candidate as ApiMiddleware];
    if (Array.isArray(candidate)) {
      return candidate.filter((fn): fn is ApiMiddleware => typeof fn === 'function');
    }
    return [];
  }

  async function handleRequest(
    method: HttpMethod,
    path: string,
    context: ApiRequestContext,
  ): Promise<ApiResponse> {
    // 等首次扫描完成（否则启动瞬间会 404，见 scanPromise 的说明）
    await scanPromise;

    const matched = match(method, path);
    const requestContext: ApiRequestContext = {
      method,
      path,
      headers: context.headers ?? {},
      params: matched?.params ?? {},
      query: context.query ?? {},
      body: context.body,
    };

    // 中间件链：路由链已包含根中间件；未命中路由时至少跑根中间件
    // （鉴权 / CORS 不能因为「路径不存在」就被跳过）
    const chain = matched ? (matched.route.middlewarePaths ?? rootMiddleware) : rootMiddleware;

    /** 终态：命中 → handler；路径存在但方法不对 → 405；否则 404 */
    const terminal = async (): Promise<ApiResponse> => {
      if (!matched) {
        const allowed = methodsForPath(path);
        if (allowed.length > 0) {
          return {
            status: 405,
            headers: { 'Content-Type': 'application/json', Allow: allowed.join(', ') },
            body: { error: 'Method Not Allowed' },
          };
        }
        return {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: { error: 'Not Found' },
        };
      }

      let handler: ApiHandler | undefined;
      /** 模块里实际导出了哪些方法（仅在 dynamicMethods 路由上用于 405） */
      let availableMethods: HttpMethod[] | null = null;

      if (config.resolveHandler) {
        handler = await config.resolveHandler(matched.route.handlerPath, method);
      } else {
        const mod = await loadModule(matched.route.handlerPath);
        handler = pickHandler(mod, method);
        if (!handler && matched.route.dynamicMethods) {
          availableMethods = methodsFromModule(mod);
        }
      }

      if (!handler) {
        // 方法确实存在、只是不是这一个 ⇒ 405（此前一律 500「找不到 handler」）
        if (availableMethods && availableMethods.length > 0) {
          return {
            status: 405,
            headers: { 'Content-Type': 'application/json', Allow: availableMethods.join(', ') },
            body: { error: 'Method Not Allowed' },
          };
        }
        return {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: {
            error: 'Handler Not Found',
            message:
              `${matched.route.handlerPath} 未导出可调用的 handler` +
              `（期望 default / handler / ${method.toLowerCase()} 之一）`,
          },
        };
      }

      return normalizeResponse(await handler(requestContext));
    };

    try {
      const middlewares: ApiMiddleware[] = [];
      for (const mwPath of chain) {
        middlewares.push(...(await loadMiddleware(mwPath)));
      }

      let index = -1;
      const dispatch = async (): Promise<ApiResponse> => {
        index++;
        const middleware = middlewares[index];
        if (!middleware) return terminal();
        return middleware(requestContext, dispatch);
      };

      return await dispatch();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // 4xx 语义由 handler 自己抛 `ApiError` 表达；这里只兜底成 500
      if (error instanceof ApiError) {
        return {
          status: error.status,
          headers: { 'Content-Type': 'application/json', ...error.headers },
          body: { error: error.message, ...error.details },
        };
      }
      // ⚠️ 2026-11-03 修（P1）：此前把 `error.message` 原样回给客户端 ——
      //   内部错误信息（文件路径 / SQL / 堆栈首行）会泄漏给调用方。
      //   现在只在服务端留痕，客户端拿到通用文案。
      console.error('[lytjs/api] 未处理的错误:', error);
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
        body: { error: 'Internal Server Error' },
      };
    }
  }

  /** 把 handler 的返回值归一化成 ApiResponse */
  function normalizeResponse(result: unknown): ApiResponse {
    // 已经是 { status, headers, body } 形态：直接用
    if (
      result !== null &&
      typeof result === 'object' &&
      typeof (result as { status?: unknown }).status === 'number'
    ) {
      const r = result as Partial<ApiResponse>;
      return {
        status: r.status as number,
        headers: { 'Content-Type': 'application/json', ...(r.headers ?? {}) },
        body: r.body,
      };
    }
    // 普通对象 / 数组 / 字符串：当作 200 的 JSON 体
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: result,
    };
  }

  function getRoutes() {
    return [...routes];
  }

  function addRoute(route: ApiRouteConfig) {
    routes.push(route);
  }

  function removeRoute(path: string) {
    routes = routes.filter((r) => r.path !== path);
  }

  function clearRoutes() {
    routes = [];
  }

  scanPromise = refresh().catch((err) => {
    console.warn('Failed to scan API routes:', err);
  });

  return {
    getRoutes,
    match,
    addRoute,
    removeRoute,
    clearRoutes,
    refresh,
    ready,
    handleRequest,
  };
}

// 导出类型
export type {
  ApiRouterOptions,
  ApiRouteConfig,
  ApiRequestContext,
  ApiResponse,
  ApiMatch,
  ApiRouter,
  ApiHandler,
  ApiMiddleware,
  HttpMethod,
} from './types';

/** 动态 import 模块（Windows 下必须走 file:// URL） */
async function loadModule(handlerPath: string): Promise<Record<string, unknown>> {
  return (await import(/* @vite-ignore */ toFileUrl(handlerPath))) as Record<string, unknown>;
}

/** 从模块里挑一个能处理 `method` 的函数：default / handler / 小写方法名 / 大写方法名 */
function pickHandler(mod: Record<string, unknown>, method: HttpMethod): ApiHandler | undefined {
  const candidates = [mod.default, mod.handler, mod[method.toLowerCase()], mod[method]];
  for (const candidate of candidates) {
    if (typeof candidate === 'function') return candidate as ApiHandler;
  }
  return undefined;
}

/**
 * 模块实际支持的方法。
 *
 * ⚠️ 2026-11-03 新增：文件名没写方法时（`posts.ts` + `export const POST`），
 *   路由表只能先按 GET 登记，真正的方法要等模块加载后才知道。
 *   这里从导出面反推，用于 405 的 `Allow`（此前 GET 打这种文件直接 500）。
 */
function methodsFromModule(mod: Record<string, unknown>): HttpMethod[] {
  const found = new Set<HttpMethod>();
  if (typeof mod.default === 'function' || typeof mod.handler === 'function') found.add('GET');
  for (const method of HTTP_METHODS) {
    if (typeof mod[method.toLowerCase()] === 'function' || typeof mod[method] === 'function') {
      found.add(method);
    }
  }
  if (found.has('GET')) found.add('HEAD');
  return [...found];
}
