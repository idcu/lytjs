// @vitest-environment jsdom
/**
 * `list-diff` 的 `opsId` 贯通。
 *
 * 背景：`createRenderer()` 每次都会 `registerDOMOperations()` 并返回一个 `symbol`
 * （`ctx.opsId`），用于**多渲染器隔离** —— 同一个进程里同时存在 DOM 渲染器、
 * SSR / 自定义宿主渲染器时，keyed diff 必须用**自己那一个**的 patch/unmount/move。
 *
 * 缺陷：`patch-children.ts` 调用 `patchKeyedChildren` 时，把 `ctx.opsId` 传到了
 * **`hostOrUndefined` 的形参位置**（第 8 个），真正的 `opsId`（第 9 个）恒为
 * `undefined`。后果两条，且都不报错：
 *
 * 1. `getDOMOps(undefined)` 走「向后兼容」分支 ⇒ **取最后一个注册的 ops**
 *    ⇒ 多渲染器下 diff 的 move/unmount 落到**别的渲染器**的 host 上；
 * 2. DEV 下每次 keyed diff 都打一条 `getDOMOps() called without opsId` 告警
 *    —— 一条指向框架内部的噪声，用户无从下手。
 *
 * 本文件的两条用例分别钉住这两点：**行为**（ops 路由到自己的 host）与**噪声**（不告警）。
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { WebRendererHost } from '@lytjs/adapter-web';
import { createRenderer } from '../src/patch';
import { createVNode } from '../src/vnode';

function list(keys: string[]) {
  return createVNode(
    'ul',
    null,
    keys.map((k) => createVNode('li', { key: k }, k)),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('list-diff · opsId 贯通', () => {
  it('多渲染器：keyed diff 的移动必须落在**自己**的 host 上，不能落到最后注册的那个', () => {
    // A 先注册
    const hostA = new WebRendererHost();
    const rendererA = createRenderer(hostA);

    // B 后注册 —— 缺陷下 `getDOMOps(undefined)` 会取到 B
    const hostB = new WebRendererHost();
    createRenderer(hostB);

    const insertA = vi.spyOn(hostA, 'insert');
    const insertB = vi.spyOn(hostB, 'insert');

    const container = document.createElement('div');
    document.body.appendChild(container);

    // 首帧：a b c
    const v1 = list(['a', 'b', 'c']);
    rendererA.patch(null, v1, container as unknown as HTMLElement, null);

    insertA.mockClear();
    insertB.mockClear();

    // 重排：c a b —— key 变了，走完整 keyed diff，必然发生 move
    rendererA.patch(v1, list(['c', 'a', 'b']), container as unknown as HTMLElement, null);

    // 断言 1：移动真的发生了（否则这条用例对路由没有分辨力）
    expect(insertA).toHaveBeenCalled();
    // 断言 2：绝不能借用 B 的 host
    expect(insertB).not.toHaveBeenCalled();

    // 断言 3：DOM 顺序正确（行为层面的最终判据）
    const texts = Array.from(container.querySelectorAll('li')).map((el) => el.textContent);
    expect(texts).toEqual(['c', 'a', 'b']);
  });

  it('keyed diff 不应打 `without opsId` 告警（每次列表更新都刷一条指向内部的噪声）', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const host = new WebRendererHost();
    const renderer = createRenderer(host);
    const insert = vi.spyOn(host, 'insert');
    const container = document.createElement('div');
    document.body.appendChild(container);

    const v1 = list(['a', 'b', 'c']);
    renderer.patch(null, v1, container as unknown as HTMLElement, null);
    renderer.patch(v1, list(['c', 'a', 'b']), container as unknown as HTMLElement, null);

    // 对照：先确认这一帧**真的**走到了 diff 的 move 分支（否则「没告警」毫无分辨力 ——
    // 一条从不执行 diff 的用例同样不会告警）
    expect(insert).toHaveBeenCalled();

    const opsIdWarnings = warnSpy.mock.calls.filter((args) =>
      String(args[0] ?? '').includes('without opsId'),
    );
    expect(opsIdWarnings).toEqual([]);
  });
});
