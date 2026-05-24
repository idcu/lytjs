/**
 * 认证中间件实现
 */
import type { AuthOptions } from './types';
type Middleware = unknown;
type MiddlewareContext = Record<string, unknown>;

/**
 * 创建认证中间件
 *
 * @param options - 认证配置选项
 * @returns 认证中间件函数
 */
export function createAuthMiddleware(options: AuthOptions): Middleware {
  const headerName = options.headerName || 'Authorization';

  return async (request: Request, ctx: MiddlewareContext, next: () => Promise<void>) => {
    const authHeader = request.headers.get(headerName) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await options.authenticate(token);

    if (!user) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    ctx.user = user;
    await next();
  };
}
