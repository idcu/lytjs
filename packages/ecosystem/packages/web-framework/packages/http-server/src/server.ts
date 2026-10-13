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
 * HTTP 服务器类
 */
export class Server {
  /** 路由实例 */
  private router: Router;
  /** 中间件列表（**按注册顺序执行**） */
  private middlewares: Array<(ctx: Context, next: () => Promise<void>) => Promise<void>> = [];
  /** Node.js 服务器实例 */
  private server?: NodeServer;
  /** 请求体上限 */
  private bodyLimit: number;

  /**
   * 构造函数
   */
  constructor(options: ServerOptions = {}) {
    this.router = new Router();
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
  use(middleware: (ctx: Context, next: () => Promise<void>) => Promise<void>): this {
    this.middlewares.push(middleware);
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
    return new Promise((resolve) => {
      this.server = createNodeServer((req, res) => {
        // 兜底：handleRequest 内部已 try/catch，这里再保一层，避免任何情况下
        // 出现 unhandled rejection 而让客户端挂到超时。
        void this.handleRequest(req, res).catch((err) => {
          this.sendError(res, err);
        });
      });
      this.server.listen(port, hostname, () => {
        resolve();
      });
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
    try {
      await this.dispatch(req, res);
    } catch (err) {
      this.sendError(res, err);
    }
  }

  /** 实际分发逻辑 */
  private async dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url || '/';
    const path = url.split('?')[0] || '/';
    const method = (req.method || 'GET') as HttpMethod;

    const request: Request = {
      method,
      url,
      path,
      headers: req.headers,
      query: parseQueryStringWithArrays(url),
      params: {},
      ip: req.socket.remoteAddress,
    };

    const response: Response = {
      status: 200,
      headers: {},
    };

    const ctx: Context = {
      request,
      response,
    };

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

      // 解析请求体（仅在处理器确实需要时才有开销：GET/HEAD/OPTIONS 直接返回）
      const body = await readRequestBody(req, this.bodyLimit);
      if (body) {
        ctx.request.rawBody = body.raw;
        ctx.request.body = body.parsed;
      }

      const handler = async () => {
        await match.handler(ctx);
      };

      // 洋葱圈：index 从 -1 起递增 ⇒ **注册顺序即执行顺序**
      let index = -1;
      const next = async (): Promise<void> => {
        index++;
        const middleware = this.middlewares[index];
        if (middleware) {
          await middleware(ctx, next);
        } else {
          await handler();
        }
      };

      await next();
    } else {
      if (ctx.response) {
        ctx.response.status = 404;
        ctx.response.body = { error: '未找到' };
      }
    }

    if (ctx.response) {
      this.sendResponse(res, ctx.response);
    }
  }

  /** 统一错误响应：`HttpError` 按状态码返回；其余记 500 且不泄漏内部信息 */
  private sendError(res: ServerResponse, err: unknown): void {
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

    res.statusCode = status;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: status >= 500 ? '服务器内部错误' : message }));
  }

  /**
   * 发送响应
   *
   * @param res - Node.js 响应对象
   * @param response - 响应对象
   */
  private sendResponse(res: ServerResponse, response: Response): void {
    res.statusCode = response.status;

    for (const [key, value] of Object.entries(response.headers)) {
      if (Array.isArray(value)) {
        for (const v of value) {
          res.setHeader(key, v as string | number | string[]);
        }
      } else {
        res.setHeader(key, value as string | number | string[]);
      }
    }

    if (response.body !== undefined) {
      const body =
        typeof response.body === 'string' ? response.body : JSON.stringify(response.body);

      if (!response.headers['content-type']) {
        res.setHeader(
          'content-type',
          typeof response.body === 'string' ? 'text/plain' : 'application/json',
        );
      }

      res.end(body);
    } else {
      res.end();
    }
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
