// tests/composition.test.ts
// Composition API 辅助函数单元测试：useSlots、useAttrs、useModel

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSlots, useAttrs, useModel } from '../src/composition';
import {
  createComponentInstance,
  setupComponent,
  defineComponent,
  setCurrentInstance,
  getCurrentInstance,
} from '@lytjs/component';
import type { ComponentInternalInstance } from '@lytjs/component';

describe('useSlots', () => {
  // 在没有组件实例时，useSlots 应返回空对象
  it('在无组件实例时返回空对象', () => {
    // 确保当前没有活跃的组件实例
    setCurrentInstance(null);
    const slots = useSlots();
    expect(slots).toEqual({});
  });

  // 在有组件实例时，useSlots 应返回实例的 slots 对象
  it('在有组件实例时返回实例的 slots 对象', () => {
    const options = defineComponent({
      name: 'SlotComp',
      setup() {
        // 在 setup 内部调用 useSlots
        const slots = useSlots();
        return { slots };
      },
    });

    const vnode = {
      type: options,
      props: {},
      children: {
        default: () => 'default slot content',
        header: () => 'header slot content',
      },
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // setupState 中应包含 slots 引用
    expect(instance.setupState.slots).toBeDefined();
    // slots 应该有 default 和 header 插槽
    expect(instance.setupState.slots.default).toBeDefined();
    expect(instance.setupState.slots.header).toBeDefined();
  });

  // 当组件没有定义 slots 时，应返回空对象
  it('当组件没有 slots 时返回空对象', () => {
    const options = defineComponent({
      name: 'NoSlotComp',
      setup() {
        const slots = useSlots();
        return { slots };
      },
    });

    const vnode = {
      type: options,
      props: {},
      children: null,
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // 没有传入 children 时 slots 应为空对象
    expect(instance.setupState.slots).toBeDefined();
    expect(Object.keys(instance.setupState.slots).length).toBe(0);
  });
});

describe('useAttrs', () => {
  // 在没有组件实例时，useAttrs 应返回空对象
  it('在无组件实例时返回空对象', () => {
    setCurrentInstance(null);
    const attrs = useAttrs();
    expect(attrs).toEqual({});
  });

  // 在有组件实例时，useAttrs 应返回实例的 attrs 对象
  it('在有组件实例时返回实例的 attrs 对象', () => {
    const options = defineComponent({
      name: 'AttrsComp',
      props: {
        // 只声明 msg 为 prop
        msg: { type: String },
      },
      setup() {
        const attrs = useAttrs();
        return { attrs };
      },
    });

    // 传入声明的 prop 和未声明的属性
    const vnode = {
      type: options,
      props: {
        msg: 'hello',
        class: 'custom-class',
        'data-id': '123',
      },
      children: null,
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // attrs 应包含未声明的属性（class、data-id）
    const attrs = instance.setupState.attrs;
    expect(attrs).toBeDefined();
    expect(attrs['class']).toBe('custom-class');
    expect(attrs['data-id']).toBe('123');
    // msg 是声明的 prop，不应出现在 attrs 中
    expect(attrs['msg']).toBeUndefined();
  });

  // 当所有 props 都已声明时，attrs 应为空对象
  it('当所有 props 都已声明时 attrs 为空', () => {
    const options = defineComponent({
      name: 'FullPropsComp',
      props: {
        msg: { type: String },
        count: { type: Number },
      },
      setup() {
        const attrs = useAttrs();
        return { attrs };
      },
    });

    const vnode = {
      type: options,
      props: { msg: 'hello', count: 42 },
      children: null,
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // 所有 props 都已声明，attrs 应为空
    expect(Object.keys(instance.setupState.attrs).length).toBe(0);
  });
});

describe('useModel', () => {
  // 在没有组件实例时，useModel 应返回 value 为 undefined 的对象
  it('在无组件实例时返回 value 为 undefined', () => {
    setCurrentInstance(null);
    const model = useModel({}, 'value');
    expect(model.value).toBeUndefined();
  });

  // useModel 应正确读取 props 中的值
  it('应正确读取 props 中的值', () => {
    const options = defineComponent({
      name: 'ModelComp',
      props: {
        modelValue: { type: String },
      },
      emits: ['update:modelValue'],
      setup(props) {
        const model = useModel(props, 'modelValue');
        return { model };
      },
    });

    const vnode = {
      type: options,
      props: { modelValue: 'initial' },
      children: null,
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // model.value 应等于 props.modelValue
    expect(instance.setupState.model.value).toBe('initial');
  });

  // useModel 设置值时应触发 update:modelValue 事件
  it('设置值时应触发 update:modelValue 事件', () => {
    const emitSpy = vi.fn();

    const options = defineComponent({
      name: 'ModelEmitComp',
      props: {
        modelValue: { type: String },
      },
      emits: ['update:modelValue'],
      setup(props) {
        const model = useModel(props, 'modelValue');
        return { model };
      },
    });

    const vnode = {
      type: options,
      props: { modelValue: 'initial' },
      children: null,
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    // 替换 emit 函数为 spy
    instance.emit = emitSpy;

    // 获取 setup 中的 model 引用
    const model = instance.setupState.model;

    // 设置新值
    model.value = 'updated';

    // 应触发 update:modelValue 事件
    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith('update:modelValue', 'updated');
  });

  // useModel 支持自定义 key 的双向绑定
  it('支持自定义 key 的双向绑定', () => {
    const emitSpy = vi.fn();

    const options = defineComponent({
      name: 'CustomModelComp',
      props: {
        visible: { type: Boolean },
      },
      emits: ['update:visible'],
      setup(props) {
        const model = useModel(props, 'visible');
        return { model };
      },
    });

    const vnode = {
      type: options,
      props: { visible: true },
      children: null,
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    instance.emit = emitSpy;
    const model = instance.setupState.model;

    // 读取初始值
    expect(model.value).toBe(true);

    // 设置新值
    model.value = false;

    // 应触发 update:visible 事件
    expect(emitSpy).toHaveBeenCalledWith('update:visible', false);
  });

  // useModel 多次设置值应每次都触发事件
  it('多次设置值应每次都触发事件', () => {
    const emitSpy = vi.fn();

    const options = defineComponent({
      name: 'MultiModelComp',
      props: {
        count: { type: Number },
      },
      emits: ['update:count'],
      setup(props) {
        const model = useModel(props, 'count');
        return { model };
      },
    });

    const vnode = {
      type: options,
      props: { count: 0 },
      children: null,
    };

    const instance = createComponentInstance(vnode, null);
    setupComponent(instance);

    instance.emit = emitSpy;
    const model = instance.setupState.model;

    // 多次设置值
    model.value = 1;
    model.value = 2;
    model.value = 3;

    // 应触发 3 次 update:count 事件
    expect(emitSpy).toHaveBeenCalledTimes(3);
    expect(emitSpy).toHaveBeenNthCalledWith(1, 'update:count', 1);
    expect(emitSpy).toHaveBeenNthCalledWith(2, 'update:count', 2);
    expect(emitSpy).toHaveBeenNthCalledWith(3, 'update:count', 3);
  });
});
