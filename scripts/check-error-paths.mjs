#!/usr/bin/env node
/* global document */
/**
 * 门禁：错误路径（错误被谁接住、会不会静默、出错后还能不能用）
 *
 * ## 为什么需要这一项
 *
 * 本仓最典型的缺陷类型是「静默失败」：空页 + HTTP 200、错误被吞掉、控制台一行没有。
 * 这类缺陷有一个共同点：**所有正常路径的测试都照常通过**。
 *
 * 本门禁对每条错误路径问三件事：
 *
 *   A. **可达性** —— errorCaptured / app.errorHandler / console 至少有一处收到
 *   B. **不静默** —— 不允许「DOM 空白 + 无任何痕迹」
 *   C. **可恢复** —— 出错后其它组件仍能更新（错误不得污染整个应用）
 *
 * ## 2026-11-03 首次运行抓到 3 个真缺陷
 *
 * 1. **调度器把未处理错误整个丢掉**（生产构建）
 *    `flushJobs` 的三条 catch 都是 `if (globalErrorHandler) …; if (__DEV__) console.error(…)`，
 *    而 `setErrorHandler()` **全仓从未被调用**，`if (__DEV__)` 在产物里被 tree-shake
 *    ⇒ 生产构建下**没有异常、没有日志、`window.onerror` 也不触发**。
 *
 * 2. **异步组件 loader 失败没有任何上报**
 *    catch 里只改 state 并渲染一个注释节点，没有 onErrorCaptured / app.errorHandler /
 *    控制台。生产里 chunk 404 / 网络断开是常见故障，用户只看到一块空白。
 *
 * 3. **SSR 组件 setup 抛错输出空串**
 *    服务端返回 `200 + 空页`。本仓已经在两处为此专门抛错（缺编译器 / 同步 API 遇
 *    async setup），`setup` 抛错属于同一类却漏了。
 *
 * ## 排查中发现的第四个问题（不是错误路径，但由它暴露）
 *
 * 修好 scheduler 后修复**完全不生效**：`packages/vdom/dist/index.mjs` 里有一份
 * `function queuePreFlushCb` 的副本 —— 因为 `@lytjs/common-scheduler` 不在 vdom 的
 * dependencies 里，tsup 把它内联了 ⇒ 运行时有两份 scheduler 实例。
 * 这类问题由 `scripts/check-package-deps.mjs` 守。
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
const { createApp, ref, watch, computed, onErrorCaptured, onMounted, h } = core;

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const mkRoot = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
};

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

/** 捕获 console.error / console.warn */
const trapConsole = () => {
  const calls = [];
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...a) => calls.push('error: ' + a.map(String).join(' '));
  console.warn = (...a) => calls.push('warn: ' + a.map(String).join(' '));
  return {
    calls,
    restore: () => {
      console.error = origError;
      console.warn = origWarn;
    },
  };
};

const boom = (msg = 'BOOM') => {
  throw new Error(msg);
};

// ══════════════════════════════════════════════════════════
section('[1] setup 抛错');
{
  const trap = trapConsole();
  const captured = [];
  const Bad = {
    name: 'Bad',
    setup() {
      boom('setup-boom');
      return {};
    },
    template: `<div class="bad">bad</div>`,
  };
  const Good = { template: `<div class="good">good</div>` };
  const root = mkRoot();
  const app = createApp({
    components: { Bad, Good },
    setup() {
      onErrorCaptured((err, _inst, info) => {
        captured.push({ msg: err.message, info, hasInst: !!_inst });
        return false;
      });
      return {};
    },
    template: `<div><Bad /><Good /></div>`,
  });
  await app.mount(root);
  await tick();
  trap.restore();

  check('错误到达 errorCaptured', captured.length >= 1, JSON.stringify(captured));
  check('errorCaptured 收到 info 描述', !!captured[0]?.info, captured[0]?.info);
  check(
    '兄弟组件仍然渲染（错误未摧毁整棵树）',
    root.querySelector('.good') !== null,
    root.innerHTML,
  );
  check('出错组件不渲染出内容', root.querySelector('.bad') === null, root.innerHTML);
  check(
    '未静默（errorCaptured 或 console 至少一处有痕迹）',
    captured.length > 0 || trap.calls.length > 0,
    `captured=${captured.length} console=${trap.calls.length}`,
  );
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[2] render 抛错');
{
  const trap = trapConsole();
  const captured = [];
  const Bad = {
    name: 'BadRender',
    render() {
      boom('render-boom');
    },
  };
  const root = mkRoot();
  const app = createApp({
    components: { Bad },
    setup() {
      onErrorCaptured((err, _i, info) => {
        captured.push({ msg: err.message, info });
        return false;
      });
      return {};
    },
    template: `<div><span class="sib">sib</span><Bad /></div>`,
  });
  await app.mount(root);
  await tick();
  trap.restore();

  check('render 抛错到达 errorCaptured', captured.length >= 1, JSON.stringify(captured));
  check('兄弟节点仍在', root.querySelector('.sib') !== null, root.innerHTML);
  check('未静默', captured.length > 0 || trap.calls.length > 0, `console=${trap.calls.length}`);
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[3] 生命周期钩子抛错');
{
  const trap = trapConsole();
  const captured = [];
  const Bad = {
    name: 'BadMounted',
    setup() {
      onMounted(() => boom('mounted-boom'));
      return {};
    },
    template: `<div class="bm">bm</div>`,
  };
  const root = mkRoot();
  const app = createApp({
    components: { Bad },
    setup() {
      onErrorCaptured((err, _i, info) => {
        captured.push({ msg: err.message, info });
        return false;
      });
      return {};
    },
    template: `<div><Bad /></div>`,
  });
  await app.mount(root);
  await tick();
  trap.restore();

  check('onMounted 抛错到达 errorCaptured', captured.length >= 1, JSON.stringify(captured));
  check('组件本身仍挂载成功', root.querySelector('.bm') !== null, root.innerHTML);
  check('未静默', captured.length > 0 || trap.calls.length > 0, `console=${trap.calls.length}`);
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[4] 事件处理器抛错');
{
  const trap = trapConsole();
  const captured = [];
  const root = mkRoot();
  const app = createApp({
    setup() {
      onErrorCaptured((err, _i, info) => {
        captured.push({ msg: err.message, info });
        return false;
      });
      return { onClick: () => boom('click-boom') };
    },
    template: `<div><button class="b" @click="onClick">x</button></div>`,
  });
  await app.mount(root);
  await tick();

  let dispatchedOk = true;
  try {
    root.querySelector('.b').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  } catch {
    dispatchedOk = false;
  }
  await tick();
  trap.restore();

  check('事件处理器抛错不逃出 dispatchEvent（不打断宿主）', dispatchedOk, 'dispatchEvent threw');
  check(
    '事件处理器抛错到达 errorCaptured 或 console',
    captured.length > 0 || trap.calls.length > 0,
    `captured=${captured.length} console=${trap.calls.length}`,
  );
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[5] watch 回调抛错：不得打断其它 watcher');
{
  const trap = trapConsole();
  const s = ref(0);
  let otherRuns = 0;
  const root = mkRoot();
  const app = createApp({
    setup() {
      watch(s, () => boom('watch-boom'), { flush: 'sync' });
      watch(s, () => otherRuns++, { flush: 'sync' });
      return {};
    },
    template: `<div class="w">w</div>`,
  });
  await app.mount(root);
  await tick();

  let threw = false;
  try {
    s.value = 1;
  } catch {
    threw = true;
  }
  await tick();
  trap.restore();

  check('watch 回调抛错不逃出赋值语句（框架接住）', !threw, 'ref.value 赋值抛出了');
  check('另一个 watcher 仍然执行（未被污染）', otherRuns === 1, `otherRuns=${otherRuns}`);
  check('未静默', trap.calls.length > 0, `console=${trap.calls.length}`);
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[6] computed getter 抛错（渲染期）');
{
  const trap = trapConsole();
  const s = ref(1);
  const c = computed(() => {
    if (s.value === 0) boom('computed-boom');
    return s.value * 2;
  });
  const root = mkRoot();
  const app = createApp({
    setup: () => ({ c }),
    template: `<div class="c">{{ c }}</div>`,
  });
  await app.mount(root);
  await tick();
  check(
    '正常时 computed 正确',
    root.querySelector('.c')?.textContent?.trim() === '2',
    root.textContent,
  );

  let threw = false;
  try {
    s.value = 0;
    await tick();
  } catch {
    threw = true;
  }
  trap.restore();

  check('computed 抛错不逃出（框架接住）', !threw, '抛到了调用方');
  // 这条是本门禁的核心：渲染期抛出的错误，若无人处理，**必须**至少留下一条日志。
  // 修复前这里是完全静默的（`flushJobs` 的 catch 把错误丢了）。
  check('未静默（渲染期错误必须有痕迹）', trap.calls.length > 0, `console=${trap.calls.length}`);
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[7] 出错后应用仍可继续更新');
{
  const trap = trapConsole();
  const n = ref(0);
  const Bad = {
    name: 'BadOnce',
    render() {
      if (n.value === 1) boom('render-once');
      return h('div', { class: 'bad' }, String(n.value));
    },
  };
  const root = mkRoot();
  const app = createApp({
    components: { Bad },
    setup: () => ({ n }),
    template: `<div><Bad /><span class="tail">{{ n }}</span></div>`,
  });
  await app.mount(root);
  await tick();

  n.value = 1;
  await tick();
  const afterError = root.innerHTML;

  n.value = 2;
  await tick();
  trap.restore();

  check(
    '抛错那次确实失败了',
    afterError.includes('bad') === false || afterError.includes('1'),
    afterError,
  );
  check(
    '之后仍能恢复渲染（应用没死）',
    root.querySelector('.bad')?.textContent?.trim() === '2',
    root.innerHTML,
  );
  check(
    '兄弟插值同步更新',
    root.querySelector('.tail')?.textContent?.trim() === '2',
    root.innerHTML,
  );
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[8] errorCaptured 返回 false 阻止向上传播');
{
  const trap = trapConsole();
  const inner = [];
  const outer = [];
  const Bad = {
    name: 'Bad',
    setup() {
      boom('x');
      return {};
    },
    template: `<i>x</i>`,
  };
  const Mid = {
    components: { Bad },
    setup() {
      onErrorCaptured((e) => {
        inner.push(e.message);
        return false;
      });
      return {};
    },
    template: `<div><Bad /></div>`,
  };
  const root = mkRoot();
  const app = createApp({
    components: { Mid },
    setup() {
      onErrorCaptured((e) => {
        outer.push(e.message);
        return false;
      });
      return {};
    },
    template: `<div><Mid /></div>`,
  });
  await app.mount(root);
  await tick();
  trap.restore();

  check('最近的 errorCaptured 收到错误', inner.length === 1, `inner=${inner.length}`);
  check('返回 false 后外层不再收到', outer.length === 0, `outer=${outer.length}`);
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[9] errorCaptured 不返回 false 时向上传播');
{
  const trap = trapConsole();
  const inner = [];
  const outer = [];
  const Bad = {
    name: 'Bad',
    setup() {
      boom('y');
      return {};
    },
    template: `<i>x</i>`,
  };
  const Mid = {
    components: { Bad },
    setup() {
      onErrorCaptured((e) => {
        inner.push(e.message);
        return undefined;
      });
      return {};
    },
    template: `<div><Bad /></div>`,
  };
  const root = mkRoot();
  const app = createApp({
    components: { Mid },
    setup() {
      onErrorCaptured((e) => {
        outer.push(e.message);
        return false;
      });
      return {};
    },
    template: `<div><Mid /></div>`,
  });
  await app.mount(root);
  await tick();
  trap.restore();

  check('内层收到', inner.length === 1, `inner=${inner.length}`);
  check('不阻止时外层也收到', outer.length === 1, `outer=${outer.length}`);
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[10] 异步组件 loader 失败');
{
  const trap = trapConsole();
  const captured = [];
  // ⚠️ 必须用 defineAsyncComponent 包一层：直接把 loader 挂在普通对象上，
  //   框架不会把它当异步组件（会当成"没有 setup/render 的普通组件"）⇒ 测不到。
  const BadAsync = core.defineAsyncComponent({
    name: 'BadAsync',
    loader: () => Promise.reject(new Error('loader-fail')),
  });
  const root = mkRoot();
  const app = createApp({
    components: { BadAsync },
    setup() {
      onErrorCaptured((e, _i, info) => {
        captured.push({ msg: e.message, info });
        return false;
      });
      return {};
    },
    template: `<div><span class="keep">keep</span><BadAsync /></div>`,
  });
  await app.mount(root);
  await tick(120);
  trap.restore();

  check('loader 失败不摧毁整棵树', root.querySelector('.keep') !== null, root.innerHTML);
  check(
    'loader 失败未静默',
    captured.length > 0 || trap.calls.length > 0,
    `captured=${captured.length} console=${trap.calls.length}`,
  );
  app.unmount();
}

// ══════════════════════════════════════════════════════════
section('[11] SSR：组件 setup 抛错不得输出空页');
{
  const ssr = await import(
    `${ROOT}/packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs`
  );
  core.installTemplateCompiler();
  const trap = trapConsole();

  const Bad = {
    name: 'SSRBad',
    setup() {
      boom('ssr-setup-boom');
      return {};
    },
    template: `<div>x</div>`,
  };

  let html = null;
  let threw = null;
  try {
    html = ssr.renderToString(h(Bad));
  } catch (e) {
    threw = e;
  }
  trap.restore();

  check(
    'SSR setup 抛错要么抛异常、要么输出可诊断内容（不允许静默空串）',
    threw !== null || (html !== null && html.length > 0),
    `threw=${threw ? threw.message : 'null'} html=${JSON.stringify(html)}`,
  );
  check(
    '抛出的错误带上组件名与原始消息',
    threw === null || /SSRBad/.test(threw.message),
    threw?.message,
  );
}

// ══════════════════════════════════════════════════════════
section('[12] SSR：render 抛错');
{
  const ssr = await import(
    `${ROOT}/packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs`
  );
  const trap = trapConsole();
  const Bad = {
    name: 'SSRBadRender',
    render() {
      boom('ssr-render-boom');
    },
  };

  let html = null;
  let threw = null;
  try {
    html = ssr.renderToString(h(Bad));
  } catch (e) {
    threw = e;
  }
  trap.restore();

  check(
    'SSR render 抛错要么抛异常、要么输出可诊断内容',
    threw !== null || (html !== null && html.length > 0),
    `threw=${threw ? threw.message : 'null'} html=${JSON.stringify(html)}`,
  );
}

// ══════════════════════════════════════════════════════════
console.log(`\n共 ${pass + fail} 条断言：✅ ${pass} / ❌ ${fail}`);
if (fail > 0) {
  console.log('\n失败项：');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
// 显式正常退出：`ComputedRefImpl` 的 60s 缓存清理定时器没有 unref，会把 Node 的事件循环
// 多留住 60s（实测本门禁 31 条断言 1.0s 跑完，进程却到 61.4s 才退出）。
// 断言结果已在上面全部打印，这里退出不影响判据，只去掉无意义的空等。
process.exit(0);
