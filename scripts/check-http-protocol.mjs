#!/usr/bin/env node
/**
 * 门禁：HTTP 协议层正确性（`@lytjs/http-server`）
 *
 * ## 为什么需要这一项
 *
 * 这一层是**整个后端的入口**，但它的缺陷有一个共同特征：**不抛异常、不影响单测**。
 * 现有的 3 个测试文件（314 行）覆盖的是「路由能匹配上 / body 能解析 / 抛错不挂起」，
 * 而真正决定能不能上线的是**协议细节**：
 *
 *   · 两条 `Set-Cookie` 只剩最后一条 ⇒ 登录只种上一个 cookie，刷新令牌永远丢；
 *   · `Content-Type` 被当成没设 ⇒ JSON 响应变成 `text/plain`，前端 `res.json()` 直接抛；
 *   · `HEAD` 打不到 `GET` 路由 ⇒ 健康检查 / CDN 回源 / 监控探测全部 404；
 *   · 路由参数不解码 ⇒ `params.id` 是 `%E4%B8%AD%E6%96%87`，拿去查库必然查不到；
 *   · 通配符路由被参数路由抢走 ⇒ 注册了却永远命中不了，请求被错误的处理器吃掉；
 *   · 错误响应丢掉中间件写好的头 ⇒ 浏览器侧只剩 opaque error，连状态码都读不到。
 *
 * 这些**都能在「单测全绿 + 手工点一下首页正常」的情况下上线**。
 *
 * ## 2026-11-03 首次运行抓到的 8 个缺陷
 *
 * | # | 缺陷 | 实测（修复前） |
 * |---|---|---|
 * | 1 | 数组响应头逐项 `setHeader`，后一条覆盖前一条 | 2 条 `set-cookie` → 只剩 `b=2` |
 * | 2 | 判断「用户是否设了 content-type」用精确小写键 | 写 `Content-Type: application/json` → 实际 `text/plain` |
 * | 3 | `HEAD` 不走 `GET` 路由回落 | `HEAD /str` → **404**（`GET /str` 200） |
 * | 4 | 路径参数不解码 | `params.id` = `%E4%B8%AD%E6%96%87` |
 * | 5 | 路由优先级用**总和**打分 | `/a/b/*`(6) 输给 `/a/:x/:y`(7)，通配符永不命中 |
 * | 6 | body 解析错误直接抛，跳过中间件链 | 413 / 400 无 CORS 头 |
 * | 7 | 错误响应只写 res，丢掉 ctx 上已写的头 | 401 / 500 无 CORS、无 `x-request-id` |
 * | 8 | 方法不匹配一律 404 | `POST` 到 GET-only 路径 → 404，无 `Allow` |
 *
 * 另修：query 里 `+` 未按 form 编码解成空格（`?q=a+b` → `"a+b"`，搜「a b」搜不到）。
 *
 * 判据全部走**真实 HTTP 往返**（`listen(0)` + `fetch`），因为上述缺陷没有一条能在
 * 纯函数单测里暴露 —— 它们发生在 `dispatch` / `sendResponse` 里。
 */

const ROOT = process.cwd();
const { createServer, HttpError } = await import(
  `${ROOT}/packages/ecosystem/packages/web-framework/packages/http-server/dist/index.mjs`
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

// ══════════════════════════════════════════════════════════
// 主服务器：所有协议用例共用（一次 listen，避免端口抖动）
// ══════════════════════════════════════════════════════════
const s = createServer();

s.use(async (ctx, next) => {
  ctx.response.headers['access-control-allow-origin'] = '*';
  ctx.response.headers['x-request-id'] = 'req-1';
  await next();
});

// [1] 响应头数组
s.get('/cookies', (ctx) => {
  ctx.response.headers['set-cookie'] = ['access=a; Path=/', 'refresh=b; Path=/'];
  ctx.response.headers.vary = ['accept', 'origin'];
  ctx.response.headers['x-single'] = 'one';
  ctx.response.body = 'ok';
});
s.get('/cookie-single', (ctx) => {
  ctx.response.headers['set-cookie'] = 'only=1; Path=/';
  ctx.response.body = 'ok';
});

// [2] 头大小写
s.get('/upper-ct', (ctx) => {
  ctx.response.headers['Content-Type'] = 'application/json; charset=utf-8';
  ctx.response.headers['Cache-Control'] = 'max-age=60';
  ctx.response.body = '{"a":1}';
});
s.get('/default-ct-string', (ctx) => {
  ctx.response.body = 'plain';
});
s.get('/default-ct-object', (ctx) => {
  ctx.response.body = { ok: true };
});

// [3] HEAD
s.get('/str', (ctx) => {
  ctx.response.body = 'hello';
});
s.get('/head-explicit', (ctx) => {
  ctx.response.headers['x-route'] = 'get';
  ctx.response.body = 'from-get';
});
s.on('HEAD', '/head-explicit', (ctx) => {
  ctx.response.headers['x-route'] = 'head';
  ctx.response.body = 'from-head';
});

// [4] 路径解码
s.get('/users/:id', (ctx) => {
  ctx.response.body = { id: ctx.request.params.id };
});
s.get('/files/:name', (ctx) => {
  ctx.response.body = { name: ctx.request.params.name };
});
s.get('/café', (ctx) => {
  ctx.response.body = 'cafe';
});

// [5] 路由优先级
s.on('GET', '/a/b/*', (ctx) => {
  ctx.response.body = { route: 'wildcard', params: ctx.request.params };
});
s.on('GET', '/a/:x/:y', (ctx) => {
  ctx.response.body = { route: 'params', params: ctx.request.params };
});
s.get('/users/me', (ctx) => {
  ctx.response.body = { route: 'static' };
});
s.get('/exact', (ctx) => {
  ctx.response.body = { route: 'exact' };
});
s.get('/exact/*', (ctx) => {
  ctx.response.body = { route: 'exact-wildcard' };
});
s.get('/p/:a/:b', (ctx) => {
  ctx.response.body = { route: 'p-params' };
});
s.get('/p/x/*', (ctx) => {
  ctx.response.body = { route: 'p-wildcard' };
});

// [6] 405
s.post('/only-post', (ctx) => {
  ctx.response.body = 'posted';
});
s.get('/get-only', (ctx) => {
  ctx.response.body = 'got';
});

// [7] 错误路径
s.get('/unauthorized', () => {
  throw new HttpError(401, '未授权');
});
s.get('/boom', () => {
  throw new Error('内部细节不应泄漏');
});
s.post('/json', (ctx) => {
  ctx.response.body = 'never';
});
s.post('/big', (ctx) => {
  ctx.response.body = 'never';
});

// [8] 响应体协议
s.get('/no-content', (ctx) => {
  ctx.response.status = 204;
  ctx.response.body = 'should-not-appear';
});
s.get('/not-modified', (ctx) => {
  ctx.response.status = 304;
  ctx.response.body = 'should-not-appear';
});
s.get('/zh', (ctx) => {
  ctx.response.body = '中文';
});
s.get('/zero', (ctx) => {
  ctx.response.body = 0;
});
s.get('/false', (ctx) => {
  ctx.response.body = false;
});

// [9] query
s.get('/q', (ctx) => {
  ctx.response.body = { query: ctx.request.query };
});

await s.listen(0, '127.0.0.1');
const base = `http://127.0.0.1:${s.port}`;

// ══════════════════════════════════════════════════════════
section('[1] 响应头数组：多条同名字头必须逐条发出（不是后一条覆盖前一条）');
{
  const res = await fetch(`${base}/cookies`);
  const cookies = res.headers.getSetCookie();
  check(
    '两条 set-cookie 都要到客户端',
    cookies.length === 2,
    `实际 ${cookies.length} 条：${cookies}`,
  );
  check(
    'set-cookie 顺序保持注册顺序',
    cookies[0]?.startsWith('access=') && cookies[1]?.startsWith('refresh='),
    cookies,
  );
  check(
    '数组头 vary 两条都发出',
    (res.headers.get('vary') ?? '').split(',').length === 2,
    res.headers.get('vary'),
  );
  check(
    '同批次里的普通头不受影响',
    res.headers.get('x-single') === 'one',
    res.headers.get('x-single'),
  );

  const one = await fetch(`${base}/cookie-single`);
  check('单个字符串 set-cookie 仍是 1 条（对照）', one.headers.getSetCookie().length === 1);
}

// ══════════════════════════════════════════════════════════
section('[2] 响应头大小写：处理器写 Content-Type 必须被尊重（不能被覆盖成 text/plain）');
{
  const res = await fetch(`${base}/upper-ct`);
  check(
    'Content-Type 原样保留（含 charset）',
    res.headers.get('content-type') === 'application/json; charset=utf-8',
    res.headers.get('content-type'),
  );
  check('大写 Cache-Control 生效', res.headers.get('cache-control') === 'max-age=60');
  check('响应体未被改动', (await res.text()) === '{"a":1}');

  const str = await fetch(`${base}/default-ct-string`);
  check('未设时字符串默认 text/plain（对照）', str.headers.get('content-type') === 'text/plain');
  const obj = await fetch(`${base}/default-ct-object`);
  check(
    '未设时对象默认 application/json（对照）',
    obj.headers.get('content-type') === 'application/json',
  );
}

// ══════════════════════════════════════════════════════════
section('[3] HEAD：与 GET 同语义、只不发体');
{
  const getRes = await fetch(`${base}/str`);
  const getBody = await getRes.text();
  const headRes = await fetch(`${base}/str`, { method: 'HEAD' });

  check('HEAD 打到只注册了 GET 的路由应 200（此前 404）', headRes.status === 200, headRes.status);
  check('HEAD 不得带响应体', (await headRes.text()) === '');
  check(
    'HEAD 的 content-length 与 GET 一致',
    headRes.headers.get('content-length') === getRes.headers.get('content-length'),
    `HEAD=${headRes.headers.get('content-length')} GET=${getRes.headers.get('content-length')}`,
  );
  check('GET 本身仍返回完整体（对照）', getBody === 'hello', getBody);

  const explicit = await fetch(`${base}/head-explicit`, { method: 'HEAD' });
  check(
    '显式注册的 HEAD 优先于 GET 回落',
    explicit.headers.get('x-route') === 'head',
    explicit.headers.get('x-route'),
  );

  const missing = await fetch(`${base}/no-such-path`, { method: 'HEAD' });
  check('未注册路径的 HEAD 仍 404（对照）', missing.status === 404, missing.status);
}

// ══════════════════════════════════════════════════════════
section('[4] 路径解码：参数与静态段都按解码后的值匹配');
{
  const zh = await (await fetch(`${base}/users/%E4%B8%AD%E6%96%87`)).json();
  check('中文参数解码', zh.id === '中文', zh.id);

  const slash = await (await fetch(`${base}/files/a%2Fb`)).json();
  check('%2F 表示段内斜杠（不再切段）', slash.name === 'a/b', slash.name);

  const cafe = await fetch(`${base}/caf%C3%A9`);
  check('静态段也按解码后比较', cafe.status === 200, cafe.status);

  // 畸形转义（`%zz`）：`decodeURIComponent` 会抛 URIError。判据是「不因此 500、不崩」，
  // 值保持原样交给业务（业务自己决定要不要拒绝），而不是让整个请求 500。
  const bad = await fetch(`${base}/users/%zz`);
  check('畸形转义不 500', bad.status !== 500, bad.status);
  const badBody = await bad.json().catch(() => ({}));
  check('畸形转义原样传递（不做有损猜测）', badBody.id === '%zz', badBody.id);
  const alive = await fetch(`${base}/users/ok`);
  check('畸形转义后服务器仍正常服务', alive.status === 200, alive.status);
}

// ══════════════════════════════════════════════════════════
section('[5] 路由优先级：逐段比较（静态 > 参数 > 可选 > 通配），不是总和');
{
  const wildcard = await (await fetch(`${base}/a/b/c`)).json();
  check(
    '/a/b/* 应胜过 /a/:x/:y（此前被参数路由抢走）',
    wildcard.route === 'wildcard',
    JSON.stringify(wildcard),
  );
  check('通配符捕获剩余路径', wildcard.params?.['*'] === 'c', wildcard.params);

  const stat = await (await fetch(`${base}/users/me`)).json();
  check('静态 /users/me 胜过 /users/:id（对照）', stat.route === 'static', JSON.stringify(stat));

  const exact = await (await fetch(`${base}/exact`)).json();
  check('精确路由胜过同级通配符', exact.route === 'exact', JSON.stringify(exact));

  const deep = await (await fetch(`${base}/p/x/y`)).json();
  check('第 2 段是静态的 /p/x/* 胜过 /p/:a/:b', deep.route === 'p-wildcard', JSON.stringify(deep));
}

// ══════════════════════════════════════════════════════════
section('[6] 405：路径存在但方法不对（附 Allow），不是 404');
{
  const res = await fetch(`${base}/get-only`, { method: 'POST' });
  check('POST 到 GET-only 路径应 405（此前 404）', res.status === 405, res.status);
  const allow = res.headers.get('allow') ?? '';
  check('Allow 含 GET', allow.includes('GET'), allow);
  check('Allow 含 HEAD（GET 隐含）', allow.includes('HEAD'), allow);
  check('Allow 不含未注册的 POST（负向对照）', !allow.includes('POST'), allow);
  const body = await res.json();
  check('405 有可读的 JSON 体', body.error === '方法不允许', JSON.stringify(body));

  const unknown = await fetch(`${base}/never-registered`, { method: 'POST' });
  check('路径不存在仍 404（对照）', unknown.status === 404, unknown.status);
  check('404 不误发 Allow 头', unknown.headers.get('allow') === null, unknown.headers.get('allow'));
}

// ══════════════════════════════════════════════════════════
section('[7] 错误路径：中间件已写的头必须一起发出');
{
  const unauth = await fetch(`${base}/unauthorized`);
  check('HttpError(401) 按状态码返回', unauth.status === 401, unauth.status);
  check('401 带 CORS（此前丢失）', unauth.headers.get('access-control-allow-origin') === '*');
  check('401 带 x-request-id（此前丢失）', unauth.headers.get('x-request-id') === 'req-1');

  const boom = await fetch(`${base}/boom`);
  check('未预期错误 → 500', boom.status === 500, boom.status);
  check('500 不泄漏内部信息', !(await boom.text()).includes('内部细节'), '响应体含内部信息');
  check('500 带 CORS（此前丢失）', boom.headers.get('access-control-allow-origin') === '*');

  const badJson = await fetch(`${base}/json`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ not json',
  });
  check('非法 JSON → 400', badJson.status === 400, badJson.status);
  check(
    '400 带 CORS（此前丢失：body 解析早于中间件）',
    badJson.headers.get('access-control-allow-origin') === '*',
  );

  const big = await fetch(`${base}/big`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'x'.repeat(1024 * 1024 + 16),
  });
  check('超限请求体 → 413', big.status === 413, big.status);
  check('413 带 CORS（此前丢失）', big.headers.get('access-control-allow-origin') === '*');

  const notFound = await fetch(`${base}/nope`);
  check('404 带 CORS（正常路径对照）', notFound.headers.get('access-control-allow-origin') === '*');
}

// ══════════════════════════════════════════════════════════
section('[8] 响应体协议：无体状态码、UTF-8 字节长度、假值');
{
  const nc = await fetch(`${base}/no-content`);
  check('204 状态保持', nc.status === 204, nc.status);
  check('204 不得带体', (await nc.text()) === '');
  check(
    '204 不得带 content-length',
    nc.headers.get('content-length') === null,
    nc.headers.get('content-length'),
  );

  const nm = await fetch(`${base}/not-modified`);
  check('304 不得带体', nm.status === 304 && (await nm.text()) === '', nm.status);

  const zh = await fetch(`${base}/zh`);
  check(
    'content-length 按 UTF-8 字节数（不是字符数）',
    zh.headers.get('content-length') === String(Buffer.byteLength('中文')),
    `实际 ${zh.headers.get('content-length')}，期望 ${Buffer.byteLength('中文')}`,
  );

  const zero = await fetch(`${base}/zero`);
  check('body=0 仍要发送（不能当 falsy 丢掉）', (await zero.text()) === '0');
  const f = await fetch(`${base}/false`);
  check('body=false 仍要发送', (await f.text()) === 'false');
}

// ══════════════════════════════════════════════════════════
section('[9] query：form 编码里 + 是空格，%2B 才是加号');
{
  const plus = await (await fetch(`${base}/q?q=a+b`)).json();
  check('+ 解码为空格', plus.query.q === 'a b', plus.query.q);

  const encoded = await (await fetch(`${base}/q?q=a%2Bb`)).json();
  check('%2B 解码为加号', encoded.query.q === 'a+b', encoded.query.q);

  const dup = await (await fetch(`${base}/q?tag=x&tag=y`)).json();
  check(
    '重复键仍是数组（对照）',
    Array.isArray(dup.query.tag) && dup.query.tag.length === 2,
    dup.query.tag,
  );
}

await s.close();

// ══════════════════════════════════════════════════════════
section('[10] bodyLimit 可配置（独立实例）');
{
  const small = createServer({ bodyLimit: 16 });
  small.post('/big', (ctx) => {
    ctx.response.body = 'never';
  });
  await small.listen(0, '127.0.0.1');
  const res = await fetch(`http://127.0.0.1:${small.port}/big`, {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'x'.repeat(64),
  });
  check('自定义 bodyLimit 生效', res.status === 413, res.status);
  await small.close();
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
