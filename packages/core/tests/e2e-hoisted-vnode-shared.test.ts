// @vitest-environment jsdom
/**
 * 端到端回归：静态提升（hoisted）vnode 不得跨组件实例共享 `el`。
 *
 * 编译器会把整模板静态内容提升成模块级常量，`render()` 每次返回**同一个对象**。
 * 组件实例 A / B 复用该对象时，B 挂载会把共享对象的 `el` 覆盖成 B 的 DOM；
 * 随后卸载 A 会按共享 `el` 删掉 **B 的节点**（A 自己的节点反而留下）。
 *
 * 这里手工构造提升对象（等价于 `const _hoisted_1 = createVNode(...)`），
 * 用 keyed diff 精确卸载 A、保留 B，断言留下的必须是 B 的 DOM。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, createVNode, ref, nextTick } from '../src/index';

const hosts: HTMLElement[] = [];

afterEach(() => {
  for (const el of hosts.splice(0)) el.remove();
});

async function flush(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 20));
}

describe('静态提升 vnode 跨实例共享（P0-6）', () => {
  it('卸载一个实例只能删除自己的 DOM', async () => {
    // 模块级共享对象：两个实例的 render 返回同一个 vnode。
    const hoisted = createVNode('div', { class: 'own' }, 'inner');
    const Child = { name: 'Child', render: () => hoisted };

    const showA = ref(true);
    // 直接写 vnode.key 而不经 props：key 若留在 props 里会被当成 attrs，
    // 触发 subTree 克隆路径，反而掩盖本缺陷（无 attrs 时才是共享路径）。
    const child = (key: string) => {
      const vnode = createVNode(Child);
      vnode.key = key;
      return vnode;
    };
    const App = {
      setup() {
        return { showA };
      },
      render() {
        // keyed diff：showA=false 时精确卸载 A，保留 B。
        return showA.value ? [child('a'), child('b')] : [child('b')];
      },
    };

    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);
    await createApp(App as never).mount(host);
    await flush();

    const all = Array.from(host.querySelectorAll('div.own'));
    expect(all.length).toBe(2);
    const bEl = all[1]!;

    showA.value = false;
    await flush();

    // 未修复：hoisted.el 已被 B 覆盖，卸载 A 时删掉的是 B 的节点。
    expect(bEl.isConnected).toBe(true);
    expect(host.querySelectorAll('div.own').length).toBe(1);
    expect(host.querySelector('div.own')).toBe(bEl);
  });
});
