/**
 * HTTP 服务器实现
 *
 * ## 2026-10-10 修复（P1-4）
 *
 * 1. **中间件倒序执行** —— 原实现 `let index = length; next(){ index--; ... }`
 *    于是**最后注册**的中间件**最先**执行。`use()` 的注册顺序即执行顺序是所有
 *    HTTP 框架的共识（Koa / Express / Fastify），倒序会让「鉴权→日志→业务」变成
 *    「业务→日志→鉴权」，鉴权形同虚设。
 * 2. **无 body 解析** —— `Request` 上根本没有 body 字段，POST/PUT 处理器拿不到请求体。
 *    现在读取请求流并按 `content-type` 解析（JSON / urlencoded / 文本），
 *    并带**体积上限**（默认 1 MiB，超限 413）。
 * 3. **无错误兜底** —— `handleRequest` 是 async 且被直接交给 `createServer()`：
 *    处理器一抛错就变成 **unhandled rejection**，响应永远不发 ⇒ 客户端挂到超时。
 *    现在统一 try/catch：`HttpError` 按其状态码返回，其余记 500 并**不泄漏内部信息**。
 */

import type { Server as NodeServer, IncomingMessage, ServerResponse } from 'node:http';
import { createServer as createNodeServer } from 'node:http';
import type { Handler, Context, Request, Response, HttpMethod } from './types';
import { Router } from './router';
import { parseQueryStringWithArrays } from '@lytjs/common-query';

/** 默认请求体上限：1 MiB */
const DEFAULT_BODY_LIMIT = 1024 * 1024;

/** 可预期的 HTTP 错误（会被按其状态码返回给客户端） */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export interface ServerOptions {
  /** 请求体上限（字节），默认 1 MiB。超限返回 413 */
  bodyLimit?: number;
  /**
   * 可选的 Router 实例。
   *
   * ⚠️ 2026-10-31 修（P0）：此前构造函数**无条件** `new Router()`，外部传入的
   *   `router` 被静默忽略 ⇒ `createServer({ router })` 之后所有请求都 404，
   *   且没有任何提示。现在外部传入即采用（不传仍内部新建，兼容原用法）。
   */
  router?: Router;
}

/** 读取请求体（带上限），并按 content-type 解析 */
async function readRequestBody(
  req: IncomingMessage,
  limit: number,
): Promise<{ raw: string; parsed: unknown } | undefined> {
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return undefined;

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buf.length;
    if (size > limit) {
      throw new HttpError(413, `请求体超过上限（${limit} 字节）`);
    }
    chunks.push(buf);
  }
  if (size === 0) return { raw: '', parsed: undefined };

  const raw = Buffer.concat(chunks).toString('utf-8');
  const contentType = String(req.headers['content-type'] ?? '').toLowerCase();

  let parsed: unknown = raw;
  if (contentType.includes('application/json')) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new HttpError(400, '请求体不是合法 JSON');
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const usp = new URLSearchParams(raw);
    const obj: Record<string, string | string[]> = {};
    for (const key of new Set(usp.keys())) {
      const all = usp.getAll(key);
      obj[key] = all.length > 1 ? all : (all[0] ?? '');
    }
    parsed = obj;
  }
  return { raw, parsed };
}

/**
 * 把 Fetch 风格 `Response` 归一化成宿主的普通响应对象 `{ status, headers, body }`。
 *
 * ⚠️ 2026-10-31：中间件（cors / auth / rate-limit）返回的是 Fetch `Response`，
 * 而宿主内部用的是 `{status, headers, body}` 普通对象（见 types.ts）。
 * 两者不能直接互赋：`Headers` 不是普通对象、`body` 是流。这里做一次显式转换。
 */
type FetchLikeResponse = {
  status: number;
  headers: { forEach(cb: (value: string, key: string) => void): void };
  text(): Promise<string>;
};

async function fetchResponseToPlain(source: FetchLikeResponse): Promise<Response> {
  const headers: Record<string, string> = {};
  source.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  let body: unknown;
  try {
    const text = await source.text();
    if (text) {
      const contentType = headers['content-type'] ?? '';
      body = contentType.includes('application/json') ? JSON.parse(text) : text;
    }
  } catch {
    // 流已被消费 / 解析失败：保留空体，状态码与响应头仍然有效
    body = undefined;
  }

  return { status: source.status, headers, body };
}

/**
 * HTTP 服务器类
 */
/** 本仓的**规范**中间件签名：`(ctx, next)` —— 与 Koa / Express / Fastify 一致。 */
export type Middleware = (ctx: Context, next: () => Promise<void>) => Promise<void> | void;

/**
 * 兼容签名：`(request, ctx, next)` —— `@lytjs/middleware-cors` / `middleware-rate-limit` /
 * `middleware-auth` 三个包按这个形态实现（它们面向 Fetch 风格的宿主，
 * 读的是 `request.headers.get(...)`）。
 *
 * ⚠️ 2026-10-27 修（P0）：此前把这三者直接 `use()` 到 http-server 会**全部 500** ——
 *   宿主按 `(ctx, next)` 调用，于是第一个实参拿到的是 ctx、第二个拿到的是 next，
 *   `ctx` 为 undefined，中间件内部 `request.headers.get` 直接抛。
 *   现在在边界处做一次**适配**：把 Node 的 `ctx.request` 包装成带 `headers.get()` 的门面，
 *   并按实参个数分派。规范仍是 `(ctx, next)`；三参形态只作为已发布包的兼容入口。
 */
export type LegacyMiddleware = (
  request: unknown,
  ctx: Context,
  next: () => Promise<void>,
) => Promise<void> | void;

/** 把 Node 的 headers（普通对象）包装成 Fetch 风格（`get` / `has` / `entries`） */
function createHeadersFacade(headers: Record<string, unknown>): {
  get(name: string): string | null;
  has(name: string): boolean;
  entries(): IterableIterator<[string, string]>;
} {
  const normalized = new Map<string, string>();
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    normalized.set(key.toLowerCase(), Array.isArray(value) ? value.join(', ') : String(value));
  }
  return {
    get: (name: string) => normalized.get(name.toLowerCase()) ?? null,
    has: (name: string) => normalized.has(name.toLowerCase()),
    entries: () => normalized.entries(),
  };
}

/**
 * 按实参个数把三参中间件适配成规范签名。
 *
 * 判据用 `fn.length`：`(request, ctx, next)` 的 length 是 3，`(ctx, next)` 是 2。
 * 带默认值的写法（`(request, ctx, next = noop)`）length 会变成 2 —— 这种情况请显式包一层。
 */
function normalizeMiddleware(middleware: Middleware | LegacyMiddleware): Middleware {
  if (middleware.length < 3) return middleware as Middleware;
  const legacy = middleware as LegacyMiddleware;
  return async (ctx: Context, next: () => Promise<void>) => {
    const request = ctx.request;
    const facade = {
      method: request.method,
      url: request.url,
      path: request.path,
      query: request.query,
      params: request.params,
      body: request.body,
      rawBody: request.rawBody,
      ip: request.ip,
      headers: createHeadersFacade((request.headers ?? {}) as Record<string, unknown>),
    };
    return legacy(facade, ctx, next);
  };
}

export class Server {
  /** 路由实例 */
  private router: Router;
  /** 中间件列表（**按注册顺序执行**） */
  private middlewares: Middleware[] = [];
  /** Node.js 服务器实例 */
  private server?: NodeServer;
  /** 请求体上限 */
  private bodyLimit: number;

  /**
   * 构造函数
   */
  constructor(options: ServerOptions = {}) {
    // 外部 router 优先（此前无条件 new Router() ⇒ 传进来的 router 被静默丢弃）
    this.router = options.router ?? new Router();
    this.bodyLimit = options.bodyLimit ?? DEFAULT_BODY_LIMIT;
  }

  /**
   * 添加中间件
   *
   * ⚠️ 执行顺序 = **注册顺序**（与 Koa / Express / Fastify 一致）。
   *
   * @param middleware - 中间件函数
   * @returns 服务器实例
   */
  use(middleware: Middleware): this {
    this.middlewares.push(normalizeMiddleware(middleware));
    return this;
  }

  /**
   * 添加路由
   *
   * @param method - HTTP 方法
   * @param path - 路径
   * @param handler - 处理器
   * @returns 服务器实例
   */
  on(method: HttpMethod, path: string, handler: Handler): this {
    this.router.on(method, path, handler);
    return this;
  }

  /**
   * 添加 GET 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 服务器实例
   */
  get(path: string, handler: Handler): this {
    return this.on('GET', path, handler);
  }

  /**
   * 添加 POST 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 服务器实例
   */
  post(path: string, handler: Handler): this {
    return this.on('POST', path, handler);
  }

  /**
   * 添加 PUT 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 服务器实例
   */
  put(path: string, handler: Handler): this {
    return this.on('PUT', path, handler);
  }

  /**
   * 添加 PATCH 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 服务器实例
   */
  patch(path: string, handler: Handler): this {
    return this.on('PATCH', path, handler);
  }

  /**
   * 添加 DELETE 路由
   *
   * @param path - 路径
   * @param handler - 处理器
   * @returns 服务器实例
   */
  delete(path: string, handler: Handler): this {
    return this.on('DELETE', path, handler);
  }

  /**
   * 启动服务器监听
   *
   * @param port - 端口
   * @param hostname - 主机名
   * @returns Promise
   */
  listen(port: number, hostname?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createNodeServer((req, res) => {
        // 兜底：handleRequest 内部已 try/catch，这里再保一层，避免任何情况下
        // 出现 unhandled rejection 而让客户端挂到超时。
        void this.handleRequest(req, res).catch((err) => {
          this.sendError(res, err);
        });
      });
      this.server = server;

      // ⚠️ 2026-11-13 修（P1）：此前**只监听 listening，不监听 error**。
      //   `EADDRINUSE` / `EACCES` 时该 Promise 永不落定，且 `error` 事件无人接管
      //   ⇒ 变成进程级 uncaughtException（调用方的 `catch` 永远等不到）。
      //   现在失败即 reject，并释放句柄（否则失败后端口/事件循环仍被占着）。
      const onError = (err: Error): void => {
        server.off('listening', onListening);
        if (this.server === server) this.server = undefined;
        server.close(() => reject(err));
      };
      const onListening = (): void => {
        server.off('error', onError);
        resolve();
      };
      server.once('error', onError);
      server.once('listening', onListening);
      server.listen(port, hostname);
    });
  }

  /**
   * 实际监听的端口（`listen(0)` 时由系统分配）。
   * 未监听时返回 `undefined`。
   */
  get port(): number | undefined {
    const address = this.server?.address();
    return address && typeof address === 'object' ? address.port : undefined;
  }

  /**
   * 关闭服务器
   *
   * @returns Promise
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        this.server.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 处理请求（统一错误兜底）
   *
   * @param req - Node.js 请求对象
   * @param res - Node.js 响应对象
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // ⚠️ 2026-11-03 修（P1）：ctx 提到 try 之外创建 —— 出错时要把它身上**已经写好的
    //   响应头**（CORS / 限流 / 请求 id）一起带进错误响应。此前 `sendError` 只拿到 res，
    //   于是「鉴权中间件抛 401」「请求体超限 413」这类错误响应**没有任何 CORS 头**，
    //   浏览器侧只能看到一个 opaque error，控制台里连状态码都读不到。
    const ctx = this.createContext(req);
    try {
      await this.dispatch(req, res, ctx);
    } catch (err) {
      this.sendError(res, err, ctx.response.headers);
    }
  }

  /** 由 Node 请求对象构造 ctx（路由参数由 `dispatch` 填入） */
  private createContext(req: IncomingMessage): Context {
    const url = req.url || '/';
    const path = url.split('?')[0] || '/';
    const method = (req.method || 'GET') as HttpMethod;

    const request: Request = {
      method,
      url,
      path,
      headers: req.headers,
      // ⚠️ 2026-10-27 修（P0）：此前直接把**整条 URL** 传进去，`parseQueryString` 只剥前导
      //   `?` ⇒ 实测 `?x=1&y=2` 得到 `{"/p?x":"1","y":"2"}`，首个参数恒 undefined。
      //   这里显式只传查询串（`parseQueryString` 也已加防御，双保险）。
      query: parseQueryStringWithArrays(url.includes('?') ? url.slice(url.indexOf('?') + 1) : ''),
      params: {},
      ip: req.socket.remoteAddress,
    };

    const response: Response = {
      status: 200,
      headers: {},
    };

    return {
      request,
      response,
      // ⚠️ 2026-10-31 修（P0）：`@lytjs/middleware-rate-limit` 的默认 keyGenerator 读的是
      //   `ctx.clientIp / ctx.ip / ctx.socket.remoteAddress`，而宿主此前只在
      //   `ctx.request.ip` 上放了来源地址 ⇒ 取不到 → 抛错 → 每个请求 500。
      //   这里把**服务端可信来源**（TCP 连接地址，客户端无法伪造）同时挂到顶层。
      clientIp: request.ip,
      ip: request.ip,
    };
  }

  /** 实际分发逻辑（`ctx` 可省略：外部直接驱动 dispatch 时按 req 现造一个） */
  private async dispatch(
    req: IncomingMessage,
    res: ServerResponse,
    ctx: Context = this.createContext(req),
  ): Promise<void> {
    const { request, response } = ctx;
    const method = request.method;
    const path = request.path;

    const match = this.router.match(method, path);

    if (match) {
      // 转换类型，确保兼容性
      ctx.request.params = {};
      for (const [key, value] of Object.entries(match.params)) {
        if (Array.isArray(value)) {
          // 如果是数组，只取第一个元素
          ctx.request.params[key] = value[0] || '';
        } else {
          ctx.request.params[key] = value;
        }
      }
    }

    // 解析请求体（仅在处理器确实需要时才有开销：GET/HEAD/OPTIONS 直接返回）
    //
    // ⚠️ 2026-11-03 修（P1）：解析失败（413 超限 / 400 非法 JSON）此前是**直接抛**，
    //   于是整条中间件链被跳过 ⇒ 413 / 400 响应拿不到 CORS 头。现在先记下错误，
    //   照常跑完中间件（让它们把该写的头写上），再由终态 handler 抛出。
    let body: Awaited<ReturnType<typeof readRequestBody>>;
    let bodyError: unknown;
    try {
      body = await readRequestBody(req, this.bodyLimit);
    } catch (err) {
      bodyError = err;
    }
    if (body) {
      ctx.request.rawBody = body.raw;
      ctx.request.body = body.parsed;
    }

    // 终态：命中路由 → 路由处理器；未命中 → 405 / 404
    const handler = async () => {
      if (bodyError) throw bodyError;
      if (match) {
        await match.handler(ctx);
        return;
      }
      // ⚠️ 2026-11-03 新增：路径存在但方法不对时回 405 + `Allow`。
      //   此前一律 404 —— 客户端只能看到「不存在」，排查时得逐个方法试。
      const allowed = this.router.allowedMethods(path);
      if (allowed.length > 0) {
        response.status = 405;
        response.headers.allow = allowed.join(', ');
        response.body = { error: '方法不允许' };
        return;
      }
      response.status = 404;
      response.body = { error: '未找到' };
    };

    // 洋葱圈：index 从 -1 起递增 ⇒ **注册顺序即执行顺序**
    //
    // ⚠️ 2026-10-27 修（P1）：此前整条链只在**命中路由后**才执行，
    //   于是 `OPTIONS` 预检（没有路由）与 404 都拿不到 CORS 头 ——
    //   浏览器侧的预检实测返回 404 且无 `Access-Control-Allow-*`，跨域请求必失败。
    //   现在所有请求都过中间件，未命中路由由终态 handler 产出 404。
    let index = -1;
    const next = async (): Promise<void> => {
      index++;
      const middleware = this.middlewares[index];
      if (middleware) {
        // ⚠️ 2026-10-31 修（P0）：Fetch 风格中间件（cors / auth / rate-limit）以
        //   **返回 Response** 作为最终响应；此前这里把返回值丢弃 ⇒
        //   CORS 头全丢、auth 的 401 变成 200 空体、rate-limit 的 429 变成 200 空体。
        //   现在把 Fetch Response 归一化成宿主的 `{status, headers, body}` 并接管响应。
        //
        // 规范签名的返回类型是 `void`，但 Fetch 风格中间件会**返回 Response**，
        // 故这里按 unknown 收，再结构化判断。
        const result = (await middleware(ctx, next)) as unknown as
          | (FetchLikeResponse & { headers: FetchLikeResponse['headers'] })
          | { status: number; headers: Record<string, string | string[]>; body?: unknown }
          | undefined;
        if (result) {
          if (
            typeof result.status === 'number' &&
            typeof (result as FetchLikeResponse).headers?.forEach === 'function' &&
            typeof (result as FetchLikeResponse).text === 'function'
          ) {
            // Fetch `Response`
            const converted = await fetchResponseToPlain(result as FetchLikeResponse);
            // ⚠️ 2026-11-03 修（P1）：此前是**整体替换** `ctx.response` ⇒ 上游中间件
            //   已经写好的头（`x-request-id` / `access-control-*` / `vary`）被一并丢弃，
            //   只剩这个 Response 自带的头。现在合并，返回方优先。
            ctx.response = {
              ...converted,
              headers: { ...ctx.response.headers, ...converted.headers },
            };
          } else if (
            typeof result.status === 'number' &&
            result.headers &&
            typeof result.headers === 'object'
          ) {
            // 普通对象形态 `{ status, headers, body }`（middleware-rate-limit 的 429 走这条）
            ctx.response = {
              ...ctx.response,
              status: result.status,
              headers: {
                ...ctx.response.headers,
                ...(result.headers as Record<string, string | string[]>),
              },
              body: (result as { body?: unknown }).body,
            };
          }
        }
      } else {
        await handler();
      }
    };

    await next();

    if (ctx.response) {
      this.sendResponse(res, ctx.response, method);
    }
  }

  /**
   * 统一错误响应：`HttpError` 按状态码返回；其余记 500 且不泄漏内部信息。
   *
   * `headers` 是出错时 ctx 上已经写好的响应头 —— 必须一并发出，否则 CORS / 请求 id
   * 在**错误路径**上全部消失（正常路径有、错误路径没有，是排查时最费时的一类）。
   */
  private sendError(
    res: ServerResponse,
    err: unknown,
    headers: Record<string, string | string[] | undefined> = {},
  ): void {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : String(err);

    if (res.headersSent) {
      res.end();
      return;
    }

    if (status >= 500) {
      // 服务端错误必须留痕，否则线上只能看到 500 而无线索
      console.error('[http-server] 未处理的错误:', err);
    }

    const existing = new Set<string>();
    for (const [key, value] of Object.entries(headers)) {
      if (value === undefined) continue;
      res.setHeader(key, Array.isArray(value) ? value.map(String) : String(value));
      existing.add(key.toLowerCase());
    }

    res.statusCode = status;
    if (!existing.has('content-type')) {
      res.setHeader('content-type', 'application/json');
    }
    const body = JSON.stringify({ error: status >= 500 ? '服务器内部错误' : message });
    res.setHeader('content-length', Buffer.byteLength(body));
    res.end(body);
  }

  /**
   * 发送响应
   *
   * @param res - Node.js 响应对象
   * @param response - 响应对象
   * @param method - 请求方法（`HEAD` 只发头不发体）
   */
  private sendResponse(res: ServerResponse, response: Response, method?: HttpMethod): void {
    res.statusCode = response.status;

    // ⚠️ 2026-11-03 修（P0 ×2）：
    //   ① 数组值此前是**逐项** `setHeader` —— 后一次调用直接覆盖前一次，
    //      于是 `set-cookie: ['access=…', 'refresh=…']` 到客户端只剩最后一条
    //      （登录态只种了一个 cookie，刷新令牌永远丢），`vary` / `link` 同理。
    //      正确做法是把整个数组交给 `setHeader`（Node 会逐条发出）。
    //   ② 下面判断「用户是否自己设了 content-type」用的是**精确小写键**，
    //      处理器写 `'Content-Type'` 时判定为「没设」⇒ 被覆盖成 `text/plain`，
    //      一个 JSON 字符串响应到浏览器就成了纯文本（`res.json()` 直接抛）。
    //      现在统一按**小写集合**判定。
    const present = new Set<string>();
    for (const [key, value] of Object.entries(response.headers)) {
      if (value === undefined) continue;
      present.add(key.toLowerCase());
      if (Array.isArray(value)) {
        res.setHeader(key, value.map(String));
      } else {
        res.setHeader(key, value as string | number);
      }
    }

    // 无体状态码（1xx / 204 / 304）不允许带体，也不应带 content-length
    const bodyForbidden =
      response.status < 200 || response.status === 204 || response.status === 304;

    if (response.body === undefined || bodyForbidden) {
      if (bodyForbidden) res.removeHeader('content-length');
      res.end();
      return;
    }

    const body =
      typeof response.body === 'string' ? response.body : (JSON.stringify(response.body) ?? '');

    if (!present.has('content-type')) {
      res.setHeader(
        'content-type',
        typeof response.body === 'string' ? 'text/plain' : 'application/json',
      );
    }
    if (!present.has('content-length') && !present.has('transfer-encoding')) {
      res.setHeader('content-length', Buffer.byteLength(body));
    }

    // HEAD：头部与 GET 完全一致，但不发体（RFC 9110 §9.3.2）
    if (method === 'HEAD') {
      res.end();
      return;
    }

    res.end(body);
  }
}

/**
 * 创建 HTTP 服务器
 *
 * @param options - 服务器选项（如 `bodyLimit`）
 * @returns 服务器实例
 */
export function createServer(options: ServerOptions = {}): Server {
  return new Server(options);
}
