#!/usr/bin/env node
/* eslint-disable no-undef -- 本脚本刻意在裸 Node 里模拟浏览器全局（见文件头注释） */
/**
 * scripts/check-runtime-render.mjs
 *
 * **门禁：真的执行编译产物**。
 *
 * ## 为什么需要它（2026-10-31 新增）
 *
 * 本仓 1628 条编译器用例断言的是**字符串片段**，没有一条把产物跑起来。
 * 于是「产物是语法错误 / 引用不存在的变量 / 引用了宿主没有的全局」能一路穿过门禁：
 *
 * - `v-html` 产物引用 `__DEV__`，而 `new Function` 作用域里没有它
 *   ⇒ 浏览器里 `ReferenceError`，**测试里永远看不到**（vitest 有 `define:{__DEV__:true}`）。
 * - `v-if` 链把后续兄弟节点吞掉 ⇒ 产物"合法"，只是内容没了。
 * - void 元素不闭合 ⇒ 后续兄弟成了它的子节点。
 *
 * 本脚本在**裸 Node（无 `__DEV__` 全局、无 vitest define）**里挂载真实模板并断言 DOM，
 * 尽量贴近浏览器条件。判据是 DOM 文本，不是产物字符串。
 *
 * 退出码：0 = 全部通过；1 = 有失败（打印实际 DOM）。
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
  /* 某些 Node 版本 navigator 只读，忽略 */
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const CORE = new URL('../packages/core/dist/index.mjs', import.meta.url).href;
const { createApp } = await import(CORE);

/** [名称, 模板, data, 必须出现的片段, 必须不出现的片段] */
const CASES = [
  ['v-html', '<div><span v-html="raw"></span></div>', { raw: '<b>B</b>' }, ['<b>B</b>'], []],
  [
    'v-if 链后接兄弟',
    '<div><p v-if="ok">A</p><p v-else>B</p><span>X</span></div>',
    { ok: true },
    ['<p>A</p>', '<span>X</span>'],
    ['<p>B</p>'],
  ],
  [
    'v-if 链假分支',
    '<div><p v-if="ok">A</p><p v-else>B</p><span>X</span></div>',
    { ok: false },
    ['<p>B</p>', '<span>X</span>'],
    ['<p>A</p>'],
  ],
  ['void 元素', '<div><img src="x"><p>after</p></div>', {}, ['<img src="x">', '<p>after</p>'], []],
  ['CDATA', '<div><![CDATA[x > y]]><p>p</p></div>', {}, ['x &gt; y', '<p>p</p>'], []],
  ['模板字符串', '<div>{{ `hi ${name}` }}</div>', { name: 'z' }, ['hi z'], []],
  [
    'v-for + v-if 同元素',
    '<ul><li v-for="i in 3" v-if="i > 1" :key="i">{{ i }}</li></ul>',
    {},
    ['<li>2</li>', '<li>3</li>'],
    ['<li>1</li>'],
  ],
];

const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));
let failed = 0;

console.log('\n🔍 运行时渲染守卫 check-runtime-render\n');
console.log('   在裸 Node（无 __DEV__ / 无 vitest define）里挂载模板并断言真实 DOM\n');

for (const [name, template, data, mustHave, mustNotHave] of CASES) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  try {
    await createApp({ template, data: () => ({ ...data }) }).mount(root);
    await tick();
    const html = root.innerHTML;
    const missing = mustHave.filter((frag) => !html.includes(frag));
    const unexpected = mustNotHave.filter((frag) => html.includes(frag));
    if (missing.length || unexpected.length) {
      failed++;
      console.log(`   ❌ ${name}`);
      console.log(`      实际 DOM: ${html}`);
      if (missing.length) console.log(`      缺少: ${JSON.stringify(missing)}`);
      if (unexpected.length) console.log(`      多出: ${JSON.stringify(unexpected)}`);
    } else {
      console.log(`   ✅ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(
      `   ❌ ${name} —— 挂载抛错: ${e?.constructor?.name}: ${String(e?.message).split('\n')[0]}`,
    );
  }
}

if (failed === 0) {
  console.log(`\n✅ 通过：${CASES.length}/${CASES.length} 条模板在裸 Node 里渲染正确\n`);
  process.exit(0);
}
console.log(`\n❌ 失败：${failed}/${CASES.length} 条\n`);
process.exit(1);
