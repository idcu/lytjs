#!/usr/bin/env node
/**
 * 门禁：生命周期资源释放（卸载之后，框架有没有把东西清理干净？）
 *
 * ## 为什么需要这一项
 *
 * 本仓此前**完全没有"资源释放"这个维度**的判据。它有个特点：
 * **卸载类缺陷不会让任何行为断言变红** —— DOM 会正确移除、`onUnmounted` 会正确触发，
 * 页面看起来一切正常；坏掉的是**看不见的那一半**（effect / watch / 渲染 effect 还活着）。
 *
 * 实测（2026-11-03，修复前）：
 *   · `app.unmount()` 后 `onUnmounted` 正常触发（4/4）、DOM 也清空，
 *     但 `watch` 回调**照样继续跑**；
 *   · 20 轮挂载/卸载后改一次共享状态 ⇒ **20 个已卸载组件的回调全被调用**；
 *   · 渲染 effect 也没停：状态变化仍会对已卸载组件执行 `update()`。
 *
 * 根因：组件实例**从来没有 effect scope**。`runSetup` 只是
 * `setCurrentInstance(instance); setup(...)`，setup 里 `watch()` 创建的 effect
 * 落在"当前活跃 scope"（顶层调用时根本没有）⇒ 无人持有、无人停止。
 *
 * ## 判据设计（全部是**计数**，不做计时）
 *
 * 耗时随负载波动 ⇒ 门禁必 flaky。计数是确定性的：
 *   · `addEventListener` / `removeEventListener` 净差（**只数仍连接在文档上的元素**）
 *   · 卸载后改状态 ⇒ watch / watchEffect / render 的执行次数必须**不增加**
 *   · N 轮挂载/卸载后改状态 ⇒ 回调次数不增加（泄漏会正好 +N）
 *   · 遗留定时器数
 *
 * ## 两个必须避开的假阳性（都踩过）
 *
 * 1. **被移除元素上的监听器不是泄漏**：元素脱离文档且无人引用时会被 GC，
 *    监听器随之消失（Vue 同样如此）。所以只数 `nodeType === 1 && isConnected`。
 * 2. **jsdom 会往 window 上挂自己的内部监听器**：派发一次交互事件后多出 9 个
 *    （`evt => { this.#event = evt }`、`KEYS_MODIFIER` 之类）。
 *    把它们算进"框架泄漏"会得到稳定的假阳性 ⇒ window 目标单独统计并排除这些。
 *
 * ## 自证（守卫必须能失败）
 *
 * 把 `packages/component/src/{types,component-setup,lifecycle}.ts` 与
 * `packages/vdom/src/patch-component.ts` 的修复 stash 掉、重建后重跑：
 * **4 条断言失败**，其中一条直接打印 `before=0 after=20`（20 轮 = 20 个泄漏的 watcher）。
 */

import { JSDOM } from 'jsdom';
import { gzipSync } from 'node:zlib';

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

// ── 监听器登记表 ──────────────────────────────────────────
const live = new Map();
let counting = false;
const fid = (fn) => fn.__fid ?? (fn.__fid = Math.random().toString(36).slice(2));
const lid = (t) => t.__lid ?? (t.__lid = Math.random().toString(36).slice(2));
const keyOf = (t, type, fn) => `${lid(t)}|${type}|${fid(fn)}`;

const proto = w.EventTarget.prototype;
const realAdd = proto.addEventListener;
const realRemove = proto.removeEventListener;
proto.addEventListener = function (type, fn, opts) {
  if (counting && fn) live.set(keyOf(this, type, fn), { target: this, type, fn });
  return realAdd.call(this, type, fn, opts);
};
proto.removeEventListener = function (type, fn, opts) {
  if (counting && fn) live.delete(keyOf(this, type, fn));
  return realRemove.call(this, type, fn, opts);
};

/** 只数**元素**上、且仍连接在文档上的监听器（见文件头「假阳性 1」） */
const elementCount = () => {
  let n = 0;
  for (const e of live.values()) {
    if (e.target?.nodeType === 1 && e.target.isConnected) n++;
  }
  return n;
};
/** window 上的监听器，排除 jsdom 内部那些（见文件头「假阳性 2」） */
const windowCount = () => {
  let n = 0;
  for (const e of live.values()) {
    if (e.target === w && !/this\.#|KEYS_MODIFIER/.test(String(e.fn))) n++;
  }
  return n;
};

// ── 定时器登记表 ──────────────────────────────────────────
const liveTimers = new Set();
const realSetTimeout = globalThis.setTimeout;
const realClearTimeout = globalThis.clearTimeout;
let timerCounting = false;
g.setTimeout = (fn, ms, ...rest) => {
  const id = realSetTimeout(
    (...a) => {
      liveTimers.delete(id);
      if (typeof fn === 'function') fn(...a);
    },
    ms,
    ...rest,
  );
  if (timerCounting) liveTimers.add(id);
  return id;
};
g.clearTimeout = (id) => {
  liveTimers.delete(id);
  return realClearTimeout(id);
};

const reset = () => {
  live.clear();
  liveTimers.clear();
  counting = true;
  timerCounting = true;
};

// ── 断言框架 ──────────────────────────────────────────────
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

const ROOT = process.cwd();
const core = await import(`${ROOT}/packages/core/dist/index.mjs`);
const { createApp, ref, watch, watchEffect, onMounted, onUnmounted, h } = core;
const tick = (ms = 60) => new Promise((r) => realSetTimeout(r, ms));
const mkRoot = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
};
const click = (el) => el?.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));

// ══════════════════════════════════════════════════════════
section('[1] 卸载后仍连接的监听器');
{
  reset();
  const n = ref(0);
  const root = mkRoot();
  const app = createApp({
    setup: () => ({ n, inc: () => n.value++ }),
    template: `<div><button class="b" @click="inc">{{n}}</button></div>`,
  });
  await app.mount(root);
  await tick();
  const afterMount = elementCount();
  app.unmount();
  await tick();
  const afterUnmount = elementCount();

  check('挂载后有监听器（阳性对照）', afterMount > 0, `connected=${afterMount}`);
  check('卸载后**连接中**的监听器归零', afterUnmount === 0, `connected=${afterUnmount}`);
  check('root 已清空', root.innerHTML === '', JSON.stringify(root.innerHTML));
  counting = false;
  timerCounting = false;
}

// ══════════════════════════════════════════════════════════
section('[2] 同一元素换 handler：旧 handler 必须失效');
{
  reset();
  let aCalls = 0;
  let bCalls = 0;
  const useA = ref(true);
  const root = mkRoot();
  const app = createApp({
    setup: () => ({ useA, a: () => aCalls++, b: () => bCalls++ }),
    template: `<div><button class="b" @click="useA ? a() : b()">x</button></div>`,
  });
  await app.mount(root);
  await tick();
  const btn = root.querySelector('.b');

  click(btn);
  await tick();
  check('初次点击调用 a（阳性对照）', aCalls === 1 && bCalls === 0, `a=${aCalls} b=${bCalls}`);

  useA.value = false;
  await tick();
  click(btn);
  await tick();
  check('切换后点击只调用 b', bCalls === 1, `a=${aCalls} b=${bCalls}`);
  check('切换后旧 handler 不再被调用', aCalls === 1, `a=${aCalls}（期望 1）`);
  check('换 handler 不新增监听器', elementCount() === 1, `connected=${elementCount()}`);
  app.unmount();
  counting = false;
}

// ══════════════════════════════════════════════════════════
section('[3] 事件名变化（click → mouseenter）');
{
  reset();
  let clickCalls = 0;
  let enterCalls = 0;
  const mode = ref('click');
  const root = mkRoot();
  const app = createApp({
    setup: () => ({ mode, onClick: () => clickCalls++, onEnter: () => enterCalls++ }),
    template: `<div>
      <button v-if="mode === 'click'" class="b" @click="onClick">c</button>
      <button v-else class="b" @mouseenter="onEnter">e</button>
    </div>`,
  });
  await app.mount(root);
  await tick();
  click(root.querySelector('.b'));
  await tick();
  check('click 分支生效（阳性对照）', clickCalls === 1, `click=${clickCalls}`);

  mode.value = 'enter';
  await tick();
  const btn2 = root.querySelector('.b');
  btn2.dispatchEvent(new w.MouseEvent('mouseenter', { bubbles: false }));
  await tick();
  click(btn2);
  await tick();
  check('mouseenter 分支生效', enterCalls === 1, `enter=${enterCalls}`);
  check('旧 click 监听器不再存在', clickCalls === 1, `click=${clickCalls}（期望 1）`);
  app.unmount();
  counting = false;
}

// ══════════════════════════════════════════════════════════
section('[4] 反复更新 50 次不累积监听器');
{
  reset();
  const n = ref(0);
  const root = mkRoot();
  const app = createApp({
    setup: () => ({ n, inc: () => n.value++ }),
    template: `<div><button class="b" @click="inc">{{n}}</button></div>`,
  });
  await app.mount(root);
  await tick();
  const base = elementCount();
  for (let i = 0; i < 50; i++) {
    n.value = i;
    await tick(5);
  }
  check('50 次更新后监听器数不变', elementCount() === base, `base=${base} after=${elementCount()}`);
  check(
    '50 次更新后 DOM 内容正确',
    root.querySelector('.b')?.textContent?.trim() === '49',
    root.querySelector('.b')?.textContent,
  );
  app.unmount();
  counting = false;
}

// ══════════════════════════════════════════════════════════
section('[5] v-for 缩减后连接中的监听器');
{
  reset();
  const list = ref(['a', 'b', 'c', 'd']);
  const root = mkRoot();
  const app = createApp({
    setup: () => ({ list }),
    template: `<ul><li v-for="x in list" :key="x"><button class="b" @click="() => {}">{{x}}</button></li></ul>`,
  });
  await app.mount(root);
  await tick();
  const afterMount = elementCount();
  list.value = ['a'];
  await tick();
  check('挂载后 4 个监听器（阳性对照）', afterMount === 4, `connected=${afterMount}`);
  check('缩减到 1 项后连接中的监听器 = 1', elementCount() === 1, `connected=${elementCount()}`);
  app.unmount();
  counting = false;
}

// ══════════════════════════════════════════════════════════
section('[6] window 级监听器');
{
  reset();
  const root = mkRoot();
  const app = createApp({
    setup() {
      const onResize = () => {};
      onMounted(() => w.addEventListener('resize', onResize));
      onUnmounted(() => w.removeEventListener('resize', onResize));
      return {};
    },
    template: `<div class="m">m</div>`,
  });
  await app.mount(root);
  await tick();
  const afterMount = windowCount();
  app.unmount();
  await tick();
  const afterUnmount = windowCount();
  check('挂载后 window 上有监听器（阳性对照）', afterMount === 1, `window=${afterMount}`);
  check('卸载后 window 上监听器归零', afterUnmount === 0, `window=${afterUnmount}`);
  counting = false;
}

// ══════════════════════════════════════════════════════════
section('[7] 卸载后副作用停止（watch / watchEffect / onScopeDispose）');
{
  const re = await import(`${ROOT}/packages/reactivity/dist/index.mjs`);
  const state = ref(0);
  let watchRuns = 0;
  let effectRuns = 0;
  let disposed = 0;
  let scopeInSetup = null;

  const Child = {
    setup() {
      // setup 里必须已经处于组件的 effect scope 中 —— 否则 onScopeDispose 无处注册
      scopeInSetup = re.getCurrentScope() ?? null;
      watch(state, () => watchRuns++, { flush: 'sync' });
      watchEffect(() => {
        state.value;
        effectRuns++;
      });
      re.onScopeDispose(() => disposed++);
      return {};
    },
    template: `<span class="c">c</span>`,
  };

  const root = mkRoot();
  const app = createApp({ components: { Child }, template: `<div><Child /></div>` });
  await app.mount(root);
  await tick();
  const beforeEffect = effectRuns;
  check('挂载时 watchEffect 跑过（阳性对照）', beforeEffect >= 1, `runs=${beforeEffect}`);
  check('setup 里处于组件的 effect scope 中', scopeInSetup !== null, String(scopeInSetup));

  app.unmount();
  await tick();
  const before = { watchRuns, effectRuns };
  state.value = 1;
  await tick();

  check('卸载后 watch 不再触发', watchRuns === before.watchRuns, `before=${before.watchRuns} after=${watchRuns}`);
  check(
    '卸载后 watchEffect 不再触发',
    effectRuns === before.effectRuns,
    `before=${before.effectRuns} after=${effectRuns}`,
  );
  check('卸载后 onScopeDispose 回调被调用一次', disposed === 1, `disposed=${disposed}`);
}

// ══════════════════════════════════════════════════════════
section('[8] 卸载后渲染 effect 停止');
{
  const state = ref(0);
  let renders = 0;
  const Counter = {
    render() {
      renders++;
      return h('div', { class: 'rc' }, String(state.value));
    },
  };
  const root = mkRoot();
  const app = createApp(Counter);
  await app.mount(root);
  await tick();
  check('挂载时渲染过（阳性对照）', renders >= 1, `renders=${renders}`);

  app.unmount();
  await tick();
  const afterUnmount = renders;
  state.value = 1;
  await tick();
  check('卸载后渲染 effect 不再执行', renders === afterUnmount, `before=${afterUnmount} after=${renders}`);
}

// ══════════════════════════════════════════════════════════
section('[9] 20 轮挂载/卸载后不累积');
{
  reset();
  const shared = ref(0);
  let runs = 0;
  const Watcher = {
    setup() {
      watch(shared, () => runs++, { flush: 'sync' });
      return {};
    },
    template: `<div class="w"><button class="b" @click="() => {}">w</button></div>`,
  };
  for (let i = 0; i < 20; i++) {
    const root = mkRoot();
    const app = createApp(Watcher);
    await app.mount(root);
    await tick(8);
    app.unmount();
    await tick(8);
    root.remove();
  }
  await tick(40);

  const before = runs;
  shared.value = 1;
  await tick();
  check(
    '20 轮全部卸载后，改状态不触发任何 watch（泄漏会 +20）',
    runs === before,
    `before=${before} after=${runs}`,
  );
  check('20 轮后连接中的监听器 = 0', elementCount() === 0, `connected=${elementCount()}`);
  check('20 轮后无遗留定时器', liveTimers.size === 0, `timers=${liveTimers.size}`);
  counting = false;
  timerCounting = false;
}

// ══════════════════════════════════════════════════════════
section('[10] KeepAlive 停用后副作用必须仍然活着');
{
  const state = ref(0);
  let runs = 0;
  const A = {
    name: 'A',
    setup() {
      watch(state, () => runs++, { flush: 'sync' });
      return {};
    },
    template: `<div class="ka">{{state}}</div>`,
  };
  const B = { name: 'B', template: `<div class="kb">B</div>` };
  const which = ref('A');
  const root = mkRoot();
  const app = createApp({
    components: { KeepAlive: core.KeepAlive, A, B },
    setup: () => ({ which, state }),
    template: `<div><KeepAlive><component :is="which" /></KeepAlive></div>`,
  });
  await app.mount(root);
  await tick();
  which.value = 'B';
  await tick();
  const afterDeactivate = runs;
  state.value = 1;
  await tick();
  check(
    '停用期间 watch 仍在跑（缓存组件必须是活的）',
    runs === afterDeactivate + 1,
    `before=${afterDeactivate} after=${runs}`,
  );
  which.value = 'A';
  await tick();
  check('切回后仍渲染 A', root.querySelector('.ka') !== null, root.innerHTML);
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[11] Teleport 卸载');
{
  const target = document.createElement('div');
  target.id = 'tp-release';
  document.body.appendChild(target);
  reset();
  const root = mkRoot();
  const app = createApp({
    components: { Teleport: core.Teleport },
    template: `<div><Teleport to="#tp-release"><button class="tb" @click="() => {}">t</button></Teleport></div>`,
  });
  await app.mount(root);
  await tick();
  const afterMount = elementCount();
  app.unmount();
  await tick();
  check('Teleport 内容进了目标（阳性对照）', afterMount === 1, `connected=${afterMount}`);
  check('卸载后目标容器清空', target.querySelectorAll('.tb').length === 0, target.innerHTML);
  check('卸载后连接中的监听器归零', elementCount() === 0, `connected=${elementCount()}`);
  counting = false;
}

// ══════════════════════════════════════════════════════════
section('[12] SSR 每请求必须释放（实例永不被 unmount）');
{
  const ssr = await import(`${ROOT}/packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs`);
  // 纯 SSR 进程不调 createApp ⇒ 需要显式注入模板编译器
  core.installTemplateCompiler();

  const state = ref(0);
  let runs = 0;
  const Page = {
    setup() {
      watch(state, () => runs++, { flush: 'sync' });
      return {};
    },
    render() {
      return h('div', { class: 'ssr-p' }, 'page');
    },
  };

  const first = ssr.renderToString(h(Page));
  check('SSR 渲染输出正确（阳性对照）', first.includes('ssr-p'), first);

  for (let i = 0; i < 50; i++) ssr.renderToString(h(Page));
  const before = runs;
  state.value = 1;
  check(
    '50 次 SSR 渲染后不残留 watch（每请求泄漏会 +50）',
    runs === before,
    `before=${before} after=${runs}`,
  );
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
