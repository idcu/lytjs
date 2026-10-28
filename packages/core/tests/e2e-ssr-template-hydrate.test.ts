// @vitest-environment jsdom
/**
 * 端到端门禁：**模板写法的组件** 走完 SSR → hydrate → 更新 的整条链。
 *
 * ## 为什么需要这个文件
 *
 * 仓内已有两条相邻的电池：
 *   · `e2e-template-render.test.ts` —— 模板 → 客户端首帧（23 例）
 *   · `e2e-render-update.test.ts`  —— 客户端首帧 → 更新（17 例）
 *   · `e2e-hydration.test.ts`      —— SSR → 水合（4 例）
 *
 * 但第三条**全部用 `render()` 手写 vnode**，前两条**不碰 SSR**。
 * 于是「用模板写的组件能不能在服务端渲染出来」这件事，**一条用例都没覆盖**。
 *
 * 实测（2026-10-28）它不是「覆盖不足」，而是**整条链断了**：
 *
 * ```
 * { setup() { return { msg: ref('hi') } }, render: … }  → <div id="app"><span>hi</span></div>
 * { setup() { return { msg: ref('hi') } }, template: … } → ""      ← 空串，无报错
 * ```
 *
 * 同一个组件对象，客户端能渲染、服务端渲染成空 —— 这正是本仓反复出现的
 * 「**静默**」缺陷：SSR 页面白屏，而开发者在浏览器里看到的是正常内容。
 *
 * ## 判据设计
 *
 * 每条用例四问，缺一不可：
 *   ① **服务端有产物**（`html` 非空且含预期文本）—— 旧行为在这里就是 `""`；
 *   ② **水合复用旧节点**（`#app` 还是 SSR 那个 DOM 节点，不是重新渲染的一份）；
 *   ③ **事件接上**（点击真的改状态）；
 *   ④ **更新落在被认领的旧节点上**（不是「重新渲染出一份一样的」）。
 *
 * 只有 ②③④ 而没有 ① 时，`renderToString` 返回空串、客户端再从零渲染，
 * 「页面看起来对」但 SSR 完全没起作用 —— 这种形态最难发现。
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApp, renderToString, renderToStream, nextTick } from '../src/index';
import { createVNode } from '@lytjs/vdom';
import { renderToString as rendererRenderToString } from '@lytjs/renderer';
import { ref, reactive, computed } from '@lytjs/reactivity';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
  vi.restoreAllMocks();
});

async function flush(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

/** 把 SSR 产物塞进容器，返回容器与「SSR 根节点」 */
function ssrHost(html: string, rootSelector = '#app'): { host: HTMLElement; ssrRoot: Element } {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  hosts.push(host);
  const ssrRoot = host.querySelector(rootSelector);
  if (!ssrRoot) throw new Error(`SSR 产物里没有 ${rootSelector}：${JSON.stringify(html)}`);
  return { host, ssrRoot };
}

/** SSR 一个组件，返回 HTML */
function ssr(comp: unknown, props: Record<string, unknown> = {}): Promise<string> {
  return renderToString({ vnode: createVNode(comp as never, props) as never });
}

describe('模板组件的 SSR（★ 旧行为：全部渲染成空串）', () => {
  it('setup 返回的 ref 要出现在 SSR 产物里', async () => {
    const Comp = {
      setup() {
        return { msg: ref('hi') };
      },
      template: '<div id="app"><span>{{ msg }}</span></div>',
    };

    const html = await ssr(Comp);

    expect(html).not.toBe('');
    expect(html).toContain('<span>hi</span>');
  });

  it('选项式 data() 要出现在 SSR 产物里', async () => {
    const Comp = {
      data() {
        return { n: 3 };
      },
      template: '<p id="app">{{ n }}</p>',
    };

    const html = await ssr(Comp);

    expect(html).toContain('>3<');
  });

  it('methods 调用要能取到 data（ctx 得是真上下文，不是空对象）', async () => {
    const Comp = {
      data() {
        return { n: 2 };
      },
      methods: {
        double(this: { n: number }) {
          return this.n * 2;
        },
      },
      template: '<p id="app">{{ double() }}</p>',
    };

    const html = await ssr(Comp);

    expect(html).toContain('>4<');
  });

  it('computed 要能参与渲染', async () => {
    const Comp = {
      setup() {
        const n = ref(5);
        const sq = computed(() => n.value * n.value);
        return { n, sq };
      },
      template: '<p id="app">{{ sq }}</p>',
    };

    const html = await ssr(Comp);

    expect(html).toContain('>25<');
  });

  it('v-for 要展开成多个节点', async () => {
    const Comp = {
      setup() {
        return { list: ['a', 'b', 'c'] };
      },
      template: '<ul id="app"><li v-for="x in list">{{ x }}</li></ul>',
    };

    const html = await ssr(Comp);

    expect((html.match(/<li>/g) ?? []).length).toBe(3);
    expect(html).toContain('<li>c</li>');
  });

  it('v-if / v-else 要按条件取一支', async () => {
    const yes = {
      setup() {
        return { ok: true };
      },
      template: '<div id="app"><p v-if="ok">Y</p><p v-else>N</p></div>',
    };
    const no = {
      setup() {
        return { ok: false };
      },
      template: '<div id="app"><p v-if="ok">Y</p><p v-else>N</p></div>',
    };

    expect(await ssr(yes)).toContain('>Y<');
    expect(await ssr(no)).toContain('>N<');
  });

  it('嵌套的子组件（同样用模板写）也要渲染出来', async () => {
    const Child = { template: '<i>child</i>' };
    const Parent = {
      components: { Child },
      template: '<div id="app"><Child /></div>',
    };

    const html = await ssr(Parent);

    expect(html).toContain('<i>child</i>');
  });

  it('同一组件 SSR 两次，产物必须一致（编译缓存不得串味）', async () => {
    const Comp = {
      setup() {
        return { msg: ref('x') };
      },
      template: '<div id="app">{{ msg }}</div>',
    };

    const a = await ssr(Comp);
    const b = await ssr(Comp);

    expect(a).toBe(b);
    expect(a).toContain('>x<');
  });

  it('流式入口（core 的 renderToStream）同样支持模板组件', async () => {
    // 流式入口与 `renderToString` 共用同一段组件解析（`resolveFromSetupResult`），
    // 所以这条不是重复覆盖，而是**钉住「两个入口不许漂移」**。
    const Comp = {
      setup() {
        return { msg: ref('streamed') };
      },
      template: '<div id="app"><b>{{ msg }}</b></div>',
    };

    const stream = (await renderToStream({
      vnode: createVNode(Comp as never) as never,
    })) as ReadableStream<Uint8Array>;

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let html = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) html += decoder.decode(value, { stream: true });
    }

    expect(html).toContain('<b>streamed</b>');
  });

  it('直接调 renderer 且未注入编译器时，必须 DEV 告警而不是静默空串', async () => {
    // ⚠️ 这里刻意用 **renderer 的** `renderToString`：core 的入口会自己注入编译器，
    //   那样就测不到「未注入」这条路径了。
    const { setTemplateCompiler } = await import('@lytjs/component');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    setTemplateCompiler(null as never);
    try {
      const Comp = { template: '<div id="app">x</div>' };
      const html = await rendererRenderToString({
        vnode: createVNode(Comp as never) as never,
      });

      expect(html).toBe('');
      const said = warnSpy.mock.calls.map((c) => String(c[0])).join('\n');
      expect(said).toMatch(/template/i);
      // 告警必须**可操作**（写出怎么修），否则等于没说
      expect(said).toMatch(/@lytjs\/core|setTemplateCompiler/);
    } finally {
      warnSpy.mockRestore();
      // 不需要手动恢复：core 的 `renderToString` 用 `getTemplateCompiler()` 判空，
      // 下一次调用会自动重新注入（若用模块级布尔标记则会永久失效 ⇒ 假绿）。
    }
  });
});

describe('模板组件的 SSR → hydrate → 更新（端到端）', () => {
  it('★ 全链路：复用 SSR 节点、事件接上、更新落在旧节点上', async () => {
    const count = ref(0);
    const Comp = {
      setup() {
        return { count };
      },
      template:
        '<div id="app"><span class="c">count={{ count }}</span><button @click="count++">inc</button></div>',
    };

    const html = await ssr(Comp);
    expect(html).toContain('count=0');

    const { host, ssrRoot } = ssrHost(html);

    await createApp(Comp as never).mount(host, { hydrate: true });
    await flush();

    // ② 复用而非重建
    expect(host.querySelectorAll('#app').length).toBe(1);
    expect(host.querySelector('#app')).toBe(ssrRoot);

    // ③ 事件接上
    const button = host.querySelector('button');
    expect(button).not.toBeNull();
    button!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await flush();

    // ④ 更新落在被认领的旧节点上（若退化成重新渲染，旧节点会停在 count=0）
    expect(ssrRoot.textContent).toContain('count=1');
    expect(host.querySelectorAll('#app').length).toBe(1);
  });

  it('v-model 在 SSR 产物里要带上初值（否则水合瞬间输入框是空的）', async () => {
    const msg = ref('hello');
    const Comp = {
      setup() {
        return { msg };
      },
      template: '<div id="app"><input v-model="msg" /><p>{{ msg }}</p></div>',
    };

    const html = await ssr(Comp);
    // SSR 出来的 input 必须带 value，否则首屏闪空
    expect(html).toMatch(/<input[^>]*value="hello"/);

    const { host } = ssrHost(html);
    await createApp(Comp as never).mount(host, { hydrate: true });
    await flush();

    const input = host.querySelector('input')!;
    expect(input.value).toBe('hello');

    // 水合后输入 → 数据 → 再次渲染
    input.value = 'typed';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await flush();
    expect(host.querySelector('p')!.textContent).toBe('typed');
  });

  it('列表水合后增删要复用既有节点（keyed 列表）', async () => {
    const list = reactive(['a', 'b']);
    const Comp = {
      setup() {
        return { list };
      },
      template: '<ul id="app"><li v-for="x in list" :key="x">{{ x }}</li></ul>',
    };

    const html = await ssr(Comp);
    expect((html.match(/<li>/g) ?? []).length).toBe(2);

    const { host, ssrRoot } = ssrHost(html);
    const firstLi = ssrRoot.querySelector('li');

    await createApp(Comp as never).mount(host, { hydrate: true });
    await flush();

    // 水合后未改动 ⇒ 原有 li 身份不变
    expect(ssrRoot.querySelector('li')).toBe(firstLi);

    list.push('c');
    await flush();
    expect(ssrRoot.querySelectorAll('li').length).toBe(3);
    expect(ssrRoot.textContent).toContain('c');
  });
});
