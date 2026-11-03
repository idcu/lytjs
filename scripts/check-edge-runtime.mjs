#!/usr/bin/env node
/**
 * 门禁：边缘运行时（`@lytjs/runtime-edge`）
 *
 * ## 为什么需要这一项
 *
 * 这个包只有 250 行，但它是**部署形态的最后一公里**：Workers / Deno / Vercel
 * 只接受**真正的 `Response`**。返回鸭子类型对象时，本地单测（只看 `.status`）
 * 全绿，线上直接 `TypeError` 或把响应序列化成 `{}`。
 *
 * 同一个缺陷族在本仓已经出现过三次：
 *   · 2026-10-31 把 json / text / html 三个 helper 改成返回真 `Response`；
 *   · 2026-11-02 发现 `redirectResponse` 被漏掉；
 *   · 2026-11-03（本轮）发现**路由器自己的 404 / 500 分支**和
 *     **`handle()` 对 handler 返回值的透传**仍然泄漏 —— 三次都是「修了几处、漏了几处」。
 *
 * 另一半是**能力缺失**：路由此前只有「精确字符串相等」，`:id` / `*` / 尾斜杠 /
 * `basePath` 归一化全都没有。`basePath: '/api/'` + `'/users'` 拼成 `/api//users`，
 * 该路由**永远命中不了**，而注册时没有任何提示。
 *
 * ## 2026-11-03 首次运行抓到的 7 个缺陷（修复前实测）
 *
 * | # | 缺陷 | 实测 |
 * |---|---|---|
 * | 1 | 404 / 500 返回鸭子类型对象（不是 `Response`），且**没有 body** | `instanceof Response === false`，`keys = [status,statusText,headers]` |
 * | 2 | `handle()` 原样透传 handler 的返回值 | handler 返回 `{status,headers,body}` ⇒ `instanceof === false` |
 * | 3 | `new URL(request.url)` 对相对 URL 抛错，且在 try/catch **之外** | `handle({url:'/api/x'})` ⇒ 未捕获 `TypeError: Invalid URL` |
 * | 4 | `basePath` 不归一化 | `'/api/' + '/users'` ⇒ `/api//users` ⇒ **404** |
 * | 5 | 不支持 `:param` / `*` | `/users/1` 打 `'/users/:id'` ⇒ **404** |
 * | 6 | 不容忍尾斜杠 | `/users/` 打 `'/users'` ⇒ 404 |
 * | 7 | 缓存无上限 | 6 个 key 全部常驻（长活 isolate ⇒ 内存只增不减） |
 *
 * 另：`EdgeResponse` 类型声明为结构体、实现却是 `Response` ⇒ 类型谎言；
 * `EdgeRequest.headers` 声明为 `Record<string,string>`，真实 `Request`（`Headers`）
 * **通不过类型检查** —— 文档里那段 Workers 示例其实编译不过。
 */

const ROOT = process.cwd();
const { createEdgeRouter, createEdgeCache, jsonResponse, toResponse } = await import(
  `${ROOT}/packages/ecosystem/packages/runtime-edge/dist/index.mjs`
);

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

/** 读响应体；不是 Response 时返回可诊断的占位串（门禁自身不能崩） */
const bodyOf = async (res) => {
  if (typeof res?.text === 'function') return await res.text();
  return `<不是 Response：keys=${Object.keys(res ?? {}).join(',')}>`;
};
/** 读响应头；不是 Response 时返回 null */
const headerOf = (res, name) =>
  typeof res?.headers?.get === 'function' ? res.headers.get(name) : null;

const req = (url, method = 'GET') => ({ url, method, headers: {} });

// ══════════════════════════════════════════════════════════
section('[1] 错误响应必须是真正的 Response（且带可读 body）');
{
  const router = createEdgeRouter();
  router.get('/ok', () => jsonResponse({ ok: 1 }));

  const notFound = await router.handle(req('http://x/nope'));
  check('404 是真正的 Response', notFound instanceof Response, `实际 ${Object.keys(notFound)}`);
  check('404 状态码', notFound.status === 404, notFound.status);
  check('404 有 body（此前为空）', (await bodyOf(notFound)) === 'Not Found');

  const boom = createEdgeRouter();
  boom.get('/boom', () => {
    throw new Error('内部细节 SECRET');
  });
  const serverError = await boom.handle(req('http://x/boom'));
  check('500 是真正的 Response', serverError instanceof Response);
  check('500 状态码', serverError.status === 500, serverError.status);
  const errBody = await bodyOf(serverError);
  check('500 不泄漏内部信息', !errBody.includes('SECRET'), errBody);

  const onlyPost = createEdgeRouter();
  onlyPost.post('/only', () => jsonResponse({}));
  const methodNotAllowed = await onlyPost.handle(req('http://x/only'));
  check('方法不匹配 → 405（此前 404）', methodNotAllowed.status === 405, methodNotAllowed.status);
  check(
    '405 带 Allow',
    headerOf(methodNotAllowed, 'allow') === 'POST',
    headerOf(methodNotAllowed, 'allow'),
  );
  check('405 是真正的 Response', methodNotAllowed instanceof Response);

  const unknown = await onlyPost.handle(req('http://x/never'));
  check('路径不存在仍是 404（对照）', unknown.status === 404, unknown.status);
  check('404 不误发 Allow（负向对照）', headerOf(unknown, 'allow') === null);
}

// ══════════════════════════════════════════════════════════
section('[2] handler 返回值归一化（鸭子类型不再泄漏到运行时）');
{
  const router = createEdgeRouter();
  router.get('/plain-json', () => ({ status: 200, headers: { 'x-plain': '1' }, body: { ok: 1 } }));
  router.get('/plain-text', () => ({ status: 201, body: 'created' }));
  router.get('/plain-empty', () => ({ status: 204, body: 'should-not-appear' }));
  const real = jsonResponse({ real: true });
  router.get('/real', () => real);

  const a = await router.handle(req('http://x/plain-json'));
  check('普通对象 → 真正的 Response', a instanceof Response);
  check('普通对象 body 序列化为 JSON', (await bodyOf(a)) === '{"ok":1}');
  check('普通对象的 headers 保留', headerOf(a, 'x-plain') === '1');
  check(
    '普通对象未设 content-type 时补 application/json',
    headerOf(a, 'content-type') === 'application/json',
    headerOf(a, 'content-type'),
  );

  const b = await router.handle(req('http://x/plain-text'));
  check('普通对象字符串 body 原样', (await bodyOf(b)) === 'created');
  check('普通对象自定义状态码', b.status === 201, b.status);

  const c = await router.handle(req('http://x/plain-empty'));
  check('204 不因 body 报错（Response 构造约束）', c.status === 204, c.status);
  check('204 无体', (await bodyOf(c)) === '');

  const d = await router.handle(req('http://x/real'));
  check('真正的 Response 原样透传（引用相等）', d === real);

  const normalized = toResponse(null);
  check(
    'toResponse(null) 兜底成 200 空响应',
    normalized instanceof Response && normalized.status === 200,
  );
}

// ══════════════════════════════════════════════════════════
section('[3] URL 解析：相对 URL 不崩、畸形 URL 回 400');
{
  const router = createEdgeRouter();
  router.get('/users', () => jsonResponse({ ok: 1 }));

  const rel = await router.handle(req('/users'));
  check('相对 URL 可解析（此前抛 TypeError）', rel.status === 200, rel.status);
  check('相对 URL 的响应也是 Response', rel instanceof Response);

  // `http://[::1` 这种才是真的解析失败（`::` 会被当成相对路径 `/::`）
  const bad = await router.handle(req('http://[::1'));
  check('畸形 URL → 400（不是未捕获异常）', bad.status === 400, bad.status);
  check('畸形 URL 的响应也是 Response', bad instanceof Response);

  const matched = router.match(req('/users'));
  check('match() 也接受相对 URL', matched !== null);
}

// ══════════════════════════════════════════════════════════
section('[4] basePath 归一化 + 尾斜杠容忍');
{
  const cases = [
    ['/api/', '/users', 'http://x/api/users'],
    ['/api', '/users', 'http://x/api/users'],
    ['/api//', 'users', 'http://x/api/users'],
    ['/', '/users', 'http://x/users'],
    ['', '/users', 'http://x/users'],
  ];
  for (const [basePath, path, url] of cases) {
    const r = createEdgeRouter({ basePath });
    r.get(path, () => jsonResponse({ ok: 1 }));
    const res = await r.handle(req(url));
    check(`basePath="${basePath}" + "${path}" ⇒ ${url}`, res.status === 200, res.status);
  }

  const r2 = createEdgeRouter();
  r2.get('/users', () => jsonResponse({ ok: 1 }));
  check('请求尾斜杠 /users/ 命中 /users', (await r2.handle(req('http://x/users/'))).status === 200);
  check('重复斜杠 /users// 也能命中', (await r2.handle(req('http://x/users//'))).status === 200);
  check('根路径 / 正常', (await createEdgeRouter().handle(req('http://x/'))).status === 404);
}

// ══════════════════════════════════════════════════════════
section('[5] 路径参数与通配符（此前只有精确相等）');
{
  const router = createEdgeRouter();
  router.get('/users/:id', (_r, _c, params) => jsonResponse({ id: params.id }));
  router.get('/users/me', () => jsonResponse({ route: 'static' }));
  router.get('/files/*', (_r, _c, params) => jsonResponse({ rest: params['*'] }));
  router.get('/a/b/*', () => jsonResponse({ route: 'wildcard' }));
  router.get('/a/:x/:y', () => jsonResponse({ route: 'params' }));

  const one = await (await router.handle(req('http://x/users/42'))).json();
  check(':id 捕获', one.id === '42', JSON.stringify(one));

  const decoded = await (await router.handle(req('http://x/users/%E4%B8%AD%E6%96%87'))).json();
  check('参数做百分号解码', decoded.id === '中文', decoded.id);

  const stat = await (await router.handle(req('http://x/users/me'))).json();
  check('静态段胜过参数段', stat.route === 'static', JSON.stringify(stat));

  const wild = await (await router.handle(req('http://x/files/a/b/c'))).json();
  check('通配符吞掉剩余全部段', wild.rest === 'a/b/c', wild.rest);

  const prio = await (await router.handle(req('http://x/a/b/c'))).json();
  check(
    '通配符路由胜过参数路由（逐段比较，不是求和）',
    prio.route === 'wildcard',
    JSON.stringify(prio),
  );

  const missing = await router.handle(req('http://x/users'));
  check('参数缺失不算匹配（/users 不打 /users/:id）', missing.status === 404, missing.status);
}

// ══════════════════════════════════════════════════════════
section('[6] 并发隔离：params 必须是本次请求私有的');
{
  const router = createEdgeRouter();
  router.get('/users/:id', async (_r, _c, params) => {
    // 故意在 handler 里让出事件循环，放大「共享 route 对象」的竞态
    await new Promise((resolve) => setTimeout(resolve, 5));
    return jsonResponse({ id: params.id });
  });

  const ids = Array.from({ length: 20 }, (_, i) => `u${i}`);
  const bodies = await Promise.all(
    ids.map(async (id) => (await router.handle(req(`http://x/users/${id}`))).json()),
  );
  const mismatched = bodies.filter((body, i) => body.id !== ids[i]);
  check('20 个并发请求的 :id 互不串扰', mismatched.length === 0, `串了 ${mismatched.length} 个`);

  const route = router.match(req('http://x/users/first'));
  const route2 = router.match(req('http://x/users/second'));
  check(
    'match() 返回副本（注册项不被改写）',
    route.params.id === 'first' && route2.params.id === 'second',
  );
}

// ══════════════════════════════════════════════════════════
section('[7] HEAD：回落 GET 且 Allow 里含 HEAD');
{
  const router = createEdgeRouter();
  router.get('/health', () => jsonResponse({ ok: true }));

  const head = await router.handle(req('http://x/health', 'HEAD'));
  check('HEAD 打到 GET 路由（此前 404）', head.status === 200, head.status);

  const onlyPost = createEdgeRouter();
  onlyPost.post('/p', () => jsonResponse({}));
  const res = await onlyPost.handle(req('http://x/p', 'HEAD'));
  check('HEAD 对 POST-only 路径 → 405', res.status === 405, res.status);
  check(
    'Allow 只列真实存在的方法（POST 不隐含 HEAD）',
    headerOf(res, 'allow') === 'POST',
    headerOf(res, 'allow'),
  );
}

// ══════════════════════════════════════════════════════════
section('[8] 缓存：容量上限 / 覆盖 / 过期');
{
  const c = createEdgeCache({ maxSize: 3 });
  for (let i = 0; i < 6; i++) await c.set(`k${i}`, i);
  check('超过 maxSize 后条目数不增长', (await c.size()) === 3, await c.size());
  check('最旧的条目被淘汰', (await c.has('k0')) === false);
  check('最新的条目仍在', (await c.get('k5')) === 5);

  const c2 = createEdgeCache({ maxSize: 10 });
  for (let i = 0; i < 5; i++) await c2.set('same', i);
  check('覆盖同一 key 不增加条目数', (await c2.size()) === 1, await c2.size());
  check('覆盖后取到最新值', (await c2.get('same')) === 4);

  const c3 = createEdgeCache({ maxSize: 100 });
  await c3.set('short', 'v', { ttl: 1 });
  await new Promise((r) => setTimeout(r, 10));
  check('过期后 get 返回 null', (await c3.get('short')) === null);
  check('过期后 has 返回 false', (await c3.has('short')) === false);

  const c4 = createEdgeCache();
  await c4.set('keep', { deep: true }, { ttl: 60000 });
  check('未过期时原样取回（对象）', (await c4.get('keep')).deep === true);
  check('delete 生效', (await c4.delete('keep'), await c4.has('keep')) === false);
}

// ══════════════════════════════════════════════════════════
section('[9] 响应 helper 仍然返回真 Response（回归）');
{
  for (const [name, res] of [
    ['jsonResponse', jsonResponse({ a: 1 })],
    [
      'textResponse',
      (
        await import(`${ROOT}/packages/ecosystem/packages/runtime-edge/dist/index.mjs`)
      ).textResponse('t'),
    ],
    [
      'htmlResponse',
      (
        await import(`${ROOT}/packages/ecosystem/packages/runtime-edge/dist/index.mjs`)
      ).htmlResponse('<p>x</p>'),
    ],
    [
      'redirectResponse',
      (
        await import(`${ROOT}/packages/ecosystem/packages/runtime-edge/dist/index.mjs`)
      ).redirectResponse('https://e.com'),
    ],
  ]) {
    check(`${name} 是真正的 Response`, res instanceof Response);
  }
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
