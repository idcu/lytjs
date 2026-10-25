// @vitest-environment node
/**
 * 行为级判据：`@lytjs/core-vnode` 的 Composition 辅助（`src/composition.ts`，67 行）
 *
 * ## 为什么要有这条
 *
 * 覆盖率 **9.1%**（44 条语句里 40 条空档）。`useSlots` / `useAttrs` / `useModel` 是
 * `@lytjs/core-vnode` 对外承诺的 Composition API 入口，却一条判据都没有。
 *
 * 空档里的不一致：`useSlots` / `useAttrs` 在「没有活动实例」时都会 DEV 告警并返回空对象，
 * 而 `useModel` **静默**返回一个永远读 `undefined`、写入被吞掉的 computed ——
 * 用户拿到的是一个"能调、不报错、永远不生效"的对象，最难查。本电池把它对齐。
 *
 * ## 手法
 *
 * 三个函数都只依赖 `getCurrentInstance()`：用 `setCurrentInstance` 造/撤上下文即可，
 * 不需要渲染器。`useModel` 的写入路径断言的是**副作用**（`instance.emit` 收到什么）。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setCurrentInstance } from '@lytjs/component';
import { useSlots, useAttrs, useModel } from '../src/composition';

function makeInstance(over: Record<string, unknown> = {}) {
  return {
    slots: { default: () => ['slot-child'] },
    attrs: { id: 'app', 'data-x': 1 },
    emit: vi.fn(),
    ...over,
  };
}

const withInstance = <T>(instance: Record<string, unknown> | null, fn: () => T): T => {
  setCurrentInstance(instance as never);
  try {
    return fn();
  } finally {
    setCurrentInstance(null);
  }
};

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  setCurrentInstance(null);
  vi.restoreAllMocks();
});

// ==================== useSlots ====================

describe('useSlots', () => {
  it('在 setup 内返回实例的 slots（同一引用）', () => {
    const inst = makeInstance();

    const slots = withInstance(inst, () => useSlots());

    expect(slots).toBe(inst.slots);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('实例没有 slots 时返回空对象（不抛）', () => {
    const inst = makeInstance({ slots: undefined });

    expect(withInstance(inst, () => useSlots())).toEqual({});
  });

  it('★ 无活动实例 ⇒ 返回空对象并 DEV 告警', () => {
    const slots = withInstance(null, () => useSlots());

    expect(slots).toEqual({});
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('useSlots');
  });
});

// ==================== useAttrs ====================

describe('useAttrs', () => {
  it('在 setup 内返回实例的 attrs（同一引用）', () => {
    const inst = makeInstance();

    const attrs = withInstance(inst, () => useAttrs());

    expect(attrs).toBe(inst.attrs);
    expect(attrs).toEqual({ id: 'app', 'data-x': 1 });
  });

  it('实例没有 attrs 时返回空对象', () => {
    const inst = makeInstance({ attrs: undefined });

    expect(withInstance(inst, () => useAttrs())).toEqual({});
  });

  it('★ 无活动实例 ⇒ 返回空对象并 DEV 告警', () => {
    const attrs = withInstance(null, () => useAttrs());

    expect(attrs).toEqual({});
    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('useAttrs');
  });
});

// ==================== useModel ====================

describe('useModel', () => {
  it('读：返回 props 上的值', () => {
    const inst = makeInstance();
    const props = { value: 'hello' };

    const model = withInstance(inst, () => useModel<string>(props, 'value'));

    expect(model.value).toBe('hello');
  });

  it('★ 写：emit update:<key>，且不直接改 props', () => {
    const inst = makeInstance();
    const props: { value?: string } = { value: 'a' };

    const model = withInstance(inst, () => useModel<string>(props, 'value'));
    model.value = 'b';

    expect(inst.emit).toHaveBeenCalledWith('update:value', 'b');
    expect(props.value).toBe('a');
  });

  it('key 名原样拼进事件名（modelValue ⇒ update:modelValue）', () => {
    const inst = makeInstance();
    const props = { modelValue: 1 };

    const model = withInstance(inst, () => useModel<number>(props, 'modelValue'));
    model.value = 2;

    expect(inst.emit).toHaveBeenCalledWith('update:modelValue', 2);
  });

  it('props 上缺这个 key ⇒ 读到 undefined', () => {
    const inst = makeInstance();

    const model = withInstance(inst, () => useModel<string>({}, 'value'));

    expect(model.value).toBeUndefined();
  });

  it('★ 无活动实例 ⇒ DEV 告警（与 useSlots / useAttrs 对齐），读 undefined、写不抛', () => {
    const model = withInstance(null, () => useModel<string>({ value: 'x' }, 'value'));

    expect(warnSpy).toHaveBeenCalled();
    expect(String(warnSpy.mock.calls[0]?.[0])).toContain('useModel');

    expect(model.value).toBeUndefined();
    expect(() => {
      model.value = 'y';
    }).not.toThrow();
    expect(model.value).toBeUndefined();
  });
});
