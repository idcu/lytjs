// @vitest-environment jsdom
/**
 * 端到端模板渲染门禁（VNode 模式）
 *
 * ## 为什么需要这个文件
 *
 * 2026-09-26 的全维度审计发现：本仓有 740 个编译器测试全绿，
 * **却没有一条断言执行过产物** —— 全是 `toContain('createBlock')` /
 * `toBeDefined()` 这类「形状断言」。后果是一整条链路可以**静默失效**：
 *
 *   · `createApp({ setup, template })`（README 首个示例）渲染空白且不报错；
 *   · 产物 `return openBlock()⏎createBlock(...)` 被 ASI 断句、返回 undefined；
 *   · 编译 preamble import 的 helper 在运行时**根本不存在**；
 *   · `:class` / 多插值 / `v-if` / `v-for` 的产物各有语法或语义错误。
 *
 * 本文件把「写模板 → 挂载 → **断言真实 DOM 文本**」这条链路固定下来：
 * 每个用例都走完整的 `createApp` + 运行时模板编译 + patch，
 * 断言的是**最终页面上能看到什么**，而不是中间产物长什么样。
 *
 * ⚠️ 维护约定：新增指令 / 新渲染能力时，请在此补一条**可观测断言**，
 * 而不要只在 compiler 的产字符串上加断言。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, ref, computed } from '../src/index';

/** 统一的挂载辅助：创建宿主、挂载、返回 innerHTML */
async function mountAndGetHtml(options: Record<string, unknown>): Promise<string> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  const instance = createApp(options as never);
  const ret = instance.mount(host);
  if (ret && typeof (ret as Promise<unknown>).then === 'function') {
    await ret;
  }
  // 让 watchEffect / 调度器把首次渲染刷完
  await new Promise((resolve) => setTimeout(resolve, 20));
  return host.innerHTML;
}

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

describe('端到端模板渲染（VNode 模式）', () => {
  it('README 首个示例：setup + template + ref/computed', async () => {
    const html = await mountAndGetHtml({
      setup() {
        const count = ref(0);
        const doubled = computed(() => count.value * 2);
        return { count, doubled };
      },
      template: '<div>{{ count }} x 2 = {{ doubled }}</div>',
    });
    // 关键：ref 必须被自动解包（否则会渲染出 Ref 对象的 JSON）
    expect(html).toBe('<div>0 x 2 = 0</div>');
    expect(html).not.toContain('__v_isRef');
  });

  it('单个插值：普通值', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { msg: 'hi' };
      },
      template: '<div>{{ msg }}</div>',
    });
    expect(html).toBe('<div>hi</div>');
  });

  it('同元素多个插值必须全部保留（且以 + 正确拼接）', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { a: 1, b: 2 };
      },
      template: '<div>{{ a }} {{ b }}</div>',
    });
    expect(html).toBe('<div>1 2</div>');
  });

  it('纯静态模板（静态提升路径）', async () => {
    const html = await mountAndGetHtml({
      template: '<div class="box"><p>static</p></div>',
    });
    expect(html).toBe('<div class="box"><p>static</p></div>');
  });

  it('v-if：条件为真时渲染分支内容', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { ok: true };
      },
      template: '<div><span v-if="ok">Y</span></div>',
    });
    expect(html).toBe('<div><span>Y</span></div>');
  });

  it('v-if / v-else：互斥分支', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { ok: false };
      },
      template: '<div><span v-if="ok">Y</span><span v-else>N</span></div>',
    });
    expect(html).toBe('<div><span>N</span></div>');
  });

  it('v-for：列表必须真的渲染出每一项（箭头函数体需 return）', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { items: [{ n: 'a' }, { n: 'b' }] };
      },
      template: '<ul><li v-for="i in items">{{ i.n }}</li></ul>',
    });
    expect(html).toBe('<ul><li>a</li><li>b</li></ul>');
  });

  it('v-show：仅切换 display', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { visible: true };
      },
      template: '<div v-show="visible">x</div>',
    });
    expect(html).toContain('x');
  });

  it(':class 对象语法', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { on: true };
      },
      template: '<div :class="{ on: on }">x</div>',
    });
    expect(html).toBe('<div class="on">x</div>');
  });

  it('@click 事件绑定', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { f() {} };
      },
      template: '<button @click="f">b</button>',
    });
    expect(html).toBe('<button>b</button>');
  });

  it('父子组件：components 选项 + props + template', async () => {
    const html = await mountAndGetHtml({
      components: { Child: { props: ['msg'], template: '<em>{{ msg }}</em>' } },
      template: '<div><Child msg="hi-child" /><span>sibling</span></div>',
    });
    expect(html).toBe('<div><em>hi-child</em><span>sibling</span></div>');
  });

  it('子组件用 render 函数（与 template 等价）', async () => {
    const html = await mountAndGetHtml({
      components: { Child: { render: () => h('em', null, 'child') } },
      template: '<div><Child /></div>',
    });
    expect(html).toBe('<div><em>child</em></div>');
  });

  it('嵌套 vnode 作为 children 不得丢失（h 与编译产物同路径）', async () => {
    const html = await mountAndGetHtml({
      render: () => h('div', null, h('p', null, 'nested')),
    });
    expect(html).toBe('<div><p>nested</p></div>');
  });

  it('options.render 优先于 template', async () => {
    const html = await mountAndGetHtml({
      render: () => h('span', null, 'from-render'),
      template: '<div>from-template</div>',
    });
    expect(html).toBe('<span>from-render</span>');
  });

  it('v-html：必须消毒且不得出现 [object Object]', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { raw: '<b>bold</b>' };
      },
      template: '<div v-html="raw"></div>',
    });
    expect(html).not.toContain('[object Object]');
    expect(html).toContain('bold');
  });

  it('v-once：产物不得因 ASI 而语法错误', async () => {
    const html = await mountAndGetHtml({
      setup() {
        return { msg: 'once' };
      },
      template: '<div v-once>{{ msg }}</div>',
    });
    expect(html).toBe('<div>once</div>');
  });
});
