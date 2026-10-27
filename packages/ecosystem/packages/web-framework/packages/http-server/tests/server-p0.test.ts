/**
 * @lytjs/http-server 的 P0/P1 回归（2026-10-27）
 *
 * 三条都只在**真实 HTTP 往返**里才暴露，纯单测走不到 `dispatch`：
 *
 * 1. **query 首个参数丢失**：`parseQueryStringWithArrays(url)` 收到的是**整条 URL**，
 *    而解析函数只剥前导 `?` ⇒ `?x=1&y=2` 得到 `{"/p?x":"1","y":"2"}`，
 *    `ctx.request.query.x` 恒 `undefined`。
 * 2. **中间件只在命中路由后执行**：OPTIONS 预检（无路由）直接 404，
 *    拿不到任何 `Access-Control-Allow-*` ⇒ 浏览器侧跨域必失败。
 * 3. **三参中间件签名不兼容**：`@lytjs/middleware-cors` / `middleware-rate-limit` /
 *    `middleware-auth` 是 `(request, ctx, next)`，宿主按 `(ctx, next)` 调用 ⇒ 全部 500。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createServer, type Server } from '../src';

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    await server.close();
    server = undefined;
  }
});

async function startServer(configure: (s: Server) => void): Promise<string> {
  server = createServer();
  configure(server);
  await server.listen(0, '127.0.0.1');
  return `http://127.0.0.1:${server.port}`;
}

describe('@lytjs/http-server 的 P0/P1 回归', () => {
  it('query 的**第一个**参数必须能取到（此前键会变成 "/p?x"）', async () => {
    const base = await startServer((s) => {
      s.get('/echo', (ctx) => {
        ctx.response.body = { query: ctx.request.query };
      });
    });

    const res = await fetch(`${base}/echo?x=1&y=2`);
    const data = (await res.json()) as { query: Record<string, unknown> };

    expect(data.query).toEqual({ x: '1', y: '2' });
    // 反向断言：绝不能出现把路径混进键里的情况
    expect(Object.keys(data.query).some((k) => k.includes('/'))).toBe(false);
  });

  it('重复键应解析为数组（supportArrays 语义保持不变）', async () => {
    const base = await startServer((s) => {
      s.get('/echo', (ctx) => {
        ctx.response.body = { query: ctx.request.query };
      });
    });

    const res = await fetch(`${base}/echo?tag=a&tag=b`);
    const data = (await res.json()) as { query: Record<string, unknown> };

    expect(data.query.tag).toEqual(['a', 'b']);
  });

  it('未命中路由时中间件仍应执行（OPTIONS 预检要能拿到 CORS 头）', async () => {
    const base = await startServer((s) => {
      s.use(async (ctx, next) => {
        ctx.response.headers['access-control-allow-origin'] = '*';
        await next();
      });
    });

    // 没有注册 OPTIONS /preflight 路由
    const res = await fetch(`${base}/preflight`, { method: 'OPTIONS' });

    // 状态仍是 404（确实没有这个路由），但**头必须已经写上**
    expect(res.status).toBe(404);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('三参中间件 (request, ctx, next) 应被适配而不是 500', async () => {
    const base = await startServer((s) => {
      // 模拟 @lytjs/middleware-cors 的签名：读 request.headers.get(...)
      s.use(async (request, ctx, next) => {
        const origin = (request as { headers: { get(n: string): string | null } }).headers.get(
          'origin',
        );
        ctx.response.headers['x-seen-origin'] = origin ?? 'none';
        await next();
      });
      s.get('/hello', (ctx) => {
        ctx.response.body = 'ok';
      });
    });

    const res = await fetch(`${base}/hello`, { headers: { origin: 'https://example.com' } });

    expect(res.status).toBe(200);
    expect(res.headers.get('x-seen-origin')).toBe('https://example.com');
  });

  it('规范两参中间件不受影响', async () => {
    const base = await startServer((s) => {
      s.use(async (ctx, next) => {
        ctx.response.headers['x-canonical'] = 'yes';
        await next();
      });
      s.get('/hello', (ctx) => {
        ctx.response.body = 'ok';
      });
    });

    const res = await fetch(`${base}/hello`);
    expect(res.headers.get('x-canonical')).toBe('yes');
  });
});
