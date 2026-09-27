// @vitest-environment jsdom
/**
 * KeepAlive 端到端门禁（真实渲染链：createApp → @lytjs/adapter-web → @lytjs/vdom）
 *
 * ## 为什么需要这个文件
 *
 * KeepAlive 此前只有 `.workbuddy` 所述的**单元测试**（`component/tests/keep-alive.test.ts`），
 * 它只验证 `cacheInstance` / `activateInstance` / `deactivateInstance` 这些**辅助函数**，
 * **没有一条**通过真实渲染器验证「切换组件 → 旧组件被停用保留 → 切回复用同一实例」。
 *
 * 而 keep-alive.ts 的注释一度声称「消费点已在 vdom 补齐」，实测 vdom 里
 * `COMPONENT_KEPT_ALIVE` / `COMPONENT_SHOULD_KEEP_ALIVE` **零引用** ⇒
 * KeepAlive 退化为 pass-through（切换即销毁、状态丢失）。
 *
 * 本文件把「真实组件切换」这条链路固定下来，断言的是**最终页面上能看到什么**
 * 以及**子组件实例/钩子的真实行为**，而不是中间产物形状。
 *
 * ⚠️ 维护约定：改动 KeepAlive / vdom 的 mount-unmount 分支后，务必重跑本文件。
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createApp, h, ref } from '../src/index';
import type { VNode } from '@lytjs/vdom';
import { KeepAlive } from '@lytjs/component';

const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const host of hosts.splice(0)) host.remove();
});

/** 让 watchEffect / 调度器把首次与后续渲染刷完 */
async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

type AnyComp = Record<string, unknown>;

describe('KeepAlive 端到端（真实渲染链）', () => {
  it('切换子组件：旧组件被停用保留（不销毁），切回复用同一实例且状态保留', async () => {
    const events: string[] = [];
    let aSetupCount = 0;
    let bSetupCount = 0;
    let aCountBox: { value: number } | null = null;

    const ChildA: AnyComp = {
      name: 'ChildA',
      setup() {
        aSetupCount++;
        const count = ref(0);
        aCountBox = count as unknown as { value: number };
        // 注意：用「字符串子节点」而非「数组含裸字符串」——后者在 vdom 的
        // ARRAY_CHILDREN 挂载路径下不渲染（独立预存缺陷，与本文件无关）。
        return () => h('div', { id: 'a' }, `A:${count.value}`);
      },
      activated() {
        events.push('a:activated');
      },
      deactivated() {
        events.push('a:deactivated');
      },
    };

    const ChildB: AnyComp = {
      name: 'ChildB',
      setup() {
        bSetupCount++;
        return () => h('div', { id: 'b' }, 'B');
      },
      activated() {
        events.push('b:activated');
      },
      deactivated() {
        events.push('b:deactivated');
      },
    };

    const which = ref<'a' | 'b'>('a');

    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);

    const app = createApp({
      setup() {
        return () =>
          h(
            KeepAlive as unknown as AnyComp,
            null,
            {
              default: () => [which.value === 'a' ? h(ChildA) : h(ChildB)],
            } as never,
          ) as VNode;
      },
    });

    app.mount(host);
    await flush();

    // ① 初次渲染：ChildA 挂载
    expect(host.innerHTML).toContain('A:0');
    expect(aSetupCount).toBe(1);

    // ② 修改 ChildA 内部状态（用于稍后验证「状态是否保留」）
    aCountBox!.value = 5;
    await flush();
    expect(host.innerHTML).toContain('A:5');

    // ③ 切到 ChildB：ChildA 应被**停用保留**（触发 deactivated），而不是销毁
    which.value = 'b';
    await flush();
    expect(host.innerHTML).toContain('>B<');
    expect(host.innerHTML).not.toContain('A:5');
    expect(events).toContain('a:deactivated');
    expect(bSetupCount).toBe(1);

    // ④ 切回 ChildA：应**复用同一实例**（setup 不再执行）+ 触发 activated + 状态保留
    which.value = 'a';
    await flush();
    expect(host.innerHTML).toContain('A:5');
    expect(aSetupCount).toBe(1);
    expect(events).toContain('a:activated');
  });

  it('两组件反复切换：全程只各 setup 一次（缓存命中）', async () => {
    let aSetupCount = 0;
    let bSetupCount = 0;

    const ChildA: AnyComp = {
      name: 'ChildA',
      setup() {
        aSetupCount++;
        return () => h('div', { id: 'a' }, 'A');
      },
    };
    const ChildB: AnyComp = {
      name: 'ChildB',
      setup() {
        bSetupCount++;
        return () => h('div', { id: 'b' }, 'B');
      },
    };

    const which = ref<'a' | 'b'>('a');
    const host = document.createElement('div');
    document.body.appendChild(host);
    hosts.push(host);

    const app = createApp({
      setup() {
        return () =>
          h(
            KeepAlive as unknown as AnyComp,
            null,
            {
              default: () => [which.value === 'a' ? h(ChildA) : h(ChildB)],
            } as never,
          ) as VNode;
      },
    });

    app.mount(host);
    await flush();
    expect(host.innerHTML).toContain('>A<');

    for (let i = 0; i < 3; i++) {
      which.value = 'b';
      await flush();
      expect(host.innerHTML).toContain('>B<');
      which.value = 'a';
      await flush();
      expect(host.innerHTML).toContain('>A<');
    }

    // 全程缓存命中 ⇒ 两个子组件各自只 setup 一次
    expect(aSetupCount).toBe(1);
    expect(bSetupCount).toBe(1);
  });
});
