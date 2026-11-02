#!/usr/bin/env node
/**
 * SSR ↔ 客户端 一致性门禁 check-ssr-client-parity
 *
 * ## 为什么需要它
 *
 * 仓库历史上「两端不一致」是一个**反复出现的缺陷族**：
 *   · 属性透传：SSR 完全不做，客户端覆盖自身 class ⇒ hydrate 必错位
 *   · 组件 vnode 分发：SSR 只认函数，对象组件输出空串
 *   · `redirectResponse` 漏改（同一批修复里唯一漏掉的一支）
 *
 * 单点断言很难覆盖这一族。本门禁用**差分**判据：同一个组件，分别走
 *   ① SSR：`renderToString`
 *   ② 客户端：`createApp().mount()`
 * 断言两者产出的 HTML **语义等价**。任何一端漏处理某个语法，这里立刻红。
 *
 * ## 2026-11-02 首次运行抓到 3 个真实缺陷（均已修复）
 *
 *   ① `v-html`：SSR 把 `innerHTML` 当普通属性转义输出
 *      ⇒ `<div class="h" innerHTML="&lt;b&gt;bold&lt;/b&gt;"></div>`（内容丢失 + 非法属性）
 *   ② `<component :is>`：SSR 未设置当前实例 ⇒ `resolveComponent` 恒失败
 *      ⇒ 把组件名当标签输出 `<A></A>`（组件根本没渲染）
 *   ③ 静态模板的 attrs 累积：编译器把整模板提升成**共享 vnode 对象**，
 *      而 attrs 合并是**原地修改**它 ⇒ 第 2 个实例 `class="own a b"`（继承上一个的 a）
 *
 * ## 归一化规则（只抹掉**语义等价**的序列化差异）
 *
 *   · 空白折叠、去注释、去水合标记属性
 *   · 属性按名字排序（顺序不承载语义）
 *   · 布尔属性 `disabled` ≡ `disabled=""`
 *   · `style` 的尾分号 / 分隔符空格
 *
 * 刻意**不**做归一化的：文本内容、属性值、节点顺序、标签名 ——
 * 这些一旦不同就是真缺陷。
 *
 * ## 判据
 *
 * 退出码 0 = 所有形态两端语义等价。
 */
import { JSDOM } from '../node_modules/jsdom/lib/api.js';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
const G = globalThis;

G.window = dom.window;
G.document = dom.window.document;
G.Node = dom.window.Node;
G.Element = dom.window.Element;
G.HTMLElement = dom.window.HTMLElement;
G.SVGElement = dom.window.SVGElement;
G.Event = dom.window.Event;
G.MouseEvent = dom.window.MouseEvent;
G.CustomEvent = dom.window.CustomEvent;
G.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
try {
  Object.defineProperty(G, 'navigator', { value: dom.window.navigator, configurable: true });
} catch {
  /* ignore */
}
G.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
G.cancelAnimationFrame = (id) => clearTimeout(id);

const url = (p) => new URL(p, import.meta.url).href;
const core = await import(url('../packages/core/dist/index.mjs'));
const ssr = await import(
  url('../packages/ecosystem/packages/ssr-kit/packages/ssr/dist/index.mjs')
);
const { createApp, h, ref, installTemplateCompiler } = core;
installTemplateCompiler();

const tick = (ms = 70) => new Promise((r) => setTimeout(r, ms));

/** HTML 布尔属性：`disabled` 与 `disabled=""` 在 HTML 里完全等价 */
const BOOLEAN_ATTRS =
  'disabled|readonly|checked|selected|multiple|hidden|required|autofocus|novalidate|open|loop|muted|controls|default|defer|async|reversed|scoped';

function norm(html) {
  let s = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+data-hydrate(?:-strategy)?="[^"]*"/g, '')
    .replace(/>\s+</g, '><')
    .trim();

  // 排序每个开始标签内的属性
  s = s.replace(/<([a-zA-Z][\w-]*)((?:\s+[^<>]*?)?)\s*\/?>/g, (m, tag, attrs) => {
    if (!attrs || !attrs.trim()) return m;
    const list = attrs.trim().match(/[^\s=]+(?:="[^"]*")?/g) || [];
    list.sort();
    return `<${tag} ${list.join(' ')}>`;
  });

  // 布尔属性归一：`disabled=""` → `disabled`
  s = s.replace(new RegExp(`\\s(${BOOLEAN_ATTRS})=""`, 'g'), ' $1');

  // style 归一：去尾分号、统一分隔
  s = s.replace(/style="([^"]*)"/g, (_m, v) => {
    const cleaned = v
      .replace(/\s*;\s*/g, '; ')
      .replace(/;\s*$/, '')
      .trim();
    return `style="${cleaned}"`;
  });

  return s;
}

let fail = 0;
let total = 0;
const check = (name, ok, detail) => {
  total++;
  if (!ok) fail++;
  console.log(`${ok ? '   ✅' : '   ❌'} ${name}${!ok && detail ? ' :: ' + detail : ''}`);
};

async function parity(name, App) {
  let ssrHtml;
  let clientHtml;
  try {
    ssrHtml = ssr.renderToString(h(App));
    const root = document.createElement('div');
    document.body.appendChild(root);
    await createApp(App).mount(root);
    await tick();
    clientHtml = root.innerHTML;
  } catch (e) {
    check(`${name} · 两端都能渲染`, false, e.message);
    return;
  }
  const a = norm(ssrHtml);
  const b = norm(clientHtml);
  check(
    `${name} · SSR 与客户端语义一致`,
    a === b,
    a === b ? '' : `\n        SSR: ${a.slice(0, 160)}\n        CLI: ${b.slice(0, 160)}`,
  );
}

console.log('🔍 SSR ↔ 客户端 一致性门禁 check-ssr-client-parity\n');
console.log('   [模板语法]');

// 1. v-if 与 v-for 同元素（v-if 优先）
{
  const show = ref(true);
  const list = ref(['a', 'b']);
  await parity('v-if+v-for 同元素', {
    setup: () => ({ show, list }),
    template: `<div><span v-for="(x,i) in list" :key="i" v-if="show" class="s">{{x}}</span></div>`,
  });
}

// 2. class 数组 + 对象 + 字符串
{
  const on = ref(true);
  await parity('class 数组+对象', {
    setup: () => ({ on }),
    template: `<div class="a" :class="['b', { c: on }]">x</div>`,
  });
}

// 3. style 对象（kebab-case 转换）
await parity('style 对象', {
  setup: () => ({ color: 'red' }),
  template: `<div :style="{ color: color, fontSize: '12px' }">x</div>`,
});

// 4. v-bind 对象展开
await parity('v-bind 对象展开', {
  setup: () => ({ attrs: { id: 'i1', title: 'T', 'data-x': '1' } }),
  template: `<div v-bind="attrs">x</div>`,
});

// 5. 动态属性名
await parity('动态属性名 :[key]', {
  setup: () => ({ k: 'data-dyn', v: 'V' }),
  template: `<div :[k]="v">x</div>`,
});

// 6. 多根节点（Fragment）
await parity('多根节点 Fragment', {
  setup: () => ({ a: 'A', b: 'B' }),
  template: `<span class="x">{{a}}</span><span class="y">{{b}}</span>`,
});

// 7. 自闭合组件
{
  const Inner = { template: `<i class="in">i</i>` };
  await parity('自闭合组件', { components: { Inner }, template: `<div><Inner /></div>` });
}

// 8. 默认插槽
{
  const Box = { template: `<div class="box"><slot /></div>` };
  await parity('默认插槽', {
    components: { Box },
    setup: () => ({ t: 'slot-text' }),
    template: `<div><Box>{{t}}</Box></div>`,
  });
}

// 9. 具名插槽
{
  const Card = {
    template: `<div class="card"><header><slot name="h" /></header><main><slot /></main></div>`,
  };
  await parity('具名插槽', {
    components: { Card },
    setup: () => ({ t: 'body' }),
    template: `<div><Card><template #h><b class="hh">H</b></template>{{t}}</Card></div>`,
  });
}

// 10. 内联事件带参数
{
  const got = ref('');
  await parity('内联事件带参数', {
    setup: () => ({ got, fn: (a, e) => (got.value = a + ':' + e.type) }),
    template: `<div><button class="b" @click="fn('X', $event)">b</button></div>`,
  });
}

// 11. v-html（2026-11-02 修复的 P0）
await parity('v-html', {
  setup: () => ({ html: '<b class="in">bold</b>' }),
  template: `<div><div class="h" v-html="html"></div></div>`,
});

// 12. v-show
await parity('v-show', {
  setup: () => ({ vis: false }),
  template: `<div><p class="p" v-show="vis">x</p></div>`,
});

// 13. 组件 v-model
{
  const Child = {
    props: { modelValue: String },
    emits: ['update:modelValue'],
    template: `<span class="cm">{{modelValue}}</span>`,
  };
  await parity('组件 v-model', {
    components: { Child },
    setup: () => ({ val: 'V' }),
    template: `<div><Child v-model="val" /></div>`,
  });
}

// 14. 属性透传到子组件根（2026-11-02 修复的 attrs 累积 P0）
{
  const Inner = { template: `<div class="own">i</div>` };
  await parity('属性透传到子组件根', {
    components: { Inner },
    template: `<div><Inner class="passed" id="pid" /></div>`,
  });
}

// 15. 模板注释
await parity('模板注释', {
  setup: () => ({ t: 'x' }),
  template: `<div><!-- a comment --><span>{{t}}</span></div>`,
});

// 16. 布尔属性
await parity('布尔属性', {
  setup: () => ({ dis: true }),
  template: `<div><input class="i" :disabled="dis" readonly /></div>`,
});

// 17. 嵌套 v-for
await parity('嵌套 v-for', {
  setup: () => ({
    rows: [
      { id: 1, cs: ['a', 'b'] },
      { id: 2, cs: ['c'] },
    ],
  }),
  template: `<table class="t"><tr v-for="r in rows" :key="r.id"><td v-for="(c,i) in r.cs" :key="i">{{c}}</td></tr></table>`,
});

// 18. 动态组件 :is（2026-11-02 修复的 P0）
{
  const A = { template: `<span class="ca">A</span>` };
  const B = { template: `<span class="cb">B</span>` };
  await parity('动态组件 :is', {
    components: { A, B },
    setup: () => ({ which: 'A' }),
    template: `<div><component :is="which" /></div>`,
  });
}

// 19. 三元与算术表达式
await parity('三元与算术表达式', {
  setup: () => ({ n: 3 }),
  template: `<div><span class="a">{{ n > 2 ? 'big' : 'small' }}</span><span class="b">{{ n * 2 + 1 }}</span></div>`,
});

// 20. 三层组件树
{
  const Leaf = { props: { v: String }, template: `<i class="leaf">{{v}}</i>` };
  const Mid = {
    components: { Leaf },
    props: { v: String },
    template: `<b class="mid"><Leaf :v="v" /></b>`,
  };
  await parity('三层组件树', {
    components: { Mid },
    setup: () => ({ v: 'deep' }),
    template: `<div class="root"><Mid :v="v" /></div>`,
  });
}

// ══════════════════════════════════════════════════════════
// 21-23. 静态模板的 attrs 隔离（2026-11-02 的 P0 专项）
// ══════════════════════════════════════════════════════════
//
// 编译器把**完全静态的模板**提升成模块级常量，render 每次返回**同一个 vnode 对象**。
// 若 attrs 合并是原地修改，attrs 会在实例之间累积。
// 这一组专门锁「多实例互不污染」——只看单个实例是发现不了的。
console.log('\n   [静态模板的 attrs 隔离]');
{
  const Inner = { template: `<div class="own">inner</div>` };
  const root = document.createElement('div');
  document.body.appendChild(root);
  await createApp({
    components: { Inner },
    template: `<div><Inner class="a" /><Inner class="b" /></div>`,
  }).mount(root);
  await tick();
  const els = [...root.querySelectorAll('.own')];
  check('两个实例：元素数为 2', els.length === 2, `count=${els.length}`);
  check('第 1 个实例 class 只有 own a', els[0]?.className === 'own a', els[0]?.className);
  check('第 2 个实例 class 只有 own b（不继承上一个的 a）', els[1]?.className === 'own b', els[1]?.className);
}
{
  // 只传 id 时不得凭空出现 class
  const Inner = { template: `<div class="own">inner</div>` };
  const root = document.createElement('div');
  document.body.appendChild(root);
  await createApp({
    components: { Inner },
    template: `<div><Inner id="only-id" /></div>`,
  }).mount(root);
  await tick();
  const el = root.querySelector('.own');
  check('只传 id：class 保持 own（不凭空出现 class）', el?.className === 'own', el?.className);
  check('只传 id：id 已透传', el?.id === 'only-id', el?.id);
}
{
  // SSR 后再客户端渲染同一模板，不得累积（差分场景的原始形态）
  const Inner = { template: `<div class="own">inner</div>` };
  const App = { components: { Inner }, template: `<div><Inner class="passed" /></div>` };
  const ssrHtml = ssr.renderToString(h(App));
  const root = document.createElement('div');
  document.body.appendChild(root);
  await createApp(App).mount(root);
  await tick();
  const el = root.querySelector('.own');
  check(
    'SSR 之后再客户端渲染：class 不累积为 passed passed',
    el?.className === 'own passed',
    `client=${el?.className} / ssr=${norm(ssrHtml)}`,
  );
}

// ── 汇总 ──
console.log('');
if (fail === 0) {
  console.log(`✅ 通过：${total} 条一致性断言全部满足\n`);
} else {
  console.log(`❌ ${fail}/${total} 条一致性断言未满足\n`);
}
process.exit(fail === 0 ? 0 : 1);
