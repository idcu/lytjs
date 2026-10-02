// @vitest-environment jsdom
/**
 * 端到端判据：内置组件（`<Teleport>`）在客户端 **vnode 模式**真跑
 *
 * ## 缺陷（2026-10-02 探针实测）
 *
 * 模板与渲染函数里用 `<Teleport>` / `<Suspense>` / `<Transition>`，
 * **一律渲染为空**（`innerHTML === ""`），连**纯同步内容**也一样。
 *
 * 根因是「分派键两侧不是同一个标识」：
 * · vdom 的 `getShapeFlag` 比较 `type === Teleport`，而那个 `Teleport` 是
 *   **`Symbol.for('Teleport')`**；
 * · 而模板 / 渲染函数里拿到的 `@lytjs/component` 导出的 `Teleport` 是
 *   **组件对象**（`ComponentOptions`）——名字相同、**引用不同**；
 * · 对象不匹配 ⇒ 落进 `STATEFUL_COMPONENT` ⇒ `mountComponent` 找不到 `render`
 *   ⇒ 静默渲染为空。
 *
 * ⚠️ 基础设施本身是好的：普通用户组件走同一条模板路径**完全正常**
 * （`components` 注册与 `setup` 返回两种都work）——所以这不是模板系统的问题。
 *
 * 修法：组件声明 `__vnodeType`（= 那个符号），`getShapeFlag` 据此产出与
 * 「直接用符号」完全一致的 shapeFlag ⇒ 复用 vdom 既有的 `mountTeleport` /
 * `patchTeleport` 分派，**不绕过**它的机制。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, Teleport } from '../src/index';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

function newHost(): HTMLElement {
  const host = document.createElement('div');
  document.body.appendChild(host);
  hosts.push(host);
  return host;
}

async function flush(ms = 40): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

describe('端到端：内置组件 <Teleport>', () => {
  it('★ 模板里的 <Teleport> 应把内容搬进目标容器', async () => {
    const target = document.createElement('div');
    target.id = 'tgt-tmpl';
    document.body.appendChild(target);

    const host = newHost();
    await createApp({
      setup: () => ({ Teleport }),
      template: '<Teleport to="#tgt-tmpl"><div id="a">A</div></Teleport>',
    } as never).mount(host);
    await flush();

    // 判别点：内容必须在**目标容器**里，且原位置只剩注释占位
    expect(target.querySelector('#a')?.textContent).toBe('A');
    expect(host.querySelector('#a')).toBeNull();
    document.body.removeChild(target);
  });

  it('渲染函数里 h(Teleport) 同样应被分派', async () => {
    const target = document.createElement('div');
    target.id = 'tgt-render';
    document.body.appendChild(target);

    const host = newHost();
    await createApp({
      render: () => h(Teleport as never, { to: '#tgt-render' }, [h('div', { id: 'b' }, 'B')]),
    } as never).mount(host);
    await flush();

    expect(target.querySelector('#b')?.textContent).toBe('B');
    expect(host.querySelector('#b')).toBeNull();
    document.body.removeChild(target);
  });

  it('Teleport disabled 时内容留在原处', async () => {
    const host = newHost();
    await createApp({
      setup: () => ({ Teleport }),
      template: '<Teleport to="#nope-not-exist" disabled><div id="c">C</div></Teleport>',
    } as never).mount(host);
    await flush();

    // disabled ⇒ 不搬走，内容留在原容器
    expect(host.querySelector('#c')?.textContent).toBe('C');
  });

  it('对照组：普通元素模板不受影响（回归守卫）', async () => {
    const host = newHost();
    await createApp({ template: '<div id="p">PLAIN</div>' } as never).mount(host);
    await flush();
    expect(host.querySelector('#p')?.textContent).toBe('PLAIN');
  });
});
