#!/usr/bin/env node
/**
 * 门禁：文件路由（`@lytjs/api`）
 *
 * ## 为什么需要这一项
 *
 * `@lytjs/api` 是「按目录生成接口」的那一层：文件名 → 路由、文件名里的方法词 → HTTP 方法、
 * `_middleware.ts` → 鉴权。它的缺陷形态是**静默 404 / 静默不鉴权**：
 *
 *   · `_middleware.ts` 被当成普通路由注册 ⇒ 用户以为有鉴权，**实际一次都没执行**；
 *   · 忽略规则用子串匹配 ⇒ `distribution.ts` 被 `dist` 规则误伤 ⇒ 接口静默消失；
 *   · `posts.ts` 里 `export const POST` 从未生效（路由表只登记 GET）⇒ POST 404、GET 500；
 *   · `createApiRouter()` 不等首次扫描 ⇒ 服务刚起来头几个请求 404，过一会儿又「自己好了」；
 *   · 500 响应把 `error.message` 回给客户端 ⇒ 泄漏文件路径 / SQL。
 *
 * 这些都不会让任何单测变红 —— 单测总是先 await 一轮、也从不真的放一个 `_middleware.ts`。
 *
 * ## 2026-11-03 首次运行抓到的 6 个缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | `_middleware` 从未执行 | 放一个要求 `authorization` 的中间件，匿名请求仍 200 |
 * | 2 | `_middleware.ts` 被注册成路由 | `GET /_middleware` 命中它本身 |
 * | 3 | 忽略规则子串匹配 | `distribution.ts` 被默认 `dist` 规则跳过 ⇒ 404 |
 * | 4 | 文件名无方法词 ⇒ 只登记 GET | `export const POST` ⇒ POST 404、GET 500 |
 * | 5 | 首次扫描不等待 | 构造后立刻请求 ⇒ 404（稍后重试又成功） |
 * | 6 | 500 回传内部错误消息 | 响应体含 `/secret/path/db.sql` |
 *
 * 另：路径参数不解码（`%E4%B8%AD` 原样进 handler）；路径存在但方法不对返回 404 而非 405。
 */

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const api = await import(
  `${ROOT}/packages/ecosystem/packages/web-framework/packages/api/dist/index.mjs`
);
const { createApiRouter, ApiError } = api;

let pass = 0;
let fail = 0;
const failures = [];
const check = (name, ok, detail) => {
  if (ok) {
    pass++;
    console.log(`   ✅ ${name}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`   ❌ ${name}`);
    if (detail !== undefined) {
      console.log(`         → ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
    }
  }
};
const section = (t) => console.log(`\n${t}`);

// ══════════════════════════════════════════════════════════
// 造一个真实的 api 目录
// ══════════════════════════════════════════════════════════
const root = mkdtempSync(join(tmpdir(), 'lyt-api-gate-'));
const write = (rel, code) => {
  const full = join(root, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, code);
};

// 根目录中间件：记录执行顺序 + 允许短路
write(
  '_middleware.ts',
  `export default async (ctx, next) => {
     globalThis.__mw = globalThis.__mw || [];
     globalThis.__mw.push('root');
     if (ctx.path === '/blocked') return { status: 403, headers: {}, body: { blocked: true } };
     return next();
   };`,
);
write('index.ts', `export default () => ({ home: true });`);
write('users/index.ts', `export default () => ({ users: [] });`);
write('users/[id].ts', `export default (ctx) => ({ id: ctx.params.id });`);
write('users/me.ts', `export default () => ({ me: true });`);
write('users/create.post.ts', `export const POST = () => ({ created: true });`);
write('posts.ts', `export const POST = () => ({ created: true });`);
write('postal.ts', `export default () => ({ postal: true });`);
write('distribution.ts', `export default () => ({ dist: true });`);
write('boom.ts', `export default () => { throw new Error('/secret/path/db.sql 连接失败'); };`);
write(
  'teapot.ts',
  `export default () => { throw new (globalThis.__ApiError)(418, '我是茶壶', { a: 1 }); };`,
);
write(
  'admin/_middleware.ts',
  `export default async (ctx, next) => {
     globalThis.__mw.push('admin');
     if (!ctx.headers.authorization) return { status: 401, headers: {}, body: { error: 'no token' } };
     return next();
   };`,
);
write('admin/users.ts', `export default () => ({ admin: true });`);

const ctx = (extra = {}) => ({
  method: 'GET',
  path: '/',
  headers: {},
  params: {},
  query: {},
  ...extra,
});

// 供 teapot.ts 使用（ApiError 实例必须来自同一个模块实例）
globalThis.__ApiError = ApiError;

// ══════════════════════════════════════════════════════════
section('[1] 首次扫描：构造后立刻请求也不能 404（此前是发射后不管）');
{
  globalThis.__mw = [];
  const router = createApiRouter({ apiDir: root });
  // 故意不 await ready()：模拟服务刚启动就收到请求
  const res = await router.handleRequest('GET', '/users', ctx());
  check('构造后立刻请求 /users 返回 200', res.status === 200, res.status);
  check('返回的是真实 handler 结果', JSON.stringify(res.body) === '{"users":[]}', res.body);
}

// 防御：实现缺少 ready() 时判据要报红，而不是让门禁崩在 TypeError 上
const readyOf = (r) => (typeof r.ready === 'function' ? r.ready() : Promise.resolve());

const router = createApiRouter({ apiDir: root });
check('ApiRouter 暴露 ready()（首次扫描可等待）', typeof router.ready === 'function');
await readyOf(router);

// ══════════════════════════════════════════════════════════
section('[2] 扫描规则：文件名 → 路径 / 方法');
{
  const routes = router.getRoutes();
  const byPath = new Map(routes.map((r) => [r.path, r]));

  check('index.ts → /', byPath.has('/'), [...byPath.keys()]);
  check('users/index.ts → /users', byPath.has('/users'), [...byPath.keys()]);
  check('[id].ts → /users/:id', byPath.has('/users/:id'), [...byPath.keys()]);
  check(
    'users/create.post.ts 只登记 POST',
    JSON.stringify(byPath.get('/users/create')?.methods) === '["POST"]',
    byPath.get('/users/create')?.methods,
  );
  check(
    'postal.ts 不会被当成 POST',
    JSON.stringify(byPath.get('/postal')?.methods) === '["GET"]',
    byPath.get('/postal')?.methods,
  );
  check('distribution.ts 未被默认 dist 规则误伤', byPath.has('/distribution'), [...byPath.keys()]);
  check(
    '_middleware.ts 不是路由',
    !byPath.has('/_middleware') && !byPath.has('/admin/_middleware'),
    [...byPath.keys()],
  );

  check(
    '/admin/users 带 1 层目录中间件',
    (byPath.get('/admin/users')?.middlewarePaths ?? []).length === 2,
    byPath.get('/admin/users')?.middlewarePaths,
  );
  check(
    '/users 只带根中间件',
    (byPath.get('/users')?.middlewarePaths ?? []).length === 1,
    byPath.get('/users')?.middlewarePaths,
  );
}

// ══════════════════════════════════════════════════════════
section('[3] 中间件：真的会执行（此前从未执行）');
{
  globalThis.__mw = [];
  const res = await router.handleRequest('GET', '/users', ctx());
  check('匿名请求 /users 仍 200（根中间件放行）', res.status === 200, res.status);
  check('根中间件执行了一次', JSON.stringify(globalThis.__mw) === '["root"]', globalThis.__mw);

  globalThis.__mw = [];
  const blocked = await router.handleRequest('GET', '/blocked', ctx());
  check('中间件短路返回 403', blocked.status === 403, blocked.status);
  check(
    '短路后不再执行 handler',
    JSON.stringify(blocked.body) === '{"blocked":true}',
    blocked.body,
  );

  globalThis.__mw = [];
  const anon = await router.handleRequest('GET', '/admin/users', ctx());
  check('目录中间件拦截匿名请求（此前直接 200）', anon.status === 401, anon.status);
  check(
    '中间件顺序 root → admin',
    JSON.stringify(globalThis.__mw) === '["root","admin"]',
    globalThis.__mw,
  );

  globalThis.__mw = [];
  const authed = await router.handleRequest(
    'GET',
    '/admin/users',
    ctx({ headers: { authorization: 'Bearer t' } }),
  );
  check('带令牌后放行', authed.status === 200 && authed.body?.admin === true, authed.body);
  check(
    '鉴权通过时中间件也按 root → admin 执行',
    JSON.stringify(globalThis.__mw) === '["root","admin"]',
    globalThis.__mw,
  );

  globalThis.__mw = [];
  await router.handleRequest('GET', '/users', ctx());
  check(
    'admin 目录的中间件不影响兄弟目录',
    JSON.stringify(globalThis.__mw) === '["root"]',
    globalThis.__mw,
  );
}

// ══════════════════════════════════════════════════════════
section('[4] 匹配：静态优先、参数解码、query 剥离');
{
  const me = await router.handleRequest('GET', '/users/me', ctx());
  check('/users/me 命中静态路由而不是 :id', JSON.stringify(me.body) === '{"me":true}', me.body);

  const zh = await router.handleRequest('GET', '/users/%E4%B8%AD%E6%96%87', ctx());
  check('路径参数解码', zh.body?.id === '中文', zh.body);

  const withQuery = await router.handleRequest('GET', '/users?page=2', ctx());
  check('query 不参与路径匹配', withQuery.status === 200, withQuery.status);
}

// ══════════════════════════════════════════════════════════
section('[5] 方法：文件名方法 + 模块导出方法都要生效');
{
  const created = await router.handleRequest('POST', '/users/create', ctx());
  check(
    'users/create.post.ts 的 POST 生效',
    created.status === 200 && created.body?.created === true,
    created.body,
  );

  const getOnPostOnly = await router.handleRequest('GET', '/users/create', ctx());
  check('只登记 POST 的路径 GET → 405', getOnPostOnly.status === 405, getOnPostOnly.status);
  check(
    '405 带 Allow: POST',
    (getOnPostOnly.headers.Allow ?? '').includes('POST'),
    getOnPostOnly.headers.Allow,
  );

  // ⚠️ 此前：POST 404（路由表只有 GET），GET 500（找不到 handler）
  const moduleExport = await router.handleRequest('POST', '/posts', ctx());
  check(
    'posts.ts 的 `export const POST` 生效（此前 404）',
    moduleExport.status === 200 && moduleExport.body?.created === true,
    moduleExport.body,
  );

  const getOnModuleExport = await router.handleRequest('GET', '/posts', ctx());
  check('GET /posts → 405（此前 500）', getOnModuleExport.status === 405, getOnModuleExport.status);
  check(
    '405 的 Allow 来自模块导出',
    (getOnModuleExport.headers.Allow ?? '') === 'POST',
    getOnModuleExport.headers.Allow,
  );

  const unknown = await router.handleRequest('GET', '/nope', ctx());
  check('未知路径仍是 404（对照）', unknown.status === 404, unknown.status);
}

// ══════════════════════════════════════════════════════════
section('[6] 错误契约：不泄漏内部信息，ApiError 保留语义');
{
  const boom = await router.handleRequest('GET', '/boom', ctx());
  check('未预期错误 → 500', boom.status === 500, boom.status);
  check(
    '500 不泄漏 error.message（此前含 /secret/path/db.sql）',
    !JSON.stringify(boom.body).includes('secret'),
    boom.body,
  );
  check('500 仍是可读 JSON', boom.body?.error === 'Internal Server Error', boom.body);

  const teapot = await router.handleRequest('GET', '/teapot', ctx());
  check('ApiError 保留状态码', teapot.status === 418, teapot.status);
  check('ApiError 保留 details', teapot.body?.a === 1, teapot.body);
}

// ══════════════════════════════════════════════════════════
section('[7] 返回值归一化');
{
  const res = await router.handleRequest('GET', '/users', ctx());
  check(
    '普通对象 → 200 + JSON content-type',
    res.status === 200 && res.headers['Content-Type'].includes('json'),
  );

  const manual = createApiRouter({ apiDir: root });
  await readyOf(manual);
  manual.addRoute({ path: '/manual', methods: ['GET'], handlerPath: 'x', isDynamic: false });
  const viaResolve = createApiRouter({
    apiDir: root,
    resolveHandler: () => () => ({ status: 201, headers: { 'x-manual': '1' }, body: { ok: 1 } }),
  });
  await readyOf(viaResolve);
  viaResolve.addRoute({ path: '/manual', methods: ['GET'], handlerPath: 'x', isDynamic: false });
  const r = await viaResolve.handleRequest('GET', '/manual', ctx());
  check(
    '自定义 resolveHandler 的 {status,headers,body} 被保留',
    r.status === 201 && r.headers['x-manual'] === '1',
    r,
  );
}

// ══════════════════════════════════════════════════════════
section('[8] 源码级守卫：忽略规则不能退回子串匹配');
{
  const utilsSrc = readFileSync(
    join(ROOT, 'packages/ecosystem/packages/web-framework/packages/api/src/utils.ts'),
    'utf-8',
  );
  check('utils 导出 isIgnoredPath（按路径段）', utilsSrc.includes('export function isIgnoredPath'));
  // 去掉注释再判：说明文字里会引用旧实现，不能算违规
  const codeOnly = utilsSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check(
    '忽略判断不再用 includes（子串匹配会误伤 distribution.ts）',
    !/\b(relativePath|file)\.includes\(pattern\)/.test(codeOnly),
  );
  check('utils 导出 scanApiTree（带中间件链）', utilsSrc.includes('export function scanApiTree'));
}

rmSync(root, { recursive: true, force: true });

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
