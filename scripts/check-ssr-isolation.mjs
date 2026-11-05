#!/usr/bin/env node
/* global document */
/**
 * 门禁：SSR 请求隔离
 *
 * ## 为什么需要这一项
 *
 * SSR 进程是**长期存活、服务所有用户**的。任何「进程级可变状态」都会变成
 * **跨用户数据泄漏**，而且这种泄漏：
 *   · 所有正常测试都通过（单请求场景下完全正确）
 *   · 只在生产的多请求/并发下暴露
 *   · 一旦发生就是安全事故，不是"小 bug"
 *
 * ## 2026-11-03 首次运行抓到的 P0
 *
 * `@lytjs/store` 的三张表（storeCache / subscriptions / actionCallbacks）是**模块级单例**，
 * 只按 store id 作键，**完全忽略 `useStore(pinia)` 传入的 pinia 参数**：
 *
 * ```ts
 * if (storeCache.has(id)) return storeCache.get(id);   // ← 不看 pinia
 * ```
 *
 * 即使每个请求都老老实实 `createPinia()`，拿到的也是**同一个 store 对象**。实测：
 *
 * ```
 * 请求 A（已登录）: user=ALICE token=SECRET-A-TOKEN
 * 请求 B（匿名）  : user=ALICE token=SECRET-A-TOKEN   ← 直接渲染出 A 的令牌
 * ```
 *
 * 修法：注册表按 pinia 隔离（`WeakMap<Pinia, Registry>`），
 * 无 pinia 时落到兜底注册表并**告警一次**。
 *
 * ## 判据
 *
 * | 组 | 判据 |
 * |---|---|
 * | 1 | 两个 pinia 的 store 互不共享（含未写字段不得继承别人的值） |
 * | 2 | 没有 pinia 时落到进程级单例，且**必须告警**（静默的单例在 SSR 上是隐患） |
 * | 3 | 并发异步 SSR：**显式 pinia** 必须隔离（这是唯一与并发无关的用法） |
 * | 4 | 订阅与 `$dispose` 按 pinia 隔离 |
 * | 5 | `pinia.state` 不串 |
 * | 6 | provide/inject 在两个 app 之间隔离 |
 * | 7 | `app.config.globalProperties` 在两个 app 之间隔离 |
 * | 8 | SSR：组件内 provide/inject 跨请求隔离 |
 * | 9 | `runWithPinia` 结束后恢复原来的 activePinia |
 * | 10 | 语义记录：**模块级 ref 会跨请求共享**（这是 JS 语义，不是 store 的锅） |
 *
 * ## 已知限制（刻意记录，不假装已修）
 *
 * `setActivePinia()` 是模块级全局。**并发**异步 SSR 下，请求 A 在 await 期间
 * 会被请求 B 的 `setActivePinia` 覆盖 ⇒ A 之后调 `useStore()`（不传 pinia）会拿到 B 的。
 * 这是设计使然，唯一与并发无关的用法是**显式传 pinia**（第 [3] 组就守这条）。
 * 彻底解决需要「渲染上下文」透传到每个组件实例（与 `app.config` 在 SSR 不生效同一个根因），
 * 属结构性改造，单独立项。
 */

import { JSDOM } from 'jsdom';

// ── 环境 ──────────────────────────────────────────────────
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const w = dom.window;
const g = globalThis;
g.window = w;
g.document = w.document;
g.Node = w.Node;
g.Element = w.Element;
g.HTMLElement = w.HTMLElement;
g.SVGElement = w.SVGElement;
g.Event = w.Event;
g.MouseEvent = w.MouseEvent;
g.CustomEvent = w.CustomEvent;
g.getComputedStyle = w.getComputedStyle.bind(w);
g.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = (id) => clearTimeout(id);

const ROOT = process.cwd();
const core = await import(`${ROOT}/packages/core/dist/index.mjs`);
const ssr = await import(`${ROOT}/packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs`);
const store = await import(`${ROOT}/packages/ecosystem/packages/store/dist/index.mjs`);

const { h, installTemplateCompiler, createApp, ref, provide, inject } = core;
installTemplateCompiler();

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

// ── 断言 ──────────────────────────────────────────────────
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

/** 捕获 console.warn */
const trapWarn = () => {
  const calls = [];
  const orig = console.warn;
  console.warn = (...a) => calls.push(a.map(String).join(' '));
  return {
    calls,
    restore: () => {
      console.warn = orig;
    },
  };
};

const mkRoot = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
};

// ══════════════════════════════════════════════════════════
section('[1] 两个 pinia 的 store 互不共享');
{
  const useUser = store.defineStore('iso-user', { state: () => ({ name: '', token: '' }) });

  const piniaA = store.createPinia();
  const a = useUser(piniaA);
  a.name = 'ALICE';
  a.token = 'SECRET-A';

  const piniaB = store.createPinia();
  const b = useUser(piniaB);

  check('A 与 B 不是同一个 store 对象', a !== b, `same=${a === b}`);
  check('B 的 name 是自己的默认值（不继承 A）', b.name === '', `name=${JSON.stringify(b.name)}`);
  check('B 的 token 为空（不泄漏 A 的令牌）', b.token === '', `token=${JSON.stringify(b.token)}`);
  check('A 的数据保持不变', a.name === 'ALICE' && a.token === 'SECRET-A', `A=${a.name}/${a.token}`);
}

// ══════════════════════════════════════════════════════════
section('[2] 没有 pinia 时落到进程级单例（且必须告警）');
{
  const useAnon = store.defineStore('iso-anon', { state: () => ({ v: 0 }) });
  const trap = trapWarn();
  const first = useAnon();
  first.v = 42;
  const second = useAnon();
  trap.restore();

  check(
    '无 pinia 时两次调用是同一个 store（单例语义）',
    first === second,
    `same=${first === second}`,
  );
  check('无 pinia 时读到的是同一份状态', second.v === 42, `v=${second.v}`);
  check(
    '必须告警一次（静默的进程级单例在 SSR 上是隐患）',
    trap.calls.some((c) => c.includes('iso-anon')),
    `warns=${trap.calls.length}`,
  );
}

// ══════════════════════════════════════════════════════════
section('[3] 并发异步 SSR：显式 pinia 必须隔离');
{
  const useSess = store.defineStore('iso-conc', { state: () => ({ user: 'anonymous' }) });

  // 安全模式：pinia 通过闭包显式传入，不依赖全局 activePinia
  const makePage = (pinia) => ({
    async setup() {
      await new Promise((r) => setTimeout(r, 20)); // 模拟异步取数
      const st = useSess(pinia); // ← 显式传 pinia
      return { st };
    },
    template: `<div class="page">{{ st.user }}</div>`,
  });

  const renderFor = async (user, delay) => {
    const pinia = store.createPinia();
    useSess(pinia).user = user;
    await new Promise((r) => setTimeout(r, delay));
    return ssr.renderToStringAsync(h(makePage(pinia)));
  };

  const [a, b] = await Promise.all([renderFor('ALICE', 0), renderFor('BOB', 10)]);
  check('并发请求 A 渲染出自己的数据', a.includes('ALICE'), a);
  check('并发请求 B 渲染出自己的数据', b.includes('BOB'), b);
  check('A 没有渲染出 B 的数据', !a.includes('BOB'), a);
}

// ══════════════════════════════════════════════════════════
section('[4] 订阅与 $dispose 按 pinia 隔离');
{
  const useSub = store.defineStore('iso-sub', { state: () => ({ n: 0 }) });
  const piniaA = store.createPinia();
  const piniaB = store.createPinia();

  const a = useSub(piniaA);
  const b = useSub(piniaB);

  const callsA = [];
  const callsB = [];
  a.$subscribe((m) => callsA.push(m));
  b.$subscribe((m) => callsB.push(m));

  a.n = 1;
  await tick(20);
  check('A 的订阅收到 A 的变更', callsA.length >= 1, `callsA=${callsA.length}`);
  check('A 的变更不触发 B 的订阅', callsB.length === 0, `callsB=${callsB.length}`);

  // $dispose 只影响自己那份
  a.$dispose();
  const a2 = useSub(piniaA);
  const b2 = useSub(piniaB);
  check('$dispose 后 A 重新创建（新对象）', a2 !== a, `same=${a2 === a}`);
  check('$dispose A 不影响 B（B 仍是原对象）', b2 === b, `same=${b2 === b}`);
}

// ══════════════════════════════════════════════════════════
section('[5] pinia.state 不串');
{
  const useSt = store.defineStore('iso-state', { state: () => ({ k: 'init' }) });
  const piniaA = store.createPinia();
  const piniaB = store.createPinia();

  const a = useSt(piniaA);
  a.k = 'A-value';

  const stateA = piniaA.state.value;
  const stateB = piniaB.state.value;
  check(
    'A 的 pinia.state 里有 iso-state',
    Object.keys(stateA).includes('iso-state'),
    JSON.stringify(Object.keys(stateA)),
  );
  check(
    'B 的 pinia.state 里没有 A 的 store',
    !Object.keys(stateB).includes('iso-state'),
    JSON.stringify(Object.keys(stateB)),
  );
}

// ══════════════════════════════════════════════════════════
section('[6] provide/inject 在两个 app 之间隔离');
{
  const ThemeChild = {
    setup() {
      return { theme: inject('theme', 'none') };
    },
    template: `<span class="theme">{{ theme }}</span>`,
  };

  const mk = (theme) => ({
    components: { ThemeChild },
    setup() {
      provide('theme', theme);
      return {};
    },
    template: `<div><ThemeChild /></div>`,
  });

  const rootA = mkRoot();
  const appA = createApp(mk('dark'));
  await appA.mount(rootA);
  await tick();

  const rootB = mkRoot();
  const appB = createApp(mk('light'));
  await appB.mount(rootB);
  await tick();

  check(
    'app A 的注入是 dark',
    rootA.querySelector('.theme')?.textContent?.trim() === 'dark',
    rootA.innerHTML,
  );
  check(
    'app B 的注入是 light（未被 A 污染）',
    rootB.querySelector('.theme')?.textContent?.trim() === 'light',
    rootB.innerHTML,
  );
  appA.unmount();
  appB.unmount();
}

// ══════════════════════════════════════════════════════════
section('[7] app.config.globalProperties 在两个 app 之间隔离');
{
  const Probe = { template: `<span class="gp">{{ $marker }}</span>` };

  const rootA = mkRoot();
  const appA = createApp({ components: { Probe }, template: `<div><Probe /></div>` });
  appA.config.globalProperties.$marker = 'AAA';
  await appA.mount(rootA);
  await tick();

  const rootB = mkRoot();
  const appB = createApp({ components: { Probe }, template: `<div><Probe /></div>` });
  appB.config.globalProperties.$marker = 'BBB';
  await appB.mount(rootB);
  await tick();

  check(
    'app A 的 globalProperties 生效',
    rootA.querySelector('.gp')?.textContent?.trim() === 'AAA',
    rootA.innerHTML,
  );
  check(
    'app B 的 globalProperties 未被 A 污染',
    rootB.querySelector('.gp')?.textContent?.trim() === 'BBB',
    rootB.innerHTML,
  );
  appA.unmount();
  appB.unmount();
}

// ══════════════════════════════════════════════════════════
section('[8] SSR：组件内 provide/inject 跨请求隔离');
{
  const Child = {
    setup() {
      return { v: inject('req', 'none') };
    },
    template: `<span class="v">{{ v }}</span>`,
  };
  // 用 setup() 里的 provide（选项式 `provide:` 目前两端都未实现，不属本项判据）
  const Page = {
    components: { Child },
    props: { req: { type: String, default: 'none' } },
    setup(props) {
      provide('req', props.req);
      return {};
    },
    template: `<div><Child /></div>`,
  };

  const htmlA = ssr.renderToString(h(Page, { req: 'REQ-A' }));
  const htmlB = ssr.renderToString(h(Page, { req: 'REQ-B' }));

  check('SSR 请求 A 注入到自己的值', htmlA.includes('REQ-A'), htmlA);
  check('SSR 请求 B 注入到自己的值', htmlB.includes('REQ-B'), htmlB);
  check('请求 A 不含 B 的值', !htmlA.includes('REQ-B'), htmlA);
}

// ══════════════════════════════════════════════════════════
section('[9] runWithPinia 结束后恢复原 activePinia');
{
  const useRw = store.defineStore('iso-rw', { state: () => ({ tag: '' }) });
  const outer = store.createPinia();
  const inner = store.createPinia();

  store.setActivePinia(outer);
  useRw(outer).tag = 'OUTER';

  const insideTag = store.runWithPinia(inner, () => useRw().tag);
  check(
    '作用域内解析到 inner（未写入 ⇒ 默认空）',
    insideTag === '',
    `tag=${JSON.stringify(insideTag)}`,
  );
  check(
    '作用域结束后 activePinia 恢复为 outer',
    store.getActivePinia() === outer,
    'activePinia 未恢复',
  );
  check('恢复后 useRw() 仍指向 outer 的那份', useRw().tag === 'OUTER', useRw().tag);
}

// ══════════════════════════════════════════════════════════
section('[10] 语义记录：模块级 ref 会跨请求共享（不是 store 的锅）');
{
  const moduleRef = ref(0);
  const Page = {
    setup() {
      return { v: moduleRef };
    },
    template: `<span class="m">{{ v }}</span>`,
  };

  moduleRef.value = 1;
  const htmlA = ssr.renderToString(h(Page));
  moduleRef.value = 2;
  const htmlB = ssr.renderToString(h(Page));

  check(
    '模块级 ref 确实跨请求共享（这是 JS 语义；SSR 下请把状态放进 pinia 或 props）',
    htmlA.includes('1') && htmlB.includes('2'),
    `A=${htmlA} B=${htmlB}`,
  );
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
