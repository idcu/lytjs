#!/usr/bin/env node
/**
 * 模板形态电池 check-render-shapes
 *
 * ## 为什么需要它
 *
 * 2026-11-02 连续撞出两个 P0，都出自 vdom 的「Block Tree 快速路径」，
 * 且**都在 8432 个用例 + 12 项门禁下存活**：
 *
 *   ① v-for 列表从空变非空时，`<li>` 被挂到 `<ul>` 外面（位序错位）
 *   ② 结构变化时整只 `<ul>` 被**重复挂载**（静态子节点丢失 `el`）
 *
 * 两者触发形态都极其普通：
 *
 *   ① `<div><h1>t</h1><ul><li v-for></ul><button @click="x">b</button></div>`
 *   ② `<div><p>{{n}}</p><ul><li v-for></ul><span>{{n*2}}</span></div>`
 *      —— 先改 n，再改列表
 *
 * 共同点：**单看每个特性都测过**（v-for 单独测、插值单独测、v-if 单独测），
 * 但**组合起来**的形态没有覆盖。现有 check-integration 的 v-for 用例都是
 * 「首帧就非空」的列表，恰好绕开缺陷。
 *
 * ## 本门禁做什么
 *
 * 用「真实用户会写的模板」逐条驱动**多次更新**，断言 DOM 结构正确。
 * 每条断言都问两个问题：
 *   · 内容对不对（文本/数量）
 *   · **位置对不对**（节点是否在自己的父元素内，有没有重复/逃逸）
 *
 * 第二个问题正是前两个 P0 的形态 —— 只看 `textContent` 是发现不了的。
 *
 * ## 判据
 *
 * 退出码 0 = 全部形态通过。
 */
import { JSDOM } from '../node_modules/jsdom/lib/api.js';

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
  /* Node 22 的 navigator 只有 getter */
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const url = (p) => new URL(p, import.meta.url).href;
const { createApp, ref, computed } = await import(url('../packages/core/dist/index.mjs'));

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));

let fail = 0;
let total = 0;
const check = (name, ok, detail) => {
  total++;
  if (!ok) fail++;
  console.log(`${ok ? '   ✅' : '   ❌'} ${name}${!ok && detail ? ' :: ' + String(detail).slice(0, 200) : ''}`);
};

/** 挂载模板；state 由调用方传入（不覆盖组件自身的 setup） */
async function mount(template, state, extra = {}) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  await createApp({ ...extra, setup: () => state, template }).mount(root);
  await tick();
  return root;
}

const txt = (el) => (el?.textContent ?? '').trim();
const liTexts = (root, sel = 'li') => [...root.querySelectorAll(sel)].map(txt).join('');

console.log('🔍 模板形态电池 check-render-shapes\n');

// ══════════════════════════════════════════════════════════
console.log('   [v-for 与动态兄弟]');
// ══════════════════════════════════════════════════════════
{
  // P0① 的原始形态
  const items = ref([]);
  const root = await mount(
    `<div class="w"><h1>t</h1><ul class="l"><li v-for="(x,i) in items" :key="i">{{x}}</li></ul><button @click="()=>{}">b</button></div>`,
    { items },
  );
  items.value = ['a', 'b'];
  await tick();
  check('v-for 空→2 + 旁边有按钮：li 全在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 2, root.innerHTML);
  check('v-for：无 li 逃逸到 ul 外', root.querySelectorAll('li').length === 2, `total=${root.querySelectorAll('li').length}`);
}
{
  // P0② 的原始形态：插值 + 列表 + 插值
  const n = ref(0);
  const list = ref([]);
  const root = await mount(
    `<div><p class="n">{{n}}</p><ul class="l"><li v-for="(x,i) in list" :key="i">{{x}}</li></ul><span class="dbl">{{n*2}}</span></div>`,
    { n, list },
  );
  n.value = 3;
  await tick();
  check('插值+列表+插值：先改插值 n', txt(root.querySelector('p.n')) === '3', root.innerHTML);
  check('插值+列表+插值：先改插值 n*2', txt(root.querySelector('span.dbl')) === '6', root.innerHTML);
  list.value = ['a'];
  await tick();
  check('插值+列表+插值：再改列表后 li 在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 1, root.innerHTML);
  check('插值+列表+插值：ul 没有被重复挂载', root.querySelectorAll('ul.l').length === 1, `ul 数=${root.querySelectorAll('ul.l').length}`);
  check('插值+列表+插值：无 li 逃逸', root.querySelectorAll('li').length === 1, `total=${root.querySelectorAll('li').length}`);
  check('插值+列表+插值：插值仍正确', txt(root.querySelector('p.n')) === '3' && txt(root.querySelector('span.dbl')) === '6', root.innerHTML);
}

// ══════════════════════════════════════════════════════════
console.log('   [多列表 / 嵌套列表]');
// ══════════════════════════════════════════════════════════
{
  const a = ref(['a1']);
  const b = ref(['b1']);
  const root = await mount(
    `<div><ul class="ua"><li v-for="(x,i) in a" :key="i">{{x}}</li></ul><ul class="ub"><li v-for="(y,i) in b" :key="i">{{y}}</li></ul></div>`,
    { a, b },
  );
  b.value = ['b1', 'b2', 'b3'];
  await tick();
  check('并列两列表：只增长的那个变 3', root.querySelector('ul.ub')?.querySelectorAll('li').length === 3, root.innerHTML);
  check('并列两列表：另一个仍 1', root.querySelector('ul.ua')?.querySelectorAll('li').length === 1, root.innerHTML);
  check('并列两列表：无 li 逃逸', root.querySelectorAll('li').length === 4, `total=${root.querySelectorAll('li').length}`);
}
{
  const groups = ref([{ name: 'g1', items: ['x'] }]);
  const root = await mount(
    `<div><section v-for="(grp,gi) in groups" :key="gi" class="g"><h2>{{grp.name}}</h2><ul class="inner"><li v-for="(it,ii) in grp.items" :key="ii">{{it}}</li></ul></section></div>`,
    { groups },
  );
  groups.value = [{ name: 'g1', items: ['x', 'y', 'z'] }];
  await tick();
  check('嵌套 v-for：内层增长到 3 且在 ul 内', root.querySelector('ul.inner')?.querySelectorAll('li').length === 3, root.innerHTML);
  check('嵌套 v-for：无 li 逃逸', root.querySelectorAll('li').length === 3, `total=${root.querySelectorAll('li').length}`);
}
{
  const first = ref(['f1']);
  const second = ref([]);
  const root = await mount(
    `<div><ul class="l"><li v-for="(x,i) in first" :key="'f'+i" class="f">{{x}}</li><li v-for="(y,i) in second" :key="'s'+i" class="s">{{y}}</li></ul></div>`,
    { first, second },
  );
  second.value = ['s1', 's2'];
  await tick();
  check('同一 ul 内两段 v-for：第一段仍 1', root.querySelectorAll('li.f').length === 1, root.innerHTML);
  check('同一 ul 内两段 v-for：第二段变 2', root.querySelectorAll('li.s').length === 2, root.innerHTML);
  check('同一 ul 内两段 v-for：都留在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 3, `total=${root.querySelectorAll('li').length}`);
}

// ══════════════════════════════════════════════════════════
console.log('   [v-if 与 v-for 混合]');
// ══════════════════════════════════════════════════════════
{
  const show = ref(false);
  const list = ref(['a']);
  const root = await mount(
    `<div><p v-if="show" class="p">shown</p><ul class="l"><li v-for="(x,i) in list" :key="i">{{x}}</li></ul></div>`,
    { show, list },
  );
  show.value = true;
  await tick();
  check('v-if 打开：p 出现', txt(root.querySelector('p.p')) === 'shown', root.innerHTML);
  check('v-if 打开：li 仍在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 1, root.innerHTML);
  list.value = ['a', 'b'];
  await tick();
  check('v-if 打开后再增长列表：2 项在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 2, root.innerHTML);
  check('v-if + v-for：无 li 逃逸', root.querySelectorAll('li').length === 2, `total=${root.querySelectorAll('li').length}`);
}
{
  const ok = ref(true);
  const root = await mount(
    `<div><div v-if="ok" class="yes"><span>Y</span></div><div v-else class="no"><b>N</b></div></div>`,
    { ok },
  );
  check('v-if/v-else：初始 yes 含 span', root.querySelector('.yes span') !== null, root.innerHTML);
  ok.value = false;
  await tick();
  check('v-if/v-else：切到 no 含 b', root.querySelector('.no b') !== null, root.innerHTML);
  check('v-if/v-else：yes 已移除', root.querySelector('.yes') === null, root.innerHTML);
  ok.value = true;
  await tick();
  check('v-if/v-else：切回 yes 含 span', root.querySelector('.yes span') !== null, root.innerHTML);
}
{
  const mode = ref('single');
  const items = ref(['a', 'b']);
  const root = await mount(
    `<div><p v-if="mode==='single'" class="one">one</p><ul v-else class="many"><li v-for="(x,i) in items" :key="i">{{x}}</li></ul></div>`,
    { mode, items },
  );
  check('单节点→列表：初始单节点', txt(root.querySelector('.one')) === 'one', root.innerHTML);
  mode.value = 'list';
  await tick();
  check('单节点→列表：2 个 li 在 ul 内', root.querySelector('ul.many')?.querySelectorAll('li').length === 2, root.innerHTML);
  check('单节点→列表：无 li 逃逸', root.querySelectorAll('li').length === 2, `total=${root.querySelectorAll('li').length}`);
  mode.value = 'single';
  await tick();
  check('单节点→列表：切回单节点', txt(root.querySelector('.one')) === 'one', root.innerHTML);
}
{
  const rows = ref([{ id: 1, on: false, label: 'r1' }]);
  const root = await mount(
    `<div><ul class="l"><li v-for="(r,i) in rows" :key="r.id"><span class="lbl">{{r.label}}</span><em v-if="r.on" class="on">ON</em></li></ul></div>`,
    { rows },
  );
  check('列表项内 v-if：初始无 em', root.querySelector('em.on') === null, root.innerHTML);
  rows.value = [{ id: 1, on: true, label: 'r1' }];
  await tick();
  check('列表项内 v-if：打开后 em 出现', root.querySelector('em.on') !== null, root.innerHTML);
  check('列表项内 v-if：兄弟 span 仍在 li 内', root.querySelector('li .lbl') !== null, root.innerHTML);
  rows.value = [
    { id: 1, on: true, label: 'r1' },
    { id: 2, on: false, label: 'r2' },
  ];
  await tick();
  check('列表项内 v-if：行增长到 2 且在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 2, root.innerHTML);
  check('列表项内 v-if：无 li 逃逸', root.querySelectorAll('li').length === 2, `total=${root.querySelectorAll('li').length}`);
}
{
  const show = ref(false);
  const list = ref(['a', 'b']);
  const root = await mount(
    `<div><ul v-if="show" class="l"><li v-for="(x,i) in list" :key="i">{{x}}</li></ul><p v-else class="empty">empty</p></div>`,
    { show, list },
  );
  check('条件列表：初始显示 empty', txt(root.querySelector('.empty')) === 'empty', root.innerHTML);
  show.value = true;
  await tick();
  check('条件列表：打开后 2 个 li 在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 2, root.innerHTML);
  list.value = ['a', 'b', 'c'];
  await tick();
  check('条件列表：之后再增长到 3', root.querySelector('ul.l')?.querySelectorAll('li').length === 3, root.innerHTML);
  check('条件列表：无 li 逃逸', root.querySelectorAll('li').length === 3, `total=${root.querySelectorAll('li').length}`);
}

// ══════════════════════════════════════════════════════════
console.log('   [列表增删重排]');
// ══════════════════════════════════════════════════════════
{
  const items = ref([
    { id: 'a', v: 'A' },
    { id: 'b', v: 'B' },
    { id: 'c', v: 'C' },
  ]);
  const root = await mount(
    `<div><ul class="l"><li v-for="it in items" :key="it.id">{{it.v}}</li></ul></div>`,
    { items },
  );
  check('keyed 重排：初始 ABC', liTexts(root) === 'ABC', liTexts(root));
  items.value = [
    { id: 'c', v: 'C' },
    { id: 'a', v: 'A' },
    { id: 'b', v: 'B' },
  ];
  await tick();
  check('keyed 重排：变 CAB', liTexts(root) === 'CAB', liTexts(root));
  check('keyed 重排：仍在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 3, `total=${root.querySelectorAll('li').length}`);
}
{
  const list = ref([]);
  const root = await mount(
    `<div><ul class="l"><li v-for="(x,i) in list" :key="i">{{x}}</li></ul><button @click="()=>{}">b</button></div>`,
    { list },
  );
  list.value = ['1', '2', '3'];
  await tick();
  check('数量往返：0→3', root.querySelector('ul.l')?.querySelectorAll('li').length === 3, root.innerHTML);
  list.value = ['1'];
  await tick();
  check('数量往返：3→1', root.querySelector('ul.l')?.querySelectorAll('li').length === 1, root.innerHTML);
  list.value = ['1', '2'];
  await tick();
  check('数量往返：1→2', root.querySelector('ul.l')?.querySelectorAll('li').length === 2, root.innerHTML);
  check('数量往返：三轮后无 li 逃逸', root.querySelectorAll('li').length === 2, `total=${root.querySelectorAll('li').length}`);
}
{
  const list = ref([]);
  const root = await mount(`<div><ul class="l"><li v-for="x in list">{{x}}</li></ul></div>`, { list });
  list.value = ['p', 'q'];
  await tick();
  check('无 key 的 v-for：空→2 且在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 2, root.innerHTML);
  check('无 key 的 v-for：无 li 逃逸', root.querySelectorAll('li').length === 2, `total=${root.querySelectorAll('li').length}`);
}
{
  const obj = ref({ a: '1' });
  const root = await mount(
    `<div><ul class="l"><li v-for="(v,k) in obj" :key="k">{{k}}={{v}}</li></ul></div>`,
    { obj },
  );
  obj.value = { a: '1', b: '2' };
  await tick();
  check('对象 v-for：增长到 2 且在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 2, root.innerHTML);
  check('对象 v-for：无 li 逃逸', root.querySelectorAll('li').length === 2, `total=${root.querySelectorAll('li').length}`);
}

// ══════════════════════════════════════════════════════════
console.log('   [组件 / 插槽 / computed]');
// ══════════════════════════════════════════════════════════
{
  const list = ref(['x']);
  const Item = { props: { label: String }, template: `<li class="it">{{label}}</li>` };
  const root = await mount(
    `<div><ul class="l"><Item v-for="(x,i) in list" :key="i" :label="x" /></ul></div>`,
    { list },
    { components: { Item } },
  );
  list.value = ['x', 'y'];
  await tick();
  check('组件 v-for：增长到 2 且在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li.it').length === 2, root.innerHTML);
  check('组件 v-for：无 li 逃逸', root.querySelectorAll('li.it').length === 2, `total=${root.querySelectorAll('li.it').length}`);
}
{
  const list = ref(['s1']);
  const Box = { template: `<div class="box"><slot /></div>` };
  const root = await mount(
    `<div><Box><ul class="l"><li v-for="(x,i) in list" :key="i">{{x}}</li></ul></Box></div>`,
    { list },
    { components: { Box } },
  );
  list.value = ['s1', 's2', 's3'];
  await tick();
  check('插槽内 v-for：增长到 3 且在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 3, root.innerHTML);
  check('插槽内 v-for：无 li 逃逸', root.querySelectorAll('li').length === 3, `total=${root.querySelectorAll('li').length}`);
}
{
  const all = ref(['a', 'bb', 'ccc']);
  const root = document.createElement('div');
  document.body.appendChild(root);
  await createApp({
    template: `<div><ul class="l"><li v-for="(x,i) in long" :key="i">{{x}}</li></ul></div>`,
    setup() {
      const long = computed(() => all.value.filter((s) => s.length > 1));
      return { long };
    },
  }).mount(root);
  await tick();
  check('computed 列表：初始 2 项', root.querySelector('ul.l')?.querySelectorAll('li').length === 2, root.innerHTML);
  all.value = ['a', 'bb', 'ccc', 'dddd'];
  await tick();
  check('computed 列表：变 3 项且在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 3, root.innerHTML);
  check('computed 列表：无 li 逃逸', root.querySelectorAll('li').length === 3, `total=${root.querySelectorAll('li').length}`);
}

// ══════════════════════════════════════════════════════════
console.log('   [其他指令]');
// ══════════════════════════════════════════════════════════
{
  const vis = ref(true);
  const root = await mount(`<div><p v-show="vis" class="p">hi</p></div>`, { vis });
  check('v-show：初始可见', root.querySelector('p.p')?.style.display !== 'none', root.querySelector('p.p')?.style.display);
  vis.value = false;
  await tick();
  check('v-show：关闭后元素仍在', root.querySelector('p.p') !== null, root.innerHTML);
  check('v-show：关闭后 display=none', root.querySelector('p.p')?.style.display === 'none', root.querySelector('p.p')?.style.display);
}
{
  const html = ref('<b>one</b>');
  const root = await mount(`<div><div class="h" v-html="html"></div></div>`, { html });
  check('v-html：初始渲染 b', root.querySelector('.h b') !== null, root.innerHTML);
  html.value = '<i>two</i>';
  await tick();
  check('v-html：更新为 i', root.querySelector('.h i') !== null, root.innerHTML);
  check('v-html：旧内容已移除', root.querySelector('.h b') === null, root.innerHTML);
}
{
  const list = ref([]);
  const root = await mount(
    `<div class="a"><section class="b"><div class="c"><ul class="d"><li v-for="(x,i) in list" :key="i">{{x}}</li></ul></div></section><button @click="()=>{}">btn</button></div>`,
    { list },
  );
  list.value = ['deep'];
  await tick();
  check('深层嵌套：li 在 ul.d 内', root.querySelector('ul.d')?.querySelectorAll('li').length === 1, root.innerHTML);
  check('深层嵌套：无 li 逃逸', root.querySelectorAll('li').length === 1, `total=${root.querySelectorAll('li').length}`);
}

// ── 汇总 ──
console.log('');
if (fail === 0) {
  console.log(`✅ 通过：${total} 条形态断言全部正确\n`);
} else {
  console.log(`❌ ${fail}/${total} 条形态断言失败\n`);
}
process.exit(fail === 0 ? 0 : 1);
