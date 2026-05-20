import type { HttpMethod, Handler } from './types';
import { tokenizePath, matchPath } from '@lytjs/router';

export class Router {
  private routes: Array<{
    method: HttpMethod;
    path: string;
    tokens: ReturnType<typeof tokenizePath>;
    handler: Handler;
  }> = [];

  on(method: HttpMethod, path: string, handler: Handler): this {
    const tokens = tokenizePath(path);
    this.routes.push({ method, path, tokens, handler });
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

  match(method: HttpMethod, path: string): { handler: Handler; params: Record<string, string | string[]> } | null {
    // 筛选出匹配的方法
    const candidates = this.routes.filter(r => r.method === method);
    
    let bestMatch: { handler: Handler; params: Record<string, string | string[]> } | null = null;
    let bestScore = -1;

    for (const route of candidates) {
      const result = matchPath(path, route.tokens);
      if (result.matched && result.score > bestScore) {
        bestScore = result.score;
        bestMatch = { handler: route.handler, params: result.params };
      }
    }

    return bestMatch;
  }
}

export function createRouter(): Router {
  return new Router();
}
