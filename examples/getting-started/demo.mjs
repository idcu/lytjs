/**
 * LytJS Getting Started — 可运行的最小 demo
 *
 * 运行方式（在仓库根目录）：
 *   node examples/getting-started/demo.mjs
 *
 * 前置条件：已执行 `npx tsx scripts/smart-build.ts`（或至少构建了 core 和 ssr）
 *
 * 本 demo 展示：
 *   1. ref + computed 响应式
 *   2. 模板写法（v-if / v-for / @click / 插值）
 *   3. 子组件 props + emit
 *   4. SSR → 客户端挂载 → 交互 → DOM 校验
 */

// ── 1. 环境准备 ──────────────────────────────────────────────
// Node 环境没有 DOM，用 jsdom 模拟。
// 浏览器环境（Vite dev server 等）不需要这段。
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  url: 'http://localhost',
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.SVGElement = dom.window.SVGElement;
globalThis.Event = dom.window.Event;
globalThis.MouseEvent = dom.window.MouseEvent;
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

// ── 2. 从 dist 导入（和真实消费者一样） ──────────────────────
// 路径用相对仓库根的绝对路径，确保不受 CWD 影响
const REPO = import.meta.url.replace(/\/examples\/.*$/, '');

const { createApp, h, ref, computed, installTemplateCompiler } =
  await import(`${REPO}/packages/core/dist/index.mjs`);

const { renderToString } =
  await import(`${REPO}/packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs`);

// ── 3. 定义组件 ──────────────────────────────────────────────

/**
 * 子组件：计数按钮
 * - 接收 label（string）和 count（number）两个 props
 * - 点击时 emit 'bump' 事件
 */
const CounterButton = {
  name: 'CounterButton',
  props: {
    label: String,
    count: Number,
  },
  emits: ['bump'],
  template: `<button class="btn" @click="$emit('bump')">{{ label }}: {{ count }}</button>`,
};

/**
 * 主应用
 * - ref 管理状态
 * - computed 派生值
 * - v-for 列表渲染
 * - v-if 条件渲染
 * - 子组件 props + emit 通信
 */
const App = {
  name: 'App',
  components: { CounterButton },
  setup() {
    const count = ref(0);
    const items = ref(['Apple', 'Banana', 'Cherry']);
    const showList = ref(true);
    const doubled = computed(() => count.value * 2);

    return { count, items, showList, doubled };
  },
  template: `
    <div class="app">
      <h1>LytJS Demo</h1>
      <CounterButton :label="'Count'" :count="count" @bump="count++" />
      <p class="doubled">Doubled: {{ doubled }}</p>
      <button class="toggle" @click="showList = !showList">
        {{ showList ? 'Hide' : 'Show' }} List
      </button>
      <ul v-if="showList">
        <li v-for="(item, i) in items" :key="i" class="item">{{ item }}</li>
      </ul>
      <p v-else class="empty">List is hidden</p>
    </div>
  `,
};

// ── 4. SSR 渲染 ──────────────────────────────────────────────
// ⚠️ 关键：如果只用 SSR（不调 createApp），必须先注入模板编译器。
//    createApp() 内部会自动注入，但纯 SSR 进程不创建 app。
installTemplateCompiler();

console.log('=== SSR 渲染 ===');
const ssrHtml = renderToString(h(App));
console.log(ssrHtml);

// ── 5. 客户端挂载 ────────────────────────────────────────────
console.log('\n=== 客户端挂载 ===');
const root = document.getElementById('app');
await createApp(App).mount(root);
await new Promise((r) => setTimeout(r, 50)); // 等待微任务 flush

console.log(root.innerHTML.slice(0, 200) + '...');

// ── 6. 交互验证 ──────────────────────────────────────────────
console.log('\n=== 交互测试 ===');

const btn = root.querySelector('.btn');
const doubledEl = root.querySelector('.doubled');

console.log(`初始 count: ${root.querySelector('.btn')?.textContent?.trim()}`);
console.log(`初始 doubled: ${doubledEl?.textContent?.trim()}`);

// 点击 → count +1
btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 50));
console.log(`点击后 count: ${root.querySelector('.btn')?.textContent?.trim()}`);
console.log(`点击后 doubled: ${root.querySelector('.doubled')?.textContent?.trim()}`);

// 再点一次
btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 50));
console.log(`再点后 count: ${root.querySelector('.btn')?.textContent?.trim()}`);

// 切换 v-if
const toggleBtn = root.querySelector('.toggle');
console.log(`\n列表可见: ${root.querySelector('.item') ? 'yes' : 'no'}`);
toggleBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
await new Promise((r) => setTimeout(r, 50));
console.log(`切换后列表可见: ${root.querySelector('.item') ? 'yes' : 'no'}`);
console.log(`隐藏提示: ${root.querySelector('.empty')?.textContent?.trim() ?? '(无)'}`);

console.log('\n✅ Demo 完成！');
