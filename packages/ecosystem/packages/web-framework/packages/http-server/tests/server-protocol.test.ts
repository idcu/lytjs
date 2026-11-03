/**
 * @lytjs/http-server 协议层回归（2026-11-03）
 *
 * 这里每一条都对应一个**单测全绿时仍然存在**的缺陷。共同特征：不抛异常、不影响
 * 正常路径，只在「多 cookie / 大写头名 / HEAD / 非 ASCII 参数 / 重叠路由 / 错误路径」
 * 这些真实用法上静默出错。对应门禁：`scripts/check-http-protocol.mjs`。
 */
import { describe, it, expect, afterEach } from 'vitest';
import { Router, createServer, HttpError, type Server } from '../src';

let server: Server | undefined;

afterEach(async () => {
  if (server) {
    await server.close();
    server = undefined;
  }
});

async function startServer(configure: (s: Server) => void, options = {}): Promise<string> {
  server = createServer(options);
  configure(server);
  await server.listen(0, '127.0.0.1');
  return `http://127.0.0.1:${server.port}`;
}

describe('Router：优先级与解码', () => {
  it('通配符路由应胜过参数路由（按段比较，不是按分数求和）', () => {
    const router = new Router();
    router.get('/a/:x/:y', () => {});
    router.get('/a/b/*', () => {});

    const match = router.match('GET', '/a/b/c');
    // 命中的必须是后注册的通配符路由：参数路由的 params 是 {x:'b',y:'c'}
    expect(match?.params).toEqual({ '*': 'c' });
  });

  it('静态段应胜过参数段', () => {
    const router = new Router();
    router.get('/users/:id', () => {});
    router.get('/users/me', () => {});

    expect(router.match('GET', '/users/me')?.params).toEqual({});
    expect(router.match('GET', '/users/42')?.params).toEqual({ id: '42' });
  });

  it('精确路由应胜过同级通配符', () => {
    const router = new Router();
    router.get('/exact/*', () => {});
    router.get('/exact', () => {});

    // 通配符路由的 params 是 {'*': ''}，精确路由是 {}
    expect(router.match('GET', '/exact')?.params).toEqual({});
  });

  it('路径参数应解码（含 %2F 表示的段内斜杠）', () => {
    const router = new Router();
    router.get('/users/:id', () => {});

    expect(router.match('GET', '/users/%E4%B8%AD%E6%96%87')?.params).toEqual({ id: '中文' });
    expect(router.match('GET', '/users/a%2Fb')?.params).toEqual({ id: 'a/b' });
  });

  it('畸形转义不应抛错（原样传递）', () => {
    const router = new Router();
    router.get('/users/:id', () => {});

    expect(router.match('GET', '/users/%zz')?.params).toEqual({ id: '%zz' });
  });

  it('HEAD 应回落到 GET 路由', () => {
    const router = new Router();
    router.get('/health', () => {});

    expect(router.match('HEAD', '/health')).not.toBeNull();
  });

  it('allowedMethods 应给出该路径允许的方法（GET 隐含 HEAD）', () => {
    const router = new Router();
    router.get('/res', () => {});
    router.post('/res', () => {});

    expect(router.allowedMethods('/res').sort()).toEqual(['GET', 'HEAD', 'POST']);
    expect(router.allowedMethods('/nope')).toEqual([]);
  });
});

describe('Server：响应头', () => {
  it('数组响应头必须逐条发出（两条 Set-Cookie 都要到客户端）', async () => {
    const base = await startServer((s) => {
      s.get('/login', (ctx) => {
        ctx.response.headers['set-cookie'] = ['access=a; Path=/', 'refresh=b; Path=/'];
        ctx.response.body = 'ok';
      });
    });

    const res = await fetch(`${base}/login`);
    expect(res.headers.getSetCookie()).toEqual(['access=a; Path=/', 'refresh=b; Path=/']);
  });

  it('处理器写的 Content-Type（大写）不得被覆盖成 text/plain', async () => {
    const base = await startServer((s) => {
      s.get('/json', (ctx) => {
        ctx.response.headers['Content-Type'] = 'application/json; charset=utf-8';
        ctx.response.body = '{"a":1}';
      });
    });

    const res = await fetch(`${base}/json`);
    expect(res.headers.get('content-type')).toBe('application/json; charset=utf-8');
  });

  it('HEAD 只发头不发体，且 content-length 与 GET 一致', async () => {
    const base = await startServer((s) => {
      s.get('/hello', (ctx) => {
        ctx.response.body = 'hello';
      });
    });

    const getRes = await fetch(`${base}/hello`);
    const headRes = await fetch(`${base}/hello`, { method: 'HEAD' });

    expect(headRes.status).toBe(200);
    expect(await headRes.text()).toBe('');
    expect(headRes.headers.get('content-length')).toBe(getRes.headers.get('content-length'));
  });

  it('204 不得带体，也不得带 content-length', async () => {
    const base = await startServer((s) => {
      s.get('/nc', (ctx) => {
        ctx.response.status = 204;
        ctx.response.body = 'ignored';
      });
    });

    const res = await fetch(`${base}/nc`);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(res.headers.get('content-length')).toBeNull();
  });

  it('content-length 按 UTF-8 字节数计算', async () => {
    const base = await startServer((s) => {
      s.get('/zh', (ctx) => {
        ctx.response.body = '中文';
      });
    });

    const res = await fetch(`${base}/zh`);
    expect(res.headers.get('content-length')).toBe(String(Buffer.byteLength('中文')));
  });

  it('body 为 0 / false 时仍要发送（不能当 falsy 丢掉）', async () => {
    const base = await startServer((s) => {
      s.get('/zero', (ctx) => {
        ctx.response.body = 0;
      });
      s.get('/false', (ctx) => {
        ctx.response.body = false;
      });
    });

    expect(await (await fetch(`${base}/zero`)).text()).toBe('0');
    expect(await (await fetch(`${base}/false`)).text()).toBe('false');
  });
});

describe('Server：方法不匹配与错误路径', () => {
  it('路径存在但方法不对应返回 405 + Allow', async () => {
    const base = await startServer((s) => {
      s.get('/only-get', (ctx) => {
        ctx.response.body = 'ok';
      });
    });

    const res = await fetch(`${base}/only-get`, { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('GET, HEAD');
  });

  it('错误响应必须保留中间件已写的头（CORS / request-id）', async () => {
    const base = await startServer((s) => {
      s.use(async (ctx, next) => {
        ctx.response.headers['access-control-allow-origin'] = '*';
        ctx.response.headers['x-request-id'] = 'req-1';
        await next();
      });
      s.get('/unauthorized', () => {
        throw new HttpError(401, '未授权');
      });
    });

    const res = await fetch(`${base}/unauthorized`);
    expect(res.status).toBe(401);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
    expect(res.headers.get('x-request-id')).toBe('req-1');
  });

  it('请求体解析失败（413）时仍要带上中间件写的 CORS 头', async () => {
    const base = await startServer(
      (s) => {
        s.use(async (ctx, next) => {
          ctx.response.headers['access-control-allow-origin'] = '*';
          await next();
        });
        s.post('/big', (ctx) => {
          ctx.response.body = 'never';
        });
      },
      { bodyLimit: 16 },
    );

    const res = await fetch(`${base}/big`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'x'.repeat(64),
    });

    expect(res.status).toBe(413);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
