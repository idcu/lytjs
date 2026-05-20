/**
 * HTTP 路由实现
 */
import type { Handler } from './types';
import type { HttpMethod } from '@lytjs/shared-types';
import { tokenizePath, matchPath } from '@lytjs/router';

/**
 * 路由类
 */
export class Router {
  /** 路由列表 */
  private routes: Array<{
    method: HttpMethod;
    path: string;
    tokens: ReturnType<typeof tokenizePath>;
    handler: Handler;
  }> = [];

  /**
   * 添加路由
   * 
   * @param method - HTTP 方法
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  on(method: HttpMethod, path: string, handler: Handler): this {
    const tokens = tokenizePath(path);
    this.routes.push({ method, path, tokens, handler });
    return this;
  }

  /**
   * 添加 GET 路由
   * 
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  get(path: string, handler: Handler): this {
    return this.on('GET', path, handler);
  }

  /**
   * 添加 POST 路由
   * 
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  post(path: string, handler: Handler): this {
    return this.on('POST', path, handler);
  }

  /**
   * 添加 PUT 路由
   * 
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  put(path: string, handler: Handler): this {
    return this.on('PUT', path, handler);
  }

  /**
   * 添加 PATCH 路由
   * 
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  patch(path: string, handler: Handler): this {
    return this.on('PATCH', path, handler);
  }

  /**
   * 添加 DELETE 路由
   * 
   * @param path - 路径
   * @param handler - 处理器
   * @returns 路由实例
   */
  delete(path: string, handler: Handler): this {
    return this.on('DELETE', path, handler);
  }

  /**
   * 匹配路由
   * 
   * @param method - HTTP 方法
   * @param path - 路径
   * @returns 匹配结果或 null
   */
  match(method: HttpMethod, path: string): { handler: Handler; params: Record<string, string | string[]> } | null {
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

/**
 * 创建路由
 * 
 * @returns 路由实例
 */
export function createRouter(): Router {
  return new Router();
}
