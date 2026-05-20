/**
 * HTTP 服务器实现
 */
import type { Server as NodeServer, IncomingMessage, ServerResponse } from 'node:http';
import { createServer as createNodeServer } from 'node:http';
import type { Handler } from './types';
import type {
  HttpMethod,
  HttpContext as Context,
  HttpRequest as Request,
  HttpResponse as Response,
} from '@lytjs/shared-types';
import { Router } from './router';
import { parseQueryStringWithArrays } from '@lytjs/common-query';

/**
 * HTTP 服务器类
 */
export class Server {
  /** 路由实例 */
  private router: Router;
  /** 中间件列表 */
  private middlewares: ((ctx: Context, next: () => Promise<void>) => Promise<void>)[] = [];
  /** Node.js 服务器实例 */
  private server?: NodeServer;

  /**
   * 构造函数
   */
  constructor() {
    this.router = new Router();
  }

  /**
   * 添加中间件
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
      this.server = createNodeServer(this.handleRequest.bind(this));
      this.server.listen(port, hostname, () => {
        resolve();
      });
    });
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
   * 处理请求
   * 
   * @param req - Node.js 请求对象
   * @param res - Node.js 响应对象
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
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
      ctx.request.params = match.params;

      const handler = async () => {
        await match.handler(ctx);
      };

      let index = this.middlewares.length;
      const next = async () => {
        index--;
        if (index >= 0) {
          await this.middlewares[index](ctx, next);
        } else {
          await handler();
        }
      };

      await next();
    } else {
      ctx.response.status = 404;
      ctx.response.body = { error: '未找到' };
    }

    this.sendResponse(res, ctx.response);
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
          res.setHeader(key, v);
        }
      } else {
        res.setHeader(key, value);
      }
    }

    if (response.body !== undefined) {
      const body = typeof response.body === 'string'
        ? response.body
        : JSON.stringify(response.body);

      if (!response.headers['content-type']) {
        res.setHeader('content-type', typeof response.body === 'string' ? 'text/plain' : 'application/json');
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
 * @returns 服务器实例
 */
export function createServer(): Server {
  return new Server();
}
