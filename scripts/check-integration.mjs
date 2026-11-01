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
import { writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';

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
const {
  createApp,
  h,
  ref: C_ref,
  installTemplateCompiler: installCompiler,
} = await import(url('../packages/core/dist/index.mjs'));
const {
  KeepAlive: KEEPALIVE,
  Teleport: TELEPORT,
  defineAsyncComponent: ASYNC,
  Suspense: SUSPENSE,
} = await import(url('../packages/core/dist/index.mjs'));
const { defineComponent: defineComponentForSsr } = await import(
  url('../packages/component/dist/index.mjs')
);
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
const ssrPkg = await import(
  url('../packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs')
);
const sfcPkg = await import(url('../packages/compiler/dist/sfc.mjs'));
const storePkg = await import(url('../packages/ecosystem/packages/store/dist/index.mjs'));
const devtoolsPkg = await import(url('../packages/ecosystem/packages/devtools/dist/index.mjs'));

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

// ── SSR（必须最先跑：此时还没有任何 createApp 调用 ⇒ 编译器未注入）────
console.log('   [SSR]');
{
  const { defineComponent: defineRaw } = await import(url('../packages/component/dist/index.mjs'));
  const TplNoCompiler = defineRaw({ name: 'TplNoCompiler', template: '<div>hi</div>' });
  let threw = null;
  try {
    ssrPkg.renderToString(h(TplNoCompiler));
  } catch (e) {
    threw = e.message;
  }
  check(
    '无编译器时 template 组件抛错（不再是 200 空页）',
    !!threw && threw.includes('没有注入模板编译器'),
    threw ? threw.split('\n')[0] : '未抛错（输出空串）',
  );
}
{
  // 真实用法：服务端入口会创建 app，这一步注入编译器
  createApp({ render: () => null });
  const Tpl = defineComponentForSsr({
    template: '<div class="x">{{ msg }}</div>',
    data: () => ({ msg: 'hi' }),
  });
  let out = '';
  let err = null;
  try {
    out = ssrPkg.renderToString(h(Tpl));
  } catch (e) {
    err = e.message;
  }
  check('有编译器时 template 组件正常 SSR', !err && out.includes('hi'), err || out);
}
{
  const AsyncComp = defineComponentForSsr({
    name: 'AsyncComp',
    async setup() {
      await new Promise((r) => setTimeout(r, 5));
      return () => h('div', null, 'x');
    },
  });
  let threw = null;
  try {
    ssrPkg.renderToString(h(AsyncComp));
  } catch (e) {
    threw = e.message;
  }
  check(
    'async setup 抛错而非空串',
    !!threw && threw.includes('async setup'),
    threw ? threw.split('\n')[0] : '未抛错',
  );
}

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

// ── 安全 / 属性透传 ─────────────────────────────────────────
console.log('   [安全]');
{
  // 状态序列化必须能安全内联进 <script>
  const evil = { html: '</script><img src=x onerror=alert(1)>' };
  const out = ssrPkg.safeSerializeState(evil);
  check('safeSerializeState 转义 </script>', !out.includes('</script'), out.slice(0, 100));
  let back = null;
  try {
    back = ssrPkg.safeDeserializeState(out);
  } catch (e) {
    back = 'ERR:' + e.message;
  }
  check('转义后仍能无损还原', back && back.html === evil.html, JSON.stringify(back).slice(0, 80));
  check(
    '反序列化不污染 Object.prototype',
    (() => {
      try {
        ssrPkg.safeDeserializeState('{"__proto__":{"polluted":1}}');
      } catch {
        /* ignore */
      }
      return {}.polluted === undefined;
    })(),
  );
}

// ── DevTools ────────────────────────────────────────────────
console.log('   [DevTools]');
{
  // safeStringify 必须转出（包只暴露 `.` 入口，不转出等于没有）
  check(
    '导出 safeStringify',
    typeof devtoolsPkg.safeStringify === 'function',
    typeof devtoolsPkg.safeStringify,
  );
  const circular = { a: 1 };
  circular.self = circular;
  let out = '';
  try {
    out = devtoolsPkg.safeStringify(circular);
  } catch (e) {
    out = 'ERR:' + e.message;
  }
  check('safeStringify 处理循环引用', out.includes('[Circular]'), out.slice(0, 80));
}
{
  let api = null;
  let err = null;
  try {
    api = devtoolsPkg.installDevTools({ enabled: true });
  } catch (e) {
    err = e.message;
  }
  check('installDevTools 可调用', !err && !!api, err || typeof api);
}
{
  let ev = null;
  let err = null;
  try {
    const id = devtoolsPkg.beginTimelineEvent('probe', { a: 1 });
    ev = devtoolsPkg.endTimelineEvent(id);
  } catch (e) {
    err = e.message;
  }
  check(
    '时间线事件可开始/结束且带 duration',
    !err && ev && typeof ev.duration === 'number',
    err || JSON.stringify(ev).slice(0, 80),
  );
}
{
  // 组件树：必须先 registerRootComponent（文档约定）
  let tree = [];
  try {
    devtoolsPkg.registerRootComponent({
      name: 'App',
      props: {},
      children: [{ name: 'Child', props: {}, children: [] }],
    });
    tree = devtoolsPkg.getComponentTree();
    devtoolsPkg.unregisterRootComponent?.();
  } catch {
    tree = [];
  }
  check(
    '组件树（注册根组件后）',
    tree.length === 1 && tree[0].name === 'App',
    JSON.stringify(tree).slice(0, 120),
  );
}

// ── 水合标记 ────────────────────────────────────────────────
console.log('   [水合标记]');
{
  const el = ssrPkg.renderToString(ssrPkg.createHydrationMarkers(h('div', { class: 'x' }, 'hi')));
  check('元素树打标记', /data-hydrate="/.test(el), el);
}
{
  // 组件树（最常见用法）：标记要落到组件根元素上
  const App = { template: '<div class="x">hi</div>' };
  const html = ssrPkg.renderToString(ssrPkg.createHydrationMarkers(h(App)));
  check('组件树打标记（落到根元素）', /data-hydrate="/.test(html), html);
}
{
  const App = { template: '<div class="x">hi</div>' };
  const html = ssrPkg.renderToString(
    ssrPkg.createHydrationMarkers(h(App, { hydrateStrategy: 'idle' })),
  );
  check('策略写入 data-hydrate-strategy', /data-hydrate-strategy="idle"/.test(html), html);
  check('控制属性不泄漏成 DOM 属性', !/hydrateStrategy="/.test(html), html);
}
{
  const A = { template: '<div>a</div>' };
  const html = ssrPkg.renderToString(ssrPkg.createHydrationMarkers(h('div', null, [h(A), h(A)])));
  const ids = [...html.matchAll(/data-hydrate="([^"]+)"/g)].map((m) => m[1]);
  check(
    '多个组件 id 唯一',
    ids.length >= 2 && new Set(ids).size === ids.length,
    JSON.stringify(ids),
  );
}

// ── 组件属性透传（SSR 与客户端必须一致）────────────────────
console.log('   [透传]');
{
  const Inner = { props: { title: String }, template: '<div class="inner">{{ title }}</div>' };
  const tpl = '<Inner title="T" class="extra" data-x="1" />';
  const App = { components: { Inner }, template: tpl };

  const ssrHtml = ssrPkg.renderToString(h(App));
  check('SSR 透传 class 且与自身合并', ssrHtml.includes('inner extra'), ssrHtml);

  const root = mkRoot();
  await createApp(App).mount(root);
  await tick();
  const cliHtml = root.innerHTML;
  check(
    '客户端透传 class 不覆盖自身',
    cliHtml.includes('inner') && cliHtml.includes('extra'),
    cliHtml,
  );
  check('客户端透传其余属性', cliHtml.includes('data-x'), cliHtml);

  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  check(
    'SSR 与客户端 class 一致',
    norm(ssrHtml).includes('class="inner extra"') && norm(cliHtml).includes('class="inner extra"'),
    `ssr=${ssrHtml} cli=${cliHtml}`,
  );
}

// ── 静态站点生成（SSG）──────────────────────────────────────
console.log('   [SSG]');
{
  const Page = (t) => ({ template: `<div class="page">${t}</div>` });
  let out = null;
  let err = null;
  try {
    out = ssrPkg.generateStaticPages(
      [
        { path: '/', component: h(Page('HOME')), head: { title: '首页' } },
        { path: '/about', component: h(Page('ABOUT')) },
      ],
      { baseUrl: 'https://example.com' },
    );
  } catch (e) {
    err = e.message;
  }
  check('generateStaticPages 可运行', !err && out && out.size === 2, err || `size=${out?.size}`);
  const keys = out ? [...out.keys()] : [];
  check(
    '路径映射为 <path>/index.html',
    keys.includes('/index.html') && keys.includes('/about/index.html'),
    keys.join(','),
  );
  const home = out ? String(out.get('/index.html')) : '';
  check('产出是完整 HTML 文档', /<html/i.test(home) && home.includes('HOME'), home.slice(0, 80));
  check('页面 title 生效', home.includes('首页'), home.slice(0, 160));
}
{
  // layout 必须真的包住页面
  const Page = { template: '<div class="inner">INNER</div>' };
  const layout = { template: '<main><slot /></main>' };
  const out = ssrPkg.generateStaticPages(
    [{ path: '/', component: h(Page), layout: h(layout) }],
    {},
  );
  const html = String([...out.values()][0]);
  check('SSG layout 生效', html.includes('<main') && html.includes('INNER'), html.slice(-160));
}
{
  // 重复路径必须被 validatePages 检出（否则后者静默覆盖前者）
  const Page = (t) => ({ template: `<div>${t}</div>` });
  const dup = ssrPkg.validatePages([
    { path: '/', component: h(Page('A')) },
    { path: '/', component: h(Page('B')) },
  ]);
  const slash = ssrPkg.validatePages([
    { path: '/about', component: h(Page('A')) },
    { path: '/about/', component: h(Page('B')) },
  ]);
  const ok = ssrPkg.validatePages([
    { path: '/', component: h(Page('A')) },
    { path: '/b', component: h(Page('B')) },
  ]);
  check('validatePages 检出重复路径', dup.length > 0, JSON.stringify(dup));
  check('validatePages 归一化尾斜杠', slash.length > 0, JSON.stringify(slash));
  check('validatePages 不误报', ok.length === 0, JSON.stringify(ok));
}

// ── 异步 SSR ────────────────────────────────────────────────
console.log('   [异步SSR]');
{
  const Async = {
    name: 'AsyncPage',
    async setup() {
      await tick(20);
      return () => h('b', { class: 'as' }, 'READY');
    },
  };
  let out = '';
  let err = null;
  try {
    out = await ssrPkg.renderToStringAsync(h(Async));
  } catch (e) {
    err = e.message;
  }
  check('renderToStringAsync 真正等待 async setup', !err && out.includes('READY'), err || out);

  let syncErr = null;
  try {
    ssrPkg.renderToString(h(Async));
  } catch (e) {
    syncErr = e.message;
  }
  check(
    '同步 renderToString 仍明确抛错（语义不混用）',
    !!syncErr && /async setup/.test(syncErr),
    (syncErr || '').slice(0, 60),
  );
}
{
  // 嵌套异步组件
  const Inner = {
    async setup() {
      await tick(10);
      return () => h('i', null, 'IN');
    },
  };
  const Outer = {
    components: { Inner },
    async setup() {
      await tick(10);
      return () => h('div', null, [h(Inner)]);
    },
  };
  let out = '';
  let err = null;
  try {
    out = await ssrPkg.renderToStringAsync(h(Outer));
  } catch (e) {
    err = e.message;
  }
  check('嵌套异步组件逐层等待', !err && out.includes('IN'), err || out);
}
{
  // 异步路径的 attrs 透传（与同步路径同规则）
  const Async2 = {
    name: 'A2',
    props: { t: String },
    async setup() {
      return () => h('span', { class: 'inner' }, 'X');
    },
  };
  const out = await ssrPkg.renderToStringAsync(h(Async2, { class: 'extra', 'data-x': '1' }));
  check(
    '异步路径 attrs 透传',
    out.includes('inner') && out.includes('extra') && out.includes('data-x'),
    out,
  );
}

// ── 流式渲染 / 虚拟列表 ──────────────────────────────────────
console.log('   [Stream]');
{
  const readAll = async (stream) => {
    const reader = stream.getReader();
    const dec = new TextDecoder();
    let out = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      out += dec.decode(value, { stream: true });
    }
    return out;
  };
  const App = { template: '<div class="wrap"><h1>T</h1><p>B</p></div>' };
  const sync = ssrPkg.renderToString(h(App));
  let streamed = '';
  let err = null;
  try {
    streamed = await readAll(ssrPkg.renderToStream(h(App)));
  } catch (e) {
    err = e.message;
  }
  check('renderToStream 输出非空', !err && streamed.length > 0, err || streamed.slice(0, 80));
  check(
    '流式与同步输出一致',
    streamed.replace(/\s+/g, '') === sync.replace(/\s+/g, ''),
    `sync=${sync} stream=${streamed}`,
  );
  let enhanced = '';
  try {
    const r = await ssrPkg.renderToStreamEnhanced(h(App));
    enhanced = await readAll(r.stream);
  } catch (e) {
    enhanced = 'ERR:' + e.message;
  }
  check('renderToStreamEnhanced 输出非空', enhanced.includes('T'), enhanced.slice(0, 80));
}
{
  // VirtualList：1000 条只渲染窗口内的
  const root = mkRoot();
  const data = Array.from({ length: 1000 }, (_, i) => ({ id: i, label: 'item-' + i }));
  const app = createApp({
    components: { VirtualList: ssrPkg.VirtualList },
    setup: () => ({ data }),
    template:
      '<VirtualList :data="data" :itemHeight="50" :height="400"><template #default="{ item }"><div class="row">{{ item.label }}</div></template></VirtualList>',
  });
  await app.mount(root);
  await tick(120);
  const rows = root.querySelectorAll('.row').length;
  check('VirtualList 只渲染窗口内条目', rows > 0 && rows < 100, `rows=${rows}`);
}

// ── SSR + hydrate ────────────────────────────────────────────
console.log('   [Hydrate]');
{
  // 服务端只渲染、从不创建 app 的进程：必须能显式注入编译器
  check(
    'core 导出 installTemplateCompiler',
    typeof installCompiler === 'function',
    typeof installCompiler,
  );
}
{
  const App = {
    setup() {
      const n = C_ref(0);
      return () =>
        h('div', [
          h('span', { class: 'n' }, String(n.value)),
          h('button', { class: 'b', onClick: () => n.value++ }, '+'),
        ]);
    },
  };
  const html = ssrPkg.renderToString(h(App));
  const root = mkRoot();
  root.innerHTML = html;
  const beforeNode = root.querySelector('.n');
  await createApp(App).mount(root, { hydrate: true });
  await tick();
  check(
    'hydrate 后 DOM 未复制',
    root.querySelectorAll('.n').length === 1,
    String(root.querySelectorAll('.n').length),
  );
  check('hydrate 复用同一节点', root.querySelector('.n') === beforeNode, 'reuse');
  root.querySelector('.b')?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await tick();
  check('hydrate 后事件可用并更新', root.querySelector('.n')?.textContent === '1', root.innerHTML);
}
{
  // 列表不重复
  const App = {
    setup: () => ({ list: C_ref(['a', 'b', 'c']) }),
    template: '<ul><li v-for="i in list" :key="i">{{ i }}</li></ul>',
  };
  const html = ssrPkg.renderToString(h(App));
  const root = mkRoot();
  root.innerHTML = html;
  await createApp(App).mount(root, { hydrate: true });
  await tick();
  const lis = [...root.querySelectorAll('li')].map((e) => e.textContent);
  check('hydrate 列表不重复', lis.join(',') === 'a,b,c', lis.join(','));
}

// ── 状态管理（store）─────────────────────────────────────────
console.log('   [Store]');
{
  const root = mkRoot();
  const pinia = storePkg.createPinia();
  const useCounter = storePkg.defineStore('counter', {
    state: () => ({ n: 0 }),
    getters: { double: (st) => st.n * 2 },
    actions: {
      inc() {
        this.n++;
      },
    },
  });
  let store;
  const app = createApp({
    setup() {
      store = useCounter();
      return () =>
        h('div', [
          h('span', { class: 'n' }, String(store.n)),
          h('span', { class: 'd' }, String(store.double)),
        ]);
    },
  });
  app.use(pinia);
  await app.mount(root);
  await tick();
  check('store 初始 state/getter', root.querySelector('.n')?.textContent === '0', root.innerHTML);
  store.inc();
  await tick();
  check(
    'store action 触发响应式更新',
    root.querySelector('.n')?.textContent === '1' && root.querySelector('.d')?.textContent === '2',
    root.innerHTML,
  );
}
{
  const root = mkRoot();
  const pinia = storePkg.createPinia();
  const useS = storePkg.defineStore('shared', {
    state: () => ({ n: 0 }),
    actions: {
      inc() {
        this.n++;
      },
    },
  });
  let st;
  const A = {
    setup: () => {
      const s = useS();
      return () => h('b', { class: 'a' }, String(s.n));
    },
  };
  const B = {
    setup: () => {
      const s = useS();
      return () => h('i', { class: 'b' }, String(s.n));
    },
  };
  const app = createApp({
    setup: () => {
      st = useS();
      return () => h('div', [h(A), h(B)]);
    },
  });
  app.use(pinia);
  await app.mount(root);
  await tick();
  st.inc();
  await tick();
  check(
    '两个组件共享同一 store',
    root.querySelector('.a')?.textContent === '1' && root.querySelector('.b')?.textContent === '1',
    root.innerHTML,
  );
}

// ── 异步 setup + Suspense ─────────────────────────────────────
console.log('   [Suspense]');
{
  // 不套 Suspense：async setup 兑现后也要能渲染出来
  const root = mkRoot();
  const Async = {
    name: 'AsyncPlain',
    async setup() {
      await tick(40);
      return () => h('b', { class: 'a1' }, 'READY1');
    },
  };
  await createApp({ components: { Async }, template: '<Async />' }).mount(root);
  await tick(200);
  check('async setup（无 Suspense）兑现后渲染', root.innerHTML.includes('READY1'), root.innerHTML);
}
{
  // 套 Suspense + fallback：先 fallback，兑现后切回 default
  const root = mkRoot();
  const Async = {
    name: 'AsyncSus',
    async setup() {
      await tick(40);
      return () => h('b', { class: 'a2' }, 'READY2');
    },
  };
  const app = createApp({
    components: { Suspense: SUSPENSE, Async },
    template: '<Suspense><Async /><template #fallback>LOADING</template></Suspense>',
  });
  await app.mount(root);
  const sawFallback = root.innerHTML.includes('LOADING');
  await tick(220);
  check('Suspense 先显示 fallback', sawFallback, 'fallback 未出现');
  check('Suspense 兑现后切回内容', root.innerHTML.includes('READY2'), root.innerHTML);
}

// ── 进阶特性（回归：动态组件 / KeepAlive / Teleport / 异步组件）──────
console.log('   [进阶]');
{
  // 动态组件用**小写字符串**（很常见的 tab 切换写法）
  const root = mkRoot();
  const TabA = { template: '<span class="ta">TABA</span>' };
  const app = createApp({
    components: { TabA },
    setup: () => ({ which: C_ref('tab-a') }),
    template: '<component :is="which" />',
  });
  await app.mount(root);
  await tick();
  check(
    '动态组件字符串名（tab-a → TabA）',
    root.innerHTML.includes('TABA'),
    root.innerHTML.slice(0, 80),
  );
}
{
  // KeepAlive：切走再切回，状态保留且不重复挂载
  const root = mkRoot();
  let mounts = 0;
  const A = {
    setup() {
      mounts++;
      const n = C_ref(0);
      return () => h('span', { onClick: () => n.value++ }, 'A' + n.value);
    },
  };
  const B = { setup: () => () => h('span', null, 'B') };
  const which = C_ref('A');
  const app = createApp({
    components: { KeepAlive: KEEPALIVE, A, B },
    setup: () => ({ which }),
    template: '<KeepAlive><component :is="which" /></KeepAlive>',
  });
  await app.mount(root);
  await tick();
  which.value = 'B';
  await tick();
  which.value = 'A';
  await tick();
  check(
    'KeepAlive 切回后状态保留',
    root.textContent === 'A0' && mounts === 1,
    `${root.textContent} mounts=${mounts}`,
  );
}
{
  // Teleport 到 body
  const root = mkRoot();
  const app = createApp({
    components: { Teleport: TELEPORT },
    template: '<div><Teleport to="body"><span class="tp">TEL</span></Teleport></div>',
  });
  await app.mount(root);
  await tick();
  check(
    'Teleport 渲染到 body',
    !!document.body.querySelector('.tp') && !root.querySelector('.tp'),
    document.body.querySelector('.tp') ? 'ok' : 'missing',
  );
}
{
  // 异步组件
  const root = mkRoot();
  const AsyncComp = ASYNC(() => Promise.resolve({ template: '<b class="ac">ASYNC</b>' }));
  await createApp({ components: { AsyncComp }, template: '<AsyncComp />' }).mount(root);
  await tick(180);
  check('异步组件渲染', root.innerHTML.includes('ASYNC'), root.innerHTML.slice(0, 80));
}

// ── 模板常见写法（回归：都曾静默错）───────────────────────────
console.log('   [模板]');
{
  // 内联事件：渲染期不得求值，点击才生效
  const root = mkRoot();
  const n = C_ref(0);
  const app = createApp({
    setup: () => ({ n }),
    template: '<button class="b" @click="n++">+</button>',
  });
  await app.mount(root);
  await tick();
  const beforeClick = n.value;
  root.querySelector('.b')?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await tick();
  check(
    '内联事件 n++ 只在点击时生效',
    beforeClick === 0 && n.value === 1,
    `${beforeClick}->${n.value}`,
  );
}
{
  // $event 表达式
  const root = mkRoot();
  const got = [];
  const app = createApp({
    setup: () => ({ got: (v) => got.push(v) }),
    template: '<input class="i" @input="got($event.target.value)">',
  });
  await app.mount(root);
  await tick();
  const input = root.querySelector('.i');
  input.value = 'EV';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await tick();
  check('$event 表达式可用', got[0] === 'EV', JSON.stringify(got));
}
{
  // 组件标签上的静态属性必须是 prop
  const root = mkRoot();
  const Inner = { props: { text: String }, template: '<i>{{ text }}</i>' };
  await createApp({ components: { Inner }, template: '<Inner text="S" />' }).mount(root);
  await tick();
  check('组件标签上的 text 作为 prop 传入', root.innerHTML.includes('S'), root.innerHTML);
}
{
  // 具名插槽（文本内容）
  const root = mkRoot();
  const Card = {
    template: '<div><header><slot name="head" /></header><main><slot /></main></div>',
  };
  await createApp({
    components: { Card },
    template: '<Card><template #head>H</template>BODY</Card>',
  }).mount(root);
  await tick();
  check(
    '具名插槽的纯文本内容能渲染',
    root.innerHTML.includes('H') && root.innerHTML.includes('BODY'),
    root.innerHTML,
  );
}
{
  // 组件 v-model
  const root = mkRoot();
  const MyInput = {
    props: { modelValue: { type: String, default: '' } },
    emits: ['update:modelValue'],
    template:
      '<input class="mi" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  };
  const val = C_ref('a');
  await createApp({
    setup: () => ({ val }),
    components: { MyInput },
    template: '<MyInput v-model="val" />',
  }).mount(root);
  await tick();
  const input = root.querySelector('.mi');
  input.value = 'abc';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await tick();
  check('组件 v-model 双向绑定', val.value === 'abc', `val=${val.value}`);
}

// ── SFC <script setup> ───────────────────────────────────────
console.log('   [SFC]');
{
  // 编译 → 落盘 → 真 import → 真挂载。只断言产物字符串是不够的：
  // 这条链路历史上就坏在「产物看起来对、运行时 _ctx 全是 undefined」。
  const dir = joinPath(tmpdir(), 'lytjs-sfc-check');
  mkdirSync(dir, { recursive: true });
  const CORE_URL = url('../packages/core/dist/index.mjs');

  const build = (source, name) => {
    const d = sfcPkg.parseSFC(source, { filename: `${name}.vue` });
    const code = sfcPkg
      .compileSFC(d, { filename: `${name}.vue` })
      .code.replace(/from '@lytjs\/core'/g, `from '${CORE_URL}'`);
    const file = joinPath(dir, `${name}.mjs`);
    writeFileSync(file, code, 'utf-8');
    return import(`file://${file}`);
  };

  const Basic = (
    await build(
      `<template><div class="box">{{ msg }} / {{ count }}</div></template>
<script setup>
import { ref } from '@lytjs/core'
const msg = 'hello'
const count = ref(1)
</script>`,
      'Basic',
    )
  ).default;
  {
    const root = mkRoot();
    await createApp(Basic).mount(root);
    await tick();
    check(
      '<script setup> 的绑定能在模板里渲染',
      root.innerHTML.includes('hello / 1'),
      root.innerHTML.slice(0, 120),
    );
  }

  const WithProps = (
    await build(
      `<template><p>{{ title }}-{{ props.title }}</p></template>
<script setup>
const props = defineProps({ title: String })
</script>`,
      'WithProps',
    )
  ).default;
  {
    const root = mkRoot();
    await createApp(WithProps, { title: 'T' }).mount(root);
    await tick();
    check(
      '<script setup> + defineProps 生效',
      root.innerHTML.includes('T-T'),
      root.innerHTML.slice(0, 120),
    );
  }

  const WithEmits = (
    await build(
      `<template><button class="b" @click="emit('go', 7)">x</button></template>
<script setup>
const emit = defineEmits(['go'])
</script>`,
      'WithEmits',
    )
  ).default;
  {
    const root = mkRoot();
    const got = [];
    await createApp({
      components: { WithEmits },
      template: '<WithEmits @go="onGo" />',
      setup: () => ({ onGo: (v) => got.push(v) }),
    }).mount(root);
    await tick();
    root.querySelector('.b')?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await tick();
    check('<script setup> + defineEmits 生效', got[0] === 7, JSON.stringify(got));
  }
}

// ── 自定义指令 ────────────────────────────────────────────────
console.log('   [指令]');
{
  const root = mkRoot();
  const calls = [];
  const app = createApp({ template: '<div class="box" v-focus></div>' });
  app.directive('focus', {
    mounted(el, b) {
      calls.push(['mounted', el.className, b.value, b.arg, b.modifiers]);
    },
  });
  await app.mount(root);
  await tick();
  check(
    '指令 mounted 被调用且拿到真实元素',
    calls.length === 1 && calls[0][1] === 'box',
    JSON.stringify(calls),
  );
}
{
  const root = mkRoot();
  const calls = [];
  const app = createApp({
    template: '<div v-demo:arg.foo="msg"></div>',
    data: () => ({ msg: 'V' }),
  });
  app.directive('demo', { mounted: (el, b) => calls.push([b.value, b.arg, b.modifiers]) });
  await app.mount(root);
  await tick();
  check(
    '指令 binding 的 value / arg / modifiers 正确',
    calls[0]?.[0] === 'V' && calls[0]?.[1] === 'arg' && calls[0]?.[2]?.foo === true,
    JSON.stringify(calls[0]),
  );
}
{
  const root = mkRoot();
  const calls = [];
  const n = C_ref(1);
  const app = createApp({ setup: () => ({ n }), template: '<div v-demo="n">{{ n }}</div>' });
  app.directive('demo', { updated: (el, b) => calls.push([b.value, b.oldValue]) });
  await app.mount(root);
  await tick();
  n.value = 2;
  await tick(120);
  check(
    '指令 updated 带 oldValue',
    calls.length >= 1 && calls[calls.length - 1][0] === 2 && calls[calls.length - 1][1] === 1,
    JSON.stringify(calls),
  );
}
{
  const root = mkRoot();
  const calls = [];
  const on = C_ref(true);
  const app = createApp({
    setup: () => ({ on }),
    template: '<div><p v-if="on" v-demo>x</p></div>',
  });
  app.directive('demo', { unmounted: () => calls.push('unmounted') });
  await app.mount(root);
  await tick();
  on.value = false;
  await tick(160);
  check('指令 unmounted 被调用', calls.includes('unmounted'), JSON.stringify(calls));
}
{
  const root = mkRoot();
  const calls = [];
  const Child = { name: 'Child', template: '<span>c</span>' };
  const app = createApp({ template: '<Child v-demo />', components: { Child } });
  app.directive('demo', { mounted: () => calls.push('mounted') });
  await app.mount(root);
  await tick();
  check('组件标签上的指令（转移到根元素）', calls.length === 1, JSON.stringify(calls));
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
