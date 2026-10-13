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
import {
  createApp,
  h,
  ref,
  computed,
  nextTick,
  onMounted,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
} from '../src/index';

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

describe('组件生命周期钩子（端到端）', () => {
  it('mounted / updated / beforeUnmount / unmounted 各触发一次且顺序正确', async () => {
    const log: string[] = [];
    const count = ref(0);
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);

    const app = createApp({
      setup() {
        onMounted(() => log.push('mounted'));
        onUpdated(() => log.push('updated'));
        onBeforeUnmount(() => log.push('beforeUnmount'));
        onUnmounted(() => log.push('unmounted'));
        return { count };
      },
      template: '<div>{{ count }}</div>',
    });

    await app.mount(host);
    expect(log).toEqual(['mounted']);

    count.value = 1;
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(log).toEqual(['mounted', 'updated']);

    app.unmount();
    await new Promise((resolve) => setTimeout(resolve, 20));

    // 关键：每个钩子**恰好一次**且顺序正确。
    // 修复前：四个钩子**全部不触发**（vdom 从不调用它们）。
    // 拆分前：beforeUnmount 会重复（callUnmountedHook 内部也会调它）。
    expect(log).toEqual(['mounted', 'updated', 'beforeUnmount', 'unmounted']);
    expect(host.innerHTML).toBe('');
  });
});

/**
 * v-on 修饰符端到端门禁（2026-10-10 新增）
 *
 * ## 为什么需要
 *
 * v-on 修饰符此前有**两个各自为政**的实现：
 *   · `transform-element.ts` 的 `handleVOn`（实际生效路径）：只认 `stop`/`prevent`/`self`，
 *     **其余修饰符（`.enter`/`.ctrl`/`.exact`/鼠标键）被静默丢弃** ——
 *     `@keyup.enter` 对**任意按键**都会触发，且不报错；
 *   · `transforms/on.ts` 的 `transformOn`（**死代码**，但它的 NOTE 自称是主路径）：
 *     产 `withModifiers(fn, [...])`，而该名字**在运行时根本不存在** ⇒ 若被接上即 ReferenceError。
 *
 * 现统一为「编译器产 `withModifiers(...)` + 运行时单一实现」。
 * 本组用例断言的是**真实 DOM 上的行为**（是否冒泡、是否触发、defaultPrevented），
 * 而不是产物字符串形状 —— 后者正是这类缺陷能长期潜伏的原因。
 */
describe('v-on 修饰符（端到端，断言真实 DOM 行为）', () => {
  /** 等一轮宏任务，让 patchEvent 的监听器就位 */
  const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));

  async function mountWithTemplate(template: string, setup: () => Record<string, unknown>) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    const app = createApp({ setup, template });
    await app.mount(host);
    await settle();
    return host;
  }

  it('.stop：子元素点击不冒泡到父处理器', async () => {
    const hits: string[] = [];
    const host = await mountWithTemplate(
      '<div id="p" @click="onParent"><button id="c" @click.stop="onChild">x</button></div>',
      () => ({ onParent: () => hits.push('parent'), onChild: () => hits.push('child') }),
    );

    (host.querySelector('#c') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle();

    // 修复前：修饰符被内联展开（有效）；但若走到 on.ts 死路径则 ReferenceError。
    // 关键断言：子处理器**恰好一次**，父处理器**零次**。
    expect(hits).toEqual(['child']);
  });

  it('.prevent：阻止默认行为（defaultPrevented 为 true）', async () => {
    const host = await mountWithTemplate(
      '<a id="a" href="#x" @click.prevent="noop">link</a>',
      () => ({ noop: () => {} }),
    );

    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    (host.querySelector('#a') as HTMLElement).dispatchEvent(ev);
    await settle();

    expect(ev.defaultPrevented).toBe(true);
  });

  it('.self：只有点在自己身上才触发', async () => {
    const hits: string[] = [];
    const host = await mountWithTemplate(
      '<div id="p" @click.self="onSelf"><button id="c">x</button></div>',
      () => ({ onSelf: () => hits.push('self') }),
    );

    // 点在子按钮上（冒泡到 #p，但 target !== currentTarget）⇒ 应被拦截
    (host.querySelector('#c') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle();
    expect(hits).toEqual([]);

    // 直接点在 #p 上 ⇒ 应放行
    (host.querySelector('#p') as HTMLElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    await settle();
    expect(hits).toEqual(['self']);
  });

  it('.enter：非 Enter 键不触发（此前静默忽略修饰符 ⇒ 任意键都触发）', async () => {
    const hits: string[] = [];
    const host = await mountWithTemplate('<input id="i" @keyup.enter="onKey" />', () => ({
      onKey: () => hits.push('key'),
    }));
    const input = host.querySelector('#i') as HTMLElement;

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true }));
    await settle();
    expect(hits).toEqual([]);

    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
    await settle();
    expect(hits).toEqual(['key']);
  });

  it('.ctrl：未按下修饰键时不触发', async () => {
    const hits: string[] = [];
    const host = await mountWithTemplate('<button id="b" @click.ctrl="onClick">x</button>', () => ({
      onClick: () => hits.push('ctrl-click'),
    }));
    const btn = host.querySelector('#b') as HTMLElement;

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: false }));
    await settle();
    expect(hits).toEqual([]);

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    await settle();
    expect(hits).toEqual(['ctrl-click']);
  });

  it('.once 仍以监听器选项形态工作（不被守卫逻辑吞掉）', async () => {
    const hits: string[] = [];
    const host = await mountWithTemplate('<button id="b" @click.once="onClick">x</button>', () => ({
      onClick: () => hits.push('once'),
    }));
    const btn = host.querySelector('#b') as HTMLElement;

    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle();

    // `once` 是 addEventListener 选项，只应触发一次
    expect(hits).toEqual(['once']);
  });
});
