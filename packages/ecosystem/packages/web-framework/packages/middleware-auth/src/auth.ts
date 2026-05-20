import type { AuthOptions, AuthUser } from './types';
import type { MiddlewareFunction, MiddlewareContext } from '@lytjs/middleware';

export function createAuthMiddleware(options: AuthOptions): MiddlewareFunction {
  const headerName = options.headerName || 'Authorization';

  return async (request: Request, ctx: MiddlewareContext, next: () => Promise<Response | null | undefined>) => {
    const authHeader = request.headers.get(headerName) || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await options.authenticate(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    ctx.user = user;
    return next();
  };
}
