/**
 * 消费者视角的端到端 demo —— **只用公开 API**（从 dist 导入，不碰 src）。
 *
 * 模拟一个真实使用者会写的应用：
 *   · 计数器（ref + 事件）
 *   · 列表渲染（v-for）
 *   · 条件渲染（v-if）
 *   · 子组件（props + emit）
 *   · SSR 出 HTML → 客户端 hydrate → 点击 → 校验 DOM
 */
import { JSDOM } from '/Volumes/Data/lytjs/lytjs/node_modules/jsdom/lib/api.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Event = dom.window.Event;
globalThis.MouseEvent = dom.window.MouseEvent;
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: dom.window.navigator,
    configurable: true,
  });
} catch {
  /* ignore */
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const { createApp, h, ref, installTemplateCompiler } =
  await import('/Volumes/Data/lytjs/lytjs/packages/core/dist/index.mjs');
const SSR =
  await import('/Volumes/Data/lytjs/lytjs/packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs');

let fail = 0;
const check = (name, ok, detail) => {
  if (!ok) fail++;
  console.log(
    `${ok ? '[ok]  ' : '[FAIL]'} ${name}${detail ? ' :: ' + String(detail).slice(0, 160) : ''}`,
  );
};
const tick = (ms = 50) => new Promise((r) => setTimeout(r, ms));

// ── 子组件：按钮（props + emit） ────────────────────────────
const CounterButton = {
  name: 'CounterButton',
  props: { label: String, count: Number },
  emits: ['bump'],
  template: `<button class="btn" @click="$emit('bump')">{{ label }}: {{ count }}</button>`,
};

// ── 主应用 ──────────────────────────────────────────────────
const App = {
  name: 'App',
  components: { CounterButton },
  setup() {
    const count = ref(0);
    const items = ref(['a', 'b']);
    const show = ref(true);
    return { count, items, show };
  },
  template: `
    <div class="app">
      <h1>Demo</h1>
      <CounterButton :label="'Count'" :count="count" @bump="count++" />
      <p class="val">{{ count }}</p>
      <ul><li v-for="(it, i) in items" :key="i" class="item">{{ it }}</li></ul>
      <p v-if="show" class="yes">visible</p>
      <p v-else class="no">hidden</p>
    </div>
  `,
};

// 1) SSR —— ⚠️ 消费者必踩的第一个坑：
//    只 import '@lytjs/ssr' **渲染不了 template 组件**，必须显式注入编译器。
//    （`createApp()` 会顺带注入，但纯 SSR 的进程从不创建 app。）
installTemplateCompiler();

let ssrHtml = '';
let ssrErr = null;
try {
  ssrHtml = SSR.renderToString(h(App));
} catch (e) {
  ssrErr = e.message;
}
check('SSR 渲染不抛错', !ssrErr, ssrErr);
check('SSR 含标题', ssrHtml.includes('Demo'), ssrHtml.slice(0, 120));
check('SSR 含子组件内容', ssrHtml.includes('Count'), ssrHtml.slice(0, 200));
check('SSR 含列表项', (ssrHtml.match(/class="item"/g) || []).length === 2, ssrHtml.slice(0, 300));
check(
  'SSR 含 v-if 分支',
  ssrHtml.includes('visible') && !ssrHtml.includes('hidden'),
  ssrHtml.slice(0, 300),
);

// 2) 客户端挂载
const root = globalThis.document.createElement('div');
globalThis.document.body.appendChild(root);
let mountErr = null;
try {
  await createApp(App).mount(root);
} catch (e) {
  mountErr = e.message;
}
await tick();
check('客户端挂载不抛错', !mountErr, mountErr);

const btn = root.querySelector('.btn');
const val = root.querySelector('.val');
check('挂载后有按钮', !!btn, root.innerHTML.slice(0, 200));
check('初始计数为 0', val?.textContent?.trim() === '0', val?.textContent);

// 2.5) SSR 与客户端**初始**产物一致性（hydration 的前提）
//       ⚠️ 必须在交互之前比 —— 交互之后客户端计数已变，当然不一致。
const initialClientHtml = root.innerHTML;
const norm = (str) =>
  str
    .replace(/\s+/g, ' ')
    .replace(/<!--[^>]*-->/g, '')
    .trim();
check(
  'SSR 与客户端初始结构一致（hydrate 前提）',
  norm(ssrHtml) === norm(initialClientHtml),
  `ssr=${norm(ssrHtml).slice(0, 90)} | cli=${norm(initialClientHtml).slice(0, 90)}`,
);

// 3) 交互：点击 → 计数 +1
if (btn) {
  btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await tick();
  check('点击后计数变为 1', val?.textContent?.trim() === '1', val?.textContent);
  btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  await tick();
  check('再点一次变为 2', val?.textContent?.trim() === '2', val?.textContent);
}

console.log(fail === 0 ? '\n✅ 通过：消费者视角端到端全部正常' : `\n❌ ${fail} 项失败`);
process.exit(fail === 0 ? 0 : 1);
