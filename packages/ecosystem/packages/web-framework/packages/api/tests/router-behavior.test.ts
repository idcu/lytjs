/**
 * @lytjs/api 请求管线行为（2026-11-03）
 *
 * 覆盖 6 个「静默失败」类缺陷：
 * ① `_middleware` 从未执行（鉴权形同虚设）；② `_middleware.ts` 被注册成路由；
 * ③ 忽略规则子串匹配误伤 `distribution.ts`；④ `export const POST` 从不生效；
 * ⑤ 构造后首次扫描未等待 ⇒ 头几个请求 404；⑥ 500 回传内部错误消息。
 *
 * 对应门禁：`scripts/check-api-routes.mjs`（41 条断言）。
 */
import { describe, it, expect, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createApiRouter, ApiError } from '../src';

const roots: string[] = [];

function makeApiDir(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'lyt-api-test-'));
  roots.push(root);
  for (const [rel, code] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, code);
  }
  return root;
}

const ctx = (extra: Record<string, unknown> = {}) => ({
  method: 'GET' as const,
  path: '/',
  headers: {} as Record<string, string>,
  params: {},
  query: {},
  ...extra,
});

afterAll(() => {
  for (const dir of roots) rmSync(dir, { recursive: true, force: true });
});

describe('@lytjs/api 请求管线', () => {
  it('构造后立刻请求不会 404（首次扫描可等待）', async () => {
    const dir = makeApiDir({ 'users.ts': `export default () => ({ ok: 1 });` });
    const router = createApiRouter({ apiDir: dir });

    const res = await router.handleRequest('GET', '/users', ctx());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: 1 });
  });

  it('根目录 _middleware 会执行，并可短路', async () => {
    const dir = makeApiDir({
      '_middleware.ts': `export default async (ctx, next) => {
        if (ctx.path === '/blocked') return { status: 403, headers: {}, body: { blocked: true } };
        return next();
      };`,
      'open.ts': `export default () => ({ open: true });`,
    });
    const router = createApiRouter({ apiDir: dir });

    expect((await router.handleRequest('GET', '/open', ctx())).status).toBe(200);
    const blocked = await router.handleRequest('GET', '/blocked', ctx());
    expect(blocked.status).toBe(403);
    expect(blocked.body).toEqual({ blocked: true });
  });

  it('目录中间件只作用于该目录及其子目录', async () => {
    const dir = makeApiDir({
      '_middleware.ts': `export default async (ctx, next) => next();`,
      'admin/_middleware.ts': `export default async (ctx, next) => {
        if (!ctx.headers.authorization) return { status: 401, headers: {}, body: { error: 'no' } };
        return next();
      };`,
      'admin/users.ts': `export default () => ({ admin: true });`,
      'public.ts': `export default () => ({ public: true });`,
    });
    const router = createApiRouter({ apiDir: dir });

    expect((await router.handleRequest('GET', '/admin/users', ctx())).status).toBe(401);
    const authed = await router.handleRequest(
      'GET',
      '/admin/users',
      ctx({ headers: { authorization: 'Bearer t' } }),
    );
    expect(authed.status).toBe(200);
    expect((await router.handleRequest('GET', '/public', ctx())).status).toBe(200);
  });

  it('_middleware.ts 不会被注册成路由', async () => {
    const dir = makeApiDir({
      '_middleware.ts': `export default async (ctx, next) => next();`,
      'a.ts': `export default () => ({ a: 1 });`,
    });
    const router = createApiRouter({ apiDir: dir });
    await router.ready();

    expect(router.getRoutes().map((r) => r.path)).toEqual(['/a']);
    expect((await router.handleRequest('GET', '/_middleware', ctx())).status).toBe(404);
  });

  it('默认忽略项 dist 不会误伤 distribution.ts', async () => {
    const dir = makeApiDir({
      'distribution.ts': `export default () => ({ dist: true });`,
      'dist/inner.ts': `export default () => ({ inner: true });`,
    });
    const router = createApiRouter({ apiDir: dir });
    await router.ready();

    const paths = router.getRoutes().map((r) => r.path);
    expect(paths).toContain('/distribution');
    expect(paths).not.toContain('/dist/inner');
  });

  it('export const POST 生效；其它方法返回 405 + Allow', async () => {
    const dir = makeApiDir({
      'posts.ts': `export const POST = () => ({ created: true });`,
    });
    const router = createApiRouter({ apiDir: dir });

    const created = await router.handleRequest('POST', '/posts', ctx({ method: 'POST' }));
    expect(created.status).toBe(200);
    expect(created.body).toEqual({ created: true });

    const notAllowed = await router.handleRequest('GET', '/posts', ctx());
    expect(notAllowed.status).toBe(405);
    expect(notAllowed.headers.Allow).toBe('POST');
  });

  it('文件名方法（create.post.ts）对其它方法返回 405，而不是落到 :id', async () => {
    const dir = makeApiDir({
      'users/[id].ts': `export default (ctx) => ({ id: ctx.params.id });`,
      'users/create.post.ts': `export const POST = () => ({ created: true });`,
    });
    const router = createApiRouter({ apiDir: dir });

    const getOnCreate = await router.handleRequest('GET', '/users/create', ctx());
    expect(getOnCreate.status).toBe(405);
    expect(getOnCreate.headers.Allow).toBe('POST');

    // 其它 id 仍走动态路由
    const other = await router.handleRequest('GET', '/users/42', ctx());
    expect(other.body).toEqual({ id: '42' });
  });

  it('路径参数解码，query 不参与匹配', async () => {
    const dir = makeApiDir({
      'users/[id].ts': `export default (ctx) => ({ id: ctx.params.id });`,
    });
    const router = createApiRouter({ apiDir: dir });

    expect((await router.handleRequest('GET', '/users/%E4%B8%AD', ctx())).body).toEqual({
      id: '中',
    });
    expect((await router.handleRequest('GET', '/users/7?x=1', ctx())).status).toBe(200);
  });

  it('500 不泄漏内部错误消息，ApiError 保留状态码与 details', async () => {
    const dir = makeApiDir({
      'boom.ts': `export default () => { throw new Error('/secret/db.sql 连接失败'); };`,
      'teapot.ts': `export default () => {
        const err = new (globalThis.__ApiError)(418, '我是茶壶', { a: 1 });
        throw err;
      };`,
    });
    globalThis.__ApiError = ApiError;
    const router = createApiRouter({ apiDir: dir });

    const boom = await router.handleRequest('GET', '/boom', ctx());
    expect(boom.status).toBe(500);
    expect(JSON.stringify(boom.body)).not.toContain('secret');
    expect(boom.body).toEqual({ error: 'Internal Server Error' });

    const teapot = await router.handleRequest('GET', '/teapot', ctx());
    expect(teapot.status).toBe(418);
    expect(teapot.body).toEqual({ error: '我是茶壶', a: 1 });
  });
});
