// @vitest-environment jsdom
/**
 * 端到端判据：函数式组件（`defineFunctionalComponent`）真跑
 *
 * ## 背景（2026-10-04 实测）
 *
 * 本仓的 `FUNCTIONAL_COMPONENT` shapeFlag **从未被设置** —— 函数式组件走的是
 * 「stateful 包装」路径：`defineFunctionalComponent` 把渲染函数包成一个
 * 带 `setup()` 的组件对象，由 `handleSetupResult` 把该函数赋给 `instance.render`。
 * 此前我担心这条路径是坏的，**实测证明它是好的**（见下方 ★ 用例）。
 *
 * 真正的缺陷是另一个：**`@lytjs/core` 没转出 `defineFunctionalComponent`**
 * ⇒ 从 `@lytjs/core` 导入拿到 `undefined`，实测报
 * 「defineFunctionalComponent is not a function」。
 * 而用户从「门面包」导入组件 API 是最自然的用法。
 *
 * 另注：`defineFunctionalComponent` 返回的对象上带一个 `__isFunctional: true` 标记，
 * 目前**没有任何代码读它** ⇒ 与本仓其它「孤儿品牌标记」同构，属可清理项，
 * 但不影响功能（判据里不断言它的存在）。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, defineFunctionalComponent } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const x of hosts.splice(0)) x.remove();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

async function flush(ms = 40): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

describe('端到端：函数式组件', () => {
  it('core 应转出 defineFunctionalComponent（此前拿到 undefined）', () => {
    expect(typeof defineFunctionalComponent).toBe('function');
  });

  it('★ 带 props 的函数式组件应渲染出真实 props 值', async () => {
    const host = newHost();
    const Func = defineFunctionalComponent(
      (props: Record<string, unknown>) => h('span', { id: 'f' }, 'msg=' + String(props.msg)),
      { msg: { type: String, default: 'hi' } },
    );

    await createApp({
      components: { Func },
      template: '<div><Func msg="hello" /></div>',
    } as never).mount(host);
    await flush();

    // 判别点：props 真的传进了渲染函数（旧行为是 undefined / 报错）
    expect(host.querySelector('#f')?.textContent).toBe('msg=hello');
  });

  it('已知缺口：未传 prop 时 default **未生效**（修好时此用例会红）', async () => {
    const host = newHost();
    const Func = defineFunctionalComponent(
      (props: Record<string, unknown>) => h('span', { id: 'd' }, 'msg=' + String(props.msg)),
      { msg: { type: String, default: 'fallback' } },
    );

    await createApp({
      components: { Func },
      template: '<div><Func /></div>',
    } as never).mount(host);
    await flush();

    // ⚠️ 实测：`defineFunctionalComponent` 声明的 `default` **不会被应用**
    //   （stateful 包装路径直接返回渲染函数，未走 props 解析/默认值填充）
    //   ⇒ 这是「声明了但没生效」的 API，属待消减缺口。
    expect(host.querySelector('#d')?.textContent).toBe('msg=undefined');
  });
});
