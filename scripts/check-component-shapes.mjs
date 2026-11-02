#!/usr/bin/env node
/**
 * 组件级形态电池 check-component-shapes
 *
 * ## 为什么需要它
 *
 * 2026-11-02 连续两轮在**渲染组合**里撞出 P0（v-for 位序错位 / 整只元素重复挂载）。
 * 共同教训是：**单特性都测过 ≠ 组合测过**。
 *
 * 本门禁把同一方法用到**组件级特性**上：KeepAlive / Teleport / Transition /
 * TransitionGroup / Suspense / 异步组件 / 动态组件 / v-model / provide-inject /
 * 具名插槽 —— 每个都**单独**有测试，但「和 v-if / v-for / 状态更新组合」的形态
 * 才是用户真正会写的。
 *
 * ## 本门禁做什么
 *
 * 每条断言都问两件事：**内容对不对** + **位置对不对**（节点是否在自己的父元素内、
 * 有没有重复或逃逸）。只看 `textContent` 发现不了结构类缺陷。
 *
 * 末尾还有一组**宿主能力缺失**的健壮性断言：删掉 `globalThis.getComputedStyle`
 * 后，过渡必须立即完成而不是卡死（2026-11-02 修的真实缺陷）。
 *
 * ## 判据
 *
 * 退出码 0 = 全部形态通过。
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
// ★ jsdom 的 getComputedStyle 不会自动挂到 Node 的 globalThis 上，必须显式绑定。
//   （此前正是缺这一步，导致 Transition 的离开钩子里抛 ReferenceError —— 见末尾断言）
const originalGetComputedStyle = dom.window.getComputedStyle.bind(dom.window);
G.getComputedStyle = originalGetComputedStyle;
try {
  Object.defineProperty(G, 'navigator', { value: dom.window.navigator, configurable: true });
} catch {
  /* Node 22 的 navigator 只有 getter */
}
G.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
G.cancelAnimationFrame = (id) => clearTimeout(id);

const url = (p) => new URL(p, import.meta.url).href;
const core = await import(url('../packages/core/dist/index.mjs'));
const vdom = await import(url('../packages/vdom/dist/index.mjs'));
const { createApp, ref } = core;

const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms));
const txt = (el) => (el?.textContent ?? '').trim();
const click = (el) => el?.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

let fail = 0;
let total = 0;
const check = (name, ok, detail) => {
  total++;
  if (!ok) fail++;
  console.log(`${ok ? '   ✅' : '   ❌'} ${name}${!ok && detail ? ' :: ' + String(detail).slice(0, 200) : ''}`);
};

async function mount(component) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  await createApp(component).mount(root);
  await tick();
  return root;
}

console.log('🔍 组件级形态电池 check-component-shapes\n');

// ══════════════════════════════════════════════════════════
console.log('   [KeepAlive]');
// ══════════════════════════════════════════════════════════
{
  const which = ref('A');
  const A = {
    name: 'A',
    setup() {
      const n = ref(0);
      return { n, inc: () => n.value++ };
    },
    template: `<div class="a"><button class="inc" @click="inc">+</button><span class="n">{{n}}</span></div>`,
  };
  const B = { name: 'B', template: `<div class="b">B</div>` };
  const root = await mount({
    components: { A, B, KeepAlive: core.KeepAlive },
    setup: () => ({ which }),
    template: `<div><KeepAlive><A v-if="which==='A'" /><B v-else /></KeepAlive></div>`,
  });
  check('KeepAlive：初始渲染 A', root.querySelector('.a') !== null, root.innerHTML);
  click(root.querySelector('.inc'));
  await tick();
  click(root.querySelector('.inc'));
  await tick();
  check('KeepAlive：A 内部计数变 2', txt(root.querySelector('.n')) === '2', root.innerHTML);
  which.value = 'B';
  await tick();
  check('KeepAlive：切到 B', root.querySelector('.b') !== null, root.innerHTML);
  which.value = 'A';
  await tick();
  check('KeepAlive：切回 A 时状态保留为 2', txt(root.querySelector('.n')) === '2', root.innerHTML);
}

// ══════════════════════════════════════════════════════════
console.log('   [Teleport]');
// ══════════════════════════════════════════════════════════
{
  const target = document.createElement('div');
  target.id = 'tp-target';
  document.body.appendChild(target);
  const root = await mount({
    components: { Teleport: core.Teleport },
    template: `<div class="host"><Teleport to="#tp-target"><p class="ported">ported</p></Teleport></div>`,
  });
  check('Teleport：内容进入目标容器', target.querySelector('.ported') !== null, target.innerHTML);
  check('Teleport：宿主内没有该内容', root.querySelector('.ported') === null, root.innerHTML);
}
{
  const t2 = document.createElement('div');
  t2.id = 'tp2';
  document.body.appendChild(t2);
  const show = ref(true);
  await mount({
    components: { Teleport: core.Teleport },
    setup: () => ({ show }),
    template: `<div class="host"><Teleport v-if="show" to="#tp2"><p class="ported2">p2</p></Teleport></div>`,
  });
  check('Teleport+v-if：初始已传送', t2.querySelector('.ported2') !== null, t2.innerHTML);
  show.value = false;
  await tick();
  check('Teleport+v-if：关闭后目标容器清空', t2.querySelector('.ported2') === null, t2.innerHTML);
  show.value = true;
  await tick();
  check('Teleport+v-if：重新打开后再次传送', t2.querySelector('.ported2') !== null, t2.innerHTML);
}

// ══════════════════════════════════════════════════════════
console.log('   [Transition / TransitionGroup]');
// ══════════════════════════════════════════════════════════
{
  const show = ref(true);
  const root = await mount({
    components: { Transition: core.Transition },
    setup: () => ({ show }),
    template: `<div><Transition><p v-if="show" class="tp">t</p></Transition></div>`,
  });
  check('Transition：初始元素在', root.querySelector('.tp') !== null, root.innerHTML);
  show.value = false;
  await tick(200);
  check('Transition：关闭后元素移除', root.querySelector('.tp') === null, root.innerHTML);
  show.value = true;
  await tick(200);
  check('Transition：重新打开后元素回来', root.querySelector('.tp') !== null, root.innerHTML);
}
{
  const list = ref(['a', 'b']);
  const root = await mount({
    components: { TransitionGroup: core.TransitionGroup },
    setup: () => ({ list }),
    template: `<div><TransitionGroup tag="ul" class="tg"><li v-for="(x,i) in list" :key="x">{{x}}</li></TransitionGroup></div>`,
  });
  check('TransitionGroup：初始 2 项', root.querySelectorAll('.tg li').length === 2, root.innerHTML);
  list.value = ['a', 'b', 'c'];
  await tick(250);
  check('TransitionGroup：增到 3 项', root.querySelectorAll('.tg li').length === 3, root.innerHTML);
  list.value = ['b'];
  await tick(250);
  check('TransitionGroup：减到 1 项', root.querySelectorAll('.tg li').length === 1, root.innerHTML);
  check('TransitionGroup：无 li 逃逸', root.querySelectorAll('li').length === 1, `total=${root.querySelectorAll('li').length}`);
}

// ══════════════════════════════════════════════════════════
console.log('   [v-model]');
// ══════════════════════════════════════════════════════════
{
  const rows = ref([
    { id: 1, v: 'x' },
    { id: 2, v: 'y' },
  ]);
  const root = await mount({
    setup: () => ({ rows }),
    template: `<div><input v-for="(r,i) in rows" :key="r.id" class="in" v-model="r.v" /></div>`,
  });
  const inputs = root.querySelectorAll('.in');
  check('v-model+v-for：渲染 2 个输入框', inputs.length === 2, root.innerHTML);
  check('v-model+v-for：初始值正确', inputs[0]?.value === 'x' && inputs[1]?.value === 'y', `${inputs[0]?.value}/${inputs[1]?.value}`);
  const inp = inputs[0];
  inp.value = 'X2';
  inp.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await tick();
  check('v-model+v-for：输入回写到 state', rows.value[0].v === 'X2', JSON.stringify(rows.value));
  rows.value = [...rows.value, { id: 3, v: 'z' }];
  await tick();
  check('v-model+v-for：增长后 3 个输入框', root.querySelectorAll('.in').length === 3, root.innerHTML);
  check('v-model+v-for：无 input 逃逸', root.querySelectorAll('input').length === 3, `total=${root.querySelectorAll('input').length}`);
}
{
  const val = ref('init');
  const Child = {
    props: { modelValue: String },
    emits: ['update:modelValue'],
    template: `<input class="ci" :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
  };
  const root = await mount({
    components: { Child },
    setup: () => ({ val }),
    template: `<div><Child v-model="val" /><span class="out">{{val}}</span></div>`,
  });
  const ci = root.querySelector('.ci');
  check('组件 v-model：初始值传入', ci?.value === 'init', ci?.value);
  ci.value = 'changed';
  ci.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  await tick();
  check('组件 v-model：回写父 state', val.value === 'changed', val.value);
  check('组件 v-model：父视图更新', txt(root.querySelector('.out')) === 'changed', root.innerHTML);
}

// ══════════════════════════════════════════════════════════
console.log('   [动态组件 / 异步组件 / Suspense]');
// ══════════════════════════════════════════════════════════
{
  const which = ref('A');
  const A = { name: 'A', template: `<div class="ca">A</div>` };
  const B = { name: 'B', template: `<div class="cb">B</div>` };
  const root = await mount({
    components: { A, B },
    setup: () => ({ which }),
    template: `<div><component :is="which" /></div>`,
  });
  check('动态组件：初始 A', root.querySelector('.ca') !== null, root.innerHTML);
  which.value = 'B';
  await tick();
  check('动态组件：切到 B 且 A 已移除', root.querySelector('.cb') !== null && root.querySelector('.ca') === null, root.innerHTML);
  which.value = 'A';
  await tick();
  check('动态组件：切回 A 且 B 已移除', root.querySelector('.ca') !== null && root.querySelector('.cb') === null, root.innerHTML);
}
{
  const show = ref(false);
  const AsyncC = core.defineAsyncComponent(() =>
    Promise.resolve({ name: 'AsyncC', template: `<div class="ac">async-loaded</div>` }),
  );
  const root = await mount({
    components: { AsyncC },
    setup: () => ({ show }),
    template: `<div><AsyncC v-if="show" /></div>`,
  });
  check('异步组件：初始未加载', root.querySelector('.ac') === null, root.innerHTML);
  show.value = true;
  await tick(200);
  check('异步组件：打开后加载完成', root.querySelector('.ac') !== null, root.innerHTML);
  show.value = false;
  await tick(150);
  check('异步组件：关闭后移除', root.querySelector('.ac') === null, root.innerHTML);
}
{
  const AsyncApp = {
    name: 'AsyncApp',
    async setup() {
      await new Promise((r) => setTimeout(r, 30));
      return { msg: 'resolved' };
    },
    template: `<div class="as">{{msg}}</div>`,
  };
  const root = await mount({
    components: { AsyncApp, Suspense: core.Suspense },
    template: `<div><Suspense><AsyncApp /></Suspense></div>`,
  });
  await tick(250);
  check('Suspense：异步 setup 完成后渲染内容', txt(root.querySelector('.as')) === 'resolved', root.innerHTML);
}

// ══════════════════════════════════════════════════════════
console.log('   [provide / inject]');
// ══════════════════════════════════════════════════════════
{
  const theme = ref('light');
  const Child = {
    setup() {
      const t = core.inject('theme');
      return { t };
    },
    // 注意：setup 返回的 ref 在模板里会**自动解包**，所以写 `{{ t }}` 而不是 `{{ t.value }}`
    template: `<span class="th">{{ t }}</span>`,
  };
  const Parent = {
    components: { Child },
    setup() {
      core.provide('theme', theme);
      return {};
    },
    template: `<div><Child /></div>`,
  };
  const root = await mount(Parent);
  check('provide/inject：初始值', txt(root.querySelector('.th')) === 'light', root.innerHTML);
  theme.value = 'dark';
  await tick();
  check('provide/inject：响应式更新', txt(root.querySelector('.th')) === 'dark', root.innerHTML);
}

// ══════════════════════════════════════════════════════════
console.log('   [插槽 / 子组件 / 错误边界]');
// ══════════════════════════════════════════════════════════
{
  const show = ref(false);
  const list = ref(['a']);
  const Box = { template: `<div class="box"><slot /></div>` };
  const root = await mount({
    components: { Box },
    setup: () => ({ show, list }),
    template: `<div><Box><p v-if="show" class="s">s</p><ul class="l"><li v-for="(x,i) in list" :key="i">{{x}}</li></ul></Box></div>`,
  });
  show.value = true;
  await tick();
  list.value = ['a', 'b'];
  await tick();
  check('插槽内 v-if+v-for：p 出现', root.querySelector('.s') !== null, root.innerHTML);
  check('插槽内 v-if+v-for：li 2 个且在 ul 内', root.querySelector('ul.l')?.querySelectorAll('li').length === 2, root.innerHTML);
  check('插槽内 v-if+v-for：无 li 逃逸', root.querySelectorAll('li').length === 2, `total=${root.querySelectorAll('li').length}`);
}
{
  const list = ref(['a']);
  const Card = { template: `<div class="card"><header><slot name="head" /></header><main><slot /></main></div>` };
  const root = await mount({
    components: { Card },
    setup: () => ({ list }),
    template: `<div><Card><template #head><b class="h">H</b></template><ul class="l"><li v-for="(x,i) in list" :key="i">{{x}}</li></ul></Card></div>`,
  });
  check('具名插槽：head 渲染', root.querySelector('.h') !== null, root.innerHTML);
  list.value = ['a', 'b', 'c'];
  await tick();
  check('具名插槽：默认插槽内列表增长到 3', root.querySelector('ul.l')?.querySelectorAll('li').length === 3, root.innerHTML);
  check('具名插槽：无 li 逃逸', root.querySelectorAll('li').length === 3, `total=${root.querySelectorAll('li').length}`);
}
{
  const n = ref(0);
  const Child = { props: { n: Number }, template: `<span class="cn">{{n}}</span>` };
  const root = await mount({
    components: { Child },
    setup: () => ({ n }),
    template: `<div><Child :n="n" /></div>`,
  });
  n.value = 5;
  await tick();
  check('子组件 props：更新为 5', txt(root.querySelector('.cn')) === '5', root.innerHTML);
  n.value = 9;
  await tick();
  check('子组件 props：再更新为 9', txt(root.querySelector('.cn')) === '9', root.innerHTML);
}
{
  let captured = null;
  const Bad = {
    name: 'Bad',
    setup() {
      throw new Error('boom');
    },
    template: `<div>bad</div>`,
  };
  const Boundary = {
    components: { Bad },
    setup() {
      core.onErrorCaptured((err) => {
        captured = err?.message ?? String(err);
        return false;
      });
      return {};
    },
    template: `<div class="bd"><Bad /></div>`,
  };
  await mount(Boundary);
  check('onErrorCaptured：捕获子组件 setup 抛错', captured !== null, String(captured));
}

// ══════════════════════════════════════════════════════════
console.log('   [组件 v-for + keyed 重排（状态跟随 key）]');
// ══════════════════════════════════════════════════════════
{
  const items = ref([
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
  ]);
  const Row = {
    props: { label: String },
    setup() {
      const clicks = ref(0);
      return { clicks, bump: () => clicks.value++ };
    },
    template: `<li class="row"><button class="rb" @click="bump">+</button><span class="lb">{{label}}</span><span class="ck">{{clicks}}</span></li>`,
  };
  const root = await mount({
    components: { Row },
    setup: () => ({ items }),
    template: `<ul class="l"><Row v-for="it in items" :key="it.id" :label="it.label" /></ul>`,
  });
  const btns = root.querySelectorAll('.rb');
  click(btns[0]);
  await tick();
  click(btns[0]);
  await tick();
  check(
    '组件 v-for：A 行点击计数 2',
    root.querySelectorAll('.ck')[0]?.textContent === '2',
    [...root.querySelectorAll('.ck')].map((e) => e.textContent).join(','),
  );
  items.value = [
    { id: 'b', label: 'B' },
    { id: 'a', label: 'A' },
  ];
  await tick();
  const labels = [...root.querySelectorAll('.lb')].map((e) => e.textContent?.trim()).join(',');
  check('组件 v-for 重排：顺序变 B,A', labels === 'B,A', labels);
  const clicks = [...root.querySelectorAll('.ck')].map((e) => e.textContent?.trim()).join(',');
  check('组件 v-for 重排：状态跟随 key（A 的计数 2 移到第二行）', clicks === '0,2', clicks);
  check('组件 v-for 重排：无 li 逃逸', root.querySelectorAll('li.row').length === 2, `total=${root.querySelectorAll('li.row').length}`);
}

// ══════════════════════════════════════════════════════════
console.log('   [宿主能力缺失：无 getComputedStyle]');
// ══════════════════════════════════════════════════════════
{
  // ★ 2026-11-02 修的真实缺陷：`getTransitionInfoDOM` 裸调 `getComputedStyle`，
  //   该全局不存在时抛 ReferenceError，错误发生在**离开钩子**里 ⇒
  //   元素永远停在 `*-leave-active *-leave-to` 上、永不移除（实测）。
  //   现在约定：拿不到计算样式 ⇒ 视为「无过渡」⇒ 立即完成。
  delete G.getComputedStyle;

  const el = document.createElement('p');
  document.body.appendChild(el);
  let info = null;
  let threw = null;
  try {
    info = vdom.getTransitionInfoDOM(el, 'leave');
  } catch (e) {
    threw = e.message;
  }
  check('无 getComputedStyle：getTransitionInfoDOM 不抛错', threw === null, threw);
  check(
    '无 getComputedStyle：按「无过渡/无动画」返回',
    info !== null && info.hasTransition === false && info.hasAnimation === false && info.duration === 0,
    JSON.stringify(info),
  );

  const show = ref(true);
  const root = await mount({
    components: { Transition: core.Transition },
    setup: () => ({ show }),
    template: `<div><Transition><p v-if="show" class="tp2">t</p></Transition></div>`,
  });
  show.value = false;
  await tick(200);
  check('无 getComputedStyle：Transition 离开在 200ms 内完成（不卡死）', root.querySelector('.tp2') === null, root.innerHTML);

  G.getComputedStyle = originalGetComputedStyle;
}

// ── 汇总 ──
console.log('');
if (fail === 0) {
  console.log(`✅ 通过：${total} 条组件级形态断言全部正确\n`);
} else {
  console.log(`❌ ${fail}/${total} 条组件级形态断言失败\n`);
}
process.exit(fail === 0 ? 0 : 1);
