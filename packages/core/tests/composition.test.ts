/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @lytjs/component 的 getCurrentInstance
const mockInstance = {
  slots: { default: vi.fn(() => []), header: vi.fn(() => []) },
  attrs: { class: 'test', id: 'app', 'data-value': '123' },
  emit: vi.fn(),
  provides: {},
  parent: null,
  appContext: { components: {}, directives: {}, mixins: [], provides: {} },
} as any;

const mockGetCurrentInstance = vi.fn(() => mockInstance);

vi.mock('@lytjs/component', () => ({
  getCurrentInstance: (...args: any[]) => mockGetCurrentInstance(...args),
}));

import { useSlots, useAttrs, useModel } from '../src/composition';

describe('useSlots', () => {
  it('在组件实例中返回 slots 对象', () => {
    const slots = useSlots();
    expect(slots).toBeDefined();
    expect(typeof slots.default).toBe('function');
  });

  it('在无组件实例中返回空对象', async () => {
    mockGetCurrentInstance.mockReturnValueOnce(null);
    const slots = useSlots();
    expect(slots).toEqual({});
  });

  it('返回的 slots 包含所有定义的 slot', () => {
    const slots = useSlots();
    expect(slots).toHaveProperty('default');
    expect(slots).toHaveProperty('header');
  });

  it('调用 slot 函数返回渲染结果', () => {
    const slots = useSlots();
    const result = slots.default();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('useAttrs', () => {
  it('在组件实例中返回 attrs 对象', () => {
    const attrs = useAttrs();
    expect(attrs).toEqual({ class: 'test', id: 'app', 'data-value': '123' });
  });

  it('在无组件实例中返回空对象', async () => {
    mockGetCurrentInstance.mockReturnValueOnce(null);
    const attrs = useAttrs();
    expect(attrs).toEqual({});
  });

  it('返回的 attrs 不包含 props', () => {
    const attrs = useAttrs();
    expect(attrs).not.toHaveProperty('modelValue');
  });

  it('返回的 attrs 包含 data 属性', () => {
    const attrs = useAttrs();
    expect(attrs).toHaveProperty('data-value');
    expect(attrs['data-value']).toBe('123');
  });

  it('attrs 是响应式的（浅层）', () => {
    const attrs = useAttrs();
    expect(attrs.class).toBe('test');
  });
});

describe('useModel', () => {
  it('读取 props 中的值', () => {
    const props = { count: 42 };
    const model = useModel(props, 'count');
    expect(model.value).toBe(42);
  });

  it('设置值时触发 emit', () => {
    const props = { value: 'hello' };
    const model = useModel(props, 'value');
    model.value = 'world';
    expect(mockInstance.emit).toHaveBeenCalledWith('update:value', 'world');
  });

  it('在无组件实例中返回 undefined', async () => {
    mockGetCurrentInstance.mockReturnValueOnce(null);
    const model = useModel({ count: 0 }, 'count');
    expect(model.value).toBeUndefined();
  });

  it('支持泛型类型推导', () => {
    const props = { name: 'lytjs', version: 1 };
    const nameModel = useModel<string>(props, 'name');
    expect(nameModel.value).toBe('lytjs');

    const versionModel = useModel<number>(props, 'version');
    expect(versionModel.value).toBe(1);
  });

  it('处理不存在的 prop key', () => {
    const props = { existing: 'value' };
    const model = useModel(props, 'nonExisting');
    expect(model.value).toBeUndefined();
  });

  it('多次设置值触发多次 emit', () => {
    const props = { count: 0 };
    mockInstance.emit.mockClear(); // 先清除之前的调用
    const model = useModel(props, 'count');
    model.value = 1;
    model.value = 2;
    model.value = 3;
    expect(mockInstance.emit).toHaveBeenCalledTimes(3);
    expect(mockInstance.emit).toHaveBeenCalledWith('update:count', 3);
  });

  it('设置为相同值仍然触发 emit', () => {
    const props = { value: 'same' };
    const model = useModel(props, 'value');
    model.value = 'same';
    expect(mockInstance.emit).toHaveBeenCalledWith('update:value', 'same');
  });

  it('支持复杂类型的 model', () => {
    const obj = { name: 'test', nested: { value: 1 } };
    const props = { data: obj };
    const model = useModel<typeof obj>(props, 'data');
    expect(model.value).toEqual(obj);
  });

  it('model 是可写的计算属性', () => {
    const props = { value: 10 };
    const model = useModel(props, 'value');
    // 应该是 WritableComputedRef，具有 get/set
    expect(model).toHaveProperty('value');
    expect(typeof Object.getOwnPropertyDescriptor(Object.getPrototypeOf(model), 'value')?.set).toBe(
      'function',
    );
  });
});
