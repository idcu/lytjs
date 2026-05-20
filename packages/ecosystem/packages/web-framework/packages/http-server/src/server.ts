import type { Server as NodeServer, IncomingMessage, ServerResponse } from 'node:http';
import { createServer as createNodeServer } from 'node:http';
import type { Context, Handler, HttpMethod, Request, Response } from './types';
import { Router } from './router';
import { parseQueryStringWithArrays } from '@lytjs/common-query';

export class Server {
  private router: Router;
  private middlewares: ((ctx: Context, next: () => Promise<void>) => Promise<void>)[] = [];
  private server?: NodeServer;

  constructor() {
    this.router = new Router();
  }

  use(middleware: (ctx: Context, next: () => Promise<void>) => Promise<void>): this {
    this.middlewares.push(middleware);
    return this;
  }

  on(method: HttpMethod, path: string, handler: Handler): this {
    this.router.on(method, path, handler);
    return this;
  }

  get(path: string, handler: Handler): this {
    return this.on('GET', path, handler);
  }

  post(path: string, handler: Handler): this {
    return this.on('POST', path, handler);
  }

  put(path: string, handler: Handler): this {
    return this.on('PUT', path, handler);
  }

  patch(path: string, handler: Handler): this {
    return this.on('PATCH', path, handler);
  }

  delete(path: string, handler: Handler): this {
    return this.on('DELETE', path, handler);
  }

  listen(port: number, hostname?: string): Promise<void> {
    return new Promise((resolve) => {
      this.server = createNodeServer(this.handleRequest.bind(this));
      this.server.listen(port, hostname, () => {
        resolve();
      });
    });
  }

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
      ctx.response.body = { error: 'Not Found' };
    }

    this.sendResponse(res, ctx.response);
  }

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

export function createServer(): Server {
  return new Server();
}
