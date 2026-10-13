/**
 * @lytjs/http-server 端到端测试（P1-4 回归）
 *
 * 这里**真起一个 Node HTTP 服务器**并用 `fetch` 打真实请求 —— 因为 P1-4 的三个缺陷
 * （中间件倒序 / 无 body 解析 / 无错误兜底）都只在**真实 HTTP 往返**里才暴露：
 * 纯单测根本走不到 `handleRequest`。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createServer, HttpError, type Server } from '../src';

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

describe('@lytjs/http-server 端到端（P1-4 回归）', () => {
  it('中间件应按**注册顺序**执行（原实现是倒序）', async () => {
    const order: string[] = [];
    const base = await startServer((s) => {
      s.use(async (_ctx, next) => {
        order.push('first');
        await next();
      });
      s.use(async (_ctx, next) => {
        order.push('second');
        await next();
      });
      s.get('/order', (ctx) => {
        order.push('handler');
        ctx.response.body = 'ok';
      });
    });

    const res = await fetch(`${base}/order`);
    expect(res.status).toBe(200);
    expect(order).toEqual(['first', 'second', 'handler']);
  });

  it('应解析 application/json 请求体', async () => {
    const base = await startServer((s) => {
      s.post('/echo', (ctx) => {
        ctx.response.body = { got: ctx.request.body };
      });
    });

    const res = await fetch(`${base}/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'lyt', n: 42 }),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ got: { name: 'lyt', n: 42 } });
  });

  it('应解析 application/x-www-form-urlencoded 请求体', async () => {
    const base = await startServer((s) => {
      s.post('/form', (ctx) => {
        ctx.response.body = { got: ctx.request.body };
      });
    });

    const res = await fetch(`${base}/form`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'a=1&b=2&b=3',
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ got: { a: '1', b: ['2', '3'] } });
  });

  it('处理器抛错时应返回 500（原实现：unhandled rejection + 客户端挂到超时）', async () => {
    const base = await startServer((s) => {
      s.get('/boom', () => {
        throw new Error('内部细节不应泄漏给客户端');
      });
    });

    const res = await fetch(`${base}/boom`);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain('内部细节不应泄漏给客户端');
  });

  it('HttpError 应按其状态码返回，并保留消息', async () => {
    const base = await startServer((s) => {
      s.get('/teapot', () => {
        throw new HttpError(418, '我是茶壶');
      });
    });

    const res = await fetch(`${base}/teapot`);
    expect(res.status).toBe(418);
    expect(await res.json()).toEqual({ error: '我是茶壶' });
  });

  it('异步处理器 reject 时同样返回 500（不会挂起）', async () => {
    const base = await startServer((s) => {
      s.get('/async-boom', async () => {
        await Promise.resolve();
        throw new Error('async boom');
      });
    });

    const res = await fetch(`${base}/async-boom`);
    expect(res.status).toBe(500);
  });

  it('非法 JSON 请求体应返回 400', async () => {
    const base = await startServer((s) => {
      s.post('/json', (ctx) => {
        ctx.response.body = 'never';
      });
    });

    const res = await fetch(`${base}/json`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{ not json',
    });

    expect(res.status).toBe(400);
  });

  it('请求体超过 bodyLimit 应返回 413', async () => {
    server = createServer({ bodyLimit: 16 });
    server.post('/big', (ctx) => {
      ctx.response.body = 'never';
    });
    await server.listen(0, '127.0.0.1');

    const res = await fetch(`http://127.0.0.1:${server.port}/big`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'x'.repeat(64),
    });

    expect(res.status).toBe(413);
  });

  it('未匹配路由返回 404', async () => {
    const base = await startServer((s) => {
      s.get('/known', (ctx) => {
        ctx.response.body = 'ok';
      });
    });

    const res = await fetch(`${base}/unknown`);
    expect(res.status).toBe(404);
  });
});
