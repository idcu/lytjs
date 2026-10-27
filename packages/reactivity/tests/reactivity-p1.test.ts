/**
 * 响应式内核的三条 P1 回归（2026-10-27）
 *
 * 三条都是「能跑、不报错，但语义错了」——只断言「拿到一个值」的测试永远发现不了：
 *
 * 1. **数组重排类方法不通知按下标收集的依赖**：`sort/reverse/fill/copyWithin`
 *    不改变长度，此前只 `trigger(ADD, ITERATE_KEY)` ⇒ 只读过 `arr[0]` 的 effect 不重跑。
 * 2. **`run()` 前不 `cleanupEffect`**：条件分支切换后旧依赖仍持有该 effect
 *    ⇒ 无关 state 变化也会触发它（deps 只增不减）。
 * 3. **`computed` 返回 `undefined` 时不写缓存却置 clean** ⇒ 后续读到**旧值**。
 */

import { describe, it, expect, vi } from 'vitest';
import { reactive, effect, computed, ref } from '../src/index';

describe('数组重排类方法（P1 回归）', () => {
  it('sort 后按下标收集的依赖必须重跑', () => {
    const arr = reactive([3, 1, 2]);
    const seen: number[] = [];

    effect(() => {
      seen.push(arr[0] as number);
    });

    expect(seen).toEqual([3]);

    arr.sort((a, b) => a - b); // 期望变成 [1,2,3]

    expect(seen).toEqual([3, 1]);
  });

  it('reverse 后同样要通知', () => {
    const arr = reactive([1, 2, 3]);
    const seen: number[] = [];
    effect(() => {
      seen.push(arr[0] as number);
    });

    arr.reverse();
    expect(seen).toEqual([1, 3]);
  });

  it('元素没变时不应产生多余的触发', () => {
    const arr = reactive([1, 2, 3]);
    const spy = vi.fn();
    effect(() => {
      spy(arr[0]);
    });
    spy.mockClear();

    arr.sort((a, b) => a - b); // 已有序，没有任何下标变化

    expect(spy).not.toHaveBeenCalled();
  });

  it('length 依赖仍要通知（fill 不改变长度，但元素变了）', () => {
    const arr = reactive([1, 2, 3]);
    const seen: number[] = [];
    effect(() => {
      seen.push(arr.length);
    });

    arr.fill(0);
    // 注：`trigger` 对**数组整数键的 SET** 也会连带通知 `length` 依赖
    // （effect.ts 的 `type === 'set' && isIntegerKey` 分支），而 fill 会改 3 个下标
    // ⇒ 这里会收到多次通知。**多次通知不是缺陷**（重跑是安全的），
    // 关键判据是「至少通知了一次，且最后一次看到的是正确长度」。
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.at(-1)).toBe(3);
  });
});

describe('effect 依赖重建（P1 回归）', () => {
  it('条件分支切换后，旧分支的依赖不应再触发', async () => {
    const state = reactive({ flag: true, a: 1, b: 2 });
    const spy = vi.fn();

    effect(() => {
      // 只读其中一个字段
      spy(state.flag ? state.a : state.b);
    });
    expect(spy).toHaveBeenCalledTimes(1);

    // 切到 b 分支：此后 a 不再是依赖
    state.flag = false;
    expect(spy).toHaveBeenCalledTimes(2);

    // 改 a 不应再触发
    state.a = 100;
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(2);

    // 改 b 仍应触发
    state.b = 200;
    await Promise.resolve();
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('反复切换不应让依赖数量无限增长', async () => {
    const state = reactive({ flag: true, a: 1, b: 2 });
    const spy = vi.fn();
    effect(() => {
      spy(state.flag ? state.a : state.b);
    });

    // 切换 6 次（偶数）⇒ 最终仍在 a 分支
    for (let i = 0; i < 6; i++) {
      state.flag = !state.flag;
      await Promise.resolve();
    }
    const afterSwitch = spy.mock.calls.length;

    // 只改当前分支依赖的字段，只应触发一次（旧依赖若未清理会触发两次以上）
    state.a = 999;
    await Promise.resolve();
    expect(spy.mock.calls.length).toBe(afterSwitch + 1);
  });
});

describe('computed 的 undefined 缓存（P1 回归）', () => {
  it('getter 返回 undefined 时必须缓存 undefined，而不是旧值', () => {
    const n = ref(1);
    const c = computed(() => (n.value > 0 ? n.value : undefined));

    expect(c.value).toBe(1);

    n.value = 0;
    expect(c.value).toBeUndefined();

    n.value = 2;
    expect(c.value).toBe(2);
  });

  it('始终返回 undefined 的 computed 不应重复计算', () => {
    const spy = vi.fn(() => undefined);
    const c = computed(spy);

    expect(c.value).toBeUndefined();
    expect(c.value).toBeUndefined();
    expect(c.value).toBeUndefined();

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
