#!/usr/bin/env node
/* eslint-disable no-undef -- 本脚本刻意在裸 Node 里模拟浏览器全局（见文件头注释） */
/**
 * scripts/check-integration.mjs
 *
 * **集成门禁：把「接起来才知道坏没坏」的链路真的接起来跑一遍。**
 *
 * ## 覆盖（每条都曾是真 P0，且都能在测试全绿时静默失效）
 *
 * 1. UI：Input 打字 → `update:modelValue`（此前 props 未声明，恒 undefined）
 * 2. UI：Select 选中 → `update:modelValue`（此前只调 onChange）
 * 3. UI：Tabs 的 TabPane 插槽内容要真的显示（此前 slot 对象被丢）
 * 4. UI：Form 校验错误要显示到 FormItem（此前 errors 闭在 Form 内）
 * 5. HTTP：CORS 预检 / 正常响应头 / auth 401 / rate-limit 429
 *    （此前 http-server **丢弃中间件返回值**，三件套全部静默失效）
 * 6. HTTP：CORS 开启后 JSON 响应体不能被压成 `"[object Object]"`
 * 7. 生态：`plugin.register()` 必须真的执行 `install()`
 * 8. 生态：`runtime-edge` 的响应必须是真正的 `Response`
 *
 * 退出码：0 = 全部通过；1 = 有失败。
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  /* 某些 Node 版本 navigator 只读 */
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const url = (p) => new URL(p, import.meta.url).href;
const { createApp, h } = await import(url('../packages/core/dist/index.mjs'));
const UI = await import(url('../packages/ecosystem/packages/ui/dist/index.mjs'));
const { createServer, createRouter } = await import(
  url('../packages/ecosystem/packages/web-framework/packages/http-server/dist/index.mjs')
);
const { createCorsMiddleware } = await import(
  url('../packages/ecosystem/packages/web-framework/packages/middleware-cors/dist/index.mjs')
);
const { createAuthMiddleware } = await import(
  url('../packages/ecosystem/packages/web-framework/packages/middleware-auth/dist/index.mjs')
);
const { createRateLimitMiddleware } = await import(
  url('../packages/ecosystem/packages/web-framework/packages/middleware-rate-limit/dist/index.mjs')
);
const pluginPkg = await import(url('../packages/ecosystem/packages/plugin/dist/index.mjs'));
const edgePkg = await import(url('../packages/ecosystem/packages/runtime-edge/dist/index.mjs'));

const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));
const mkRoot = () => {
  const d = document.createElement('div');
  document.body.appendChild(d);
  return d;
};

let failed = 0;
const check = (name, ok, detail) => {
  if (!ok) failed++;
  console.log(`   ${ok ? '✅' : '❌'} ${name}${detail && !ok ? ' —— ' + detail : ''}`);
};

console.log('\n🔍 集成门禁 check-integration\n');

// ── UI ────────────────────────────────────────────────────────
console.log('   [UI]');
{
  const root = mkRoot();
  let got = null;
  await createApp({
    setup: () => () => h(UI.Input, { modelValue: '', 'onUpdate:modelValue': (v) => (got = v) }),
  }).mount(root);
  await tick();
  const input = root.querySelector('input');
  if (!input) check('Input 渲染出 <input>', false);
  else {
    input.value = 'hello';
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    await tick();
    check('Input 输入 → update:modelValue', got === 'hello', `got=${JSON.stringify(got)}`);
  }
}
{
  const root = mkRoot();
  let got = null;
  await createApp({
    setup: () => () =>
      h(UI.Select, {
        modelValue: '',
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
        'onUpdate:modelValue': (v) => (got = v),
      }),
  }).mount(root);
  await tick();
  (root.querySelector('.lyt-select__trigger') || root.querySelector('.lyt-select'))?.dispatchEvent(
    new dom.window.MouseEvent('click', { bubbles: true }),
  );
  await tick();
  const optB = Array.from(root.querySelectorAll('[role="option"]')).find((o) =>
    (o.textContent || '').includes('B'),
  );
  optB?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await tick();
  check('Select 选中 → update:modelValue', got === 'b', `got=${JSON.stringify(got)}`);
}
{
  const root = mkRoot();
  await createApp({
    setup: () => () =>
      h(
        UI.Tabs,
        { modelValue: 'a' },
        {
          default: () => [
            h(
              UI.TabPane,
              { label: 'A', name: 'a' },
              { default: () => [h('span', null, 'CONTENT-A')] },
            ),
            h(
              UI.TabPane,
              { label: 'B', name: 'b' },
              { default: () => [h('span', null, 'CONTENT-B')] },
            ),
          ],
        },
      ),
  }).mount(root);
  await tick();
  check(
    'Tabs 显示 TabPane 插槽内容',
    root.innerHTML.includes('CONTENT-A'),
    root.innerHTML.slice(0, 120),
  );
}
{
  const root = mkRoot();
  await createApp({
    setup: () => () =>
      h(
        UI.Form,
        { model: { name: '' }, rules: { name: [{ required: true, message: '名字必填' }] } },
        {
          default: () => [
            h(
              UI.FormItem,
              { label: '名字', prop: 'name' },
              { default: () => [h(UI.Input, { modelValue: '' })] },
            ),
            h('button', { type: 'submit' }, '提交'),
          ],
        },
      ),
  }).mount(root);
  await tick();
  (root.querySelector('form') || root.firstElementChild)?.dispatchEvent(
    new dom.window.Event('submit', { bubbles: true, cancelable: true }),
  );
  await tick(120);
  const err = root.querySelector('.lyt-form-item__error');
  check(
    'Form 校验错误显示到 FormItem',
    !!err && (err.textContent || '').includes('名字必填'),
    err?.textContent ?? 'no .lyt-form-item__error',
  );
}

// ── HTTP ──────────────────────────────────────────────────────
console.log('   [HTTP]');
const router = createRouter();
router.get('/api/ok', (ctx) => {
  ctx.response.status = 200;
  ctx.response.body = { ok: true };
});
const server = createServer({ router });
server.use(createCorsMiddleware({ origin: '*' }));
server.use(createAuthMiddleware({ authenticate: async (t) => (t === 'good' ? { id: 1 } : null) }));
server.use(createRateLimitMiddleware({ max: 2, windowMs: 60000 }));

const fakeReq = (method, reqUrl, headers) => ({
  method,
  url: reqUrl,
  headers,
  socket: { remoteAddress: '127.0.0.1' },
  [Symbol.asyncIterator]: async function* () {},
});
const fakeRes = () => {
  const out = { status: 0, headers: {}, body: '' };
  return {
    out,
    setHeader(k, v) {
      out.headers[String(k).toLowerCase()] = v;
    },
    getHeader(k) {
      return out.headers[String(k).toLowerCase()];
    },
    removeHeader(k) {
      delete out.headers[String(k).toLowerCase()];
    },
    writeHead(code) {
      out.status = code;
      return this;
    },
    write(chunk) {
      out.body += typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
      return true;
    },
    end(chunk) {
      if (chunk !== undefined)
        out.body += typeof chunk === 'string' ? chunk : JSON.stringify(chunk);
      out.status = out.status || 200;
    },
    get statusCode() {
      return out.status || 200;
    },
    set statusCode(v) {
      out.status = v;
    },
  };
};
const call = async (method, reqUrl, headers = {}) => {
  const res = fakeRes();
  await server.dispatch(fakeReq(method, reqUrl, headers), res);
  return res.out;
};

{
  const pre = await call('OPTIONS', '/api/ok', {
    origin: 'http://x.test',
    'access-control-request-method': 'GET',
  });
  check(
    'CORS 预检带 Access-Control-Allow-Origin',
    !!pre.headers['access-control-allow-origin'],
    `status=${pre.status}`,
  );

  const ok = await call('GET', '/api/ok', {
    origin: 'http://x.test',
    authorization: 'Bearer good',
  });
  check('正常响应带 CORS 头', !!ok.headers['access-control-allow-origin'], `status=${ok.status}`);
  check(
    'CORS 开启后 JSON body 未损坏',
    String(ok.body).includes('"ok":true'),
    `body=${String(ok.body).slice(0, 60)}`,
  );

  const noAuth = await call('GET', '/api/ok');
  check('未授权返回 401', noAuth.status === 401, `status=${noAuth.status}`);

  await call('GET', '/api/ok', { authorization: 'Bearer good' });
  await call('GET', '/api/ok', { authorization: 'Bearer good' });
  const limited = await call('GET', '/api/ok', { authorization: 'Bearer good' });
  check('超限返回 429', limited.status === 429, `status=${limited.status}`);
}

// ── 生态 ──────────────────────────────────────────────────────
console.log('   [生态]');
{
  // 契约：register() 只登记；安装走显式 install()（app.use() 内部会自己调）。
  // 此前 **install() 方法根本不存在** ⇒ 独立使用 PluginRegistry 永远无法让插件生效。
  let installs = 0;
  const registry = new pluginPkg.PluginRegistry();
  registry.register({
    name: 'demo',
    install() {
      installs++;
    },
  });
  check('register 不自动安装（保留 app.use 的既有契约）', installs === 0, `installs=${installs}`);
  check('register 后 installed=false', registry.getInstalled().length === 0);
  const installed = await registry.install('demo');
  check(
    '显式 install() 执行插件 install',
    installed === true && installs === 1,
    `installs=${installs}`,
  );
  check(
    'install 后 installed=true',
    registry.getInstalled().length === 1,
    `installed=${registry.getInstalled().length}`,
  );
}
{
  const resp = edgePkg.jsonResponse({ a: 1 });
  check(
    'runtime-edge 返回真正的 Response',
    resp instanceof Response,
    `instanceof=${resp instanceof Response}`,
  );
  if (resp instanceof Response) {
    check('runtime-edge 响应体可读', (await resp.text()) === '{"a":1}');
  }
}

console.log(failed === 0 ? '\n✅ 通过：集成链路全部正常\n' : `\n❌ 失败：${failed} 项\n`);
process.exit(failed === 0 ? 0 : 1);
