/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, bench, beforeAll } from 'vitest';
import { ref, computed } from '@lytjs/reactivity';
import {
  createComponentInstance,
  setupComponent,
  finishComponentSetup,
  defineComponent,
  normalizePropsOptions,
  resolvePropValue,
  validateType,
  callUnmountedHook,
} from '@lytjs/component';
import type { ComponentOptions } from '@lytjs/component';

describe('component benchmark', () => {
  beforeAll(() => {
    (globalThis as any).__DEV__ = true;
  });

  // FR-7: component 测试组件实例创建性能
  bench('创建组件实例 (100次)', () => {
    for (let i = 0; i < 100; i++) {
      const options = defineComponent({
        name: `BenchComp-${i}`,
        setup() {
          return { count: 0 };
        },
      });
      const vnode = { type: options, props: {}, children: null };
      createComponentInstance(vnode, null);
    }
  });

  bench('创建带 props 的组件实例 (100次)', () => {
    for (let i = 0; i < 100; i++) {
      const options = defineComponent({
        name: `PropsComp-${i}`,
        props: {
          msg: { type: String, required: true },
          count: { type: Number, default: 0 },
        },
        setup() {
          return { count: 0 };
        },
      });
      const vnode = {
        type: options,
        props: { msg: 'hello', count: i },
        children: null,
      };
      createComponentInstance(vnode, null);
    }
  });

  bench('创建带父组件的组件实例 (100次)', () => {
    const parentOptions = defineComponent({ name: 'Parent' });
    const parentVnode = { type: parentOptions, props: {}, children: null };
    const parentInstance = createComponentInstance(parentVnode, null);

    for (let i = 0; i < 100; i++) {
      const childOptions = defineComponent({
        name: `Child-${i}`,
        setup() {
          return {};
        },
      });
      const childVnode = { type: childOptions, props: {}, children: null };
      createComponentInstance(childVnode, parentInstance);
    }
  });

  // FR-8: component 测试 setup 函数执行性能
  bench('执行 setup 函数 (100次)', () => {
    for (let i = 0; i < 100; i++) {
      const options = defineComponent({
        name: `SetupComp-${i}`,
        setup() {
          const count = ref(0);
          const doubled = computed(() => count.value * 2);
          return { count, doubled };
        },
      });
      const vnode = { type: options, props: {}, children: null };
      const instance = createComponentInstance(vnode, null);
      setupComponent(instance);
    }
  });

  bench('执行 setup 函数 - 返回渲染函数 (100次)', () => {
    for (let i = 0; i < 100; i++) {
      const options = defineComponent({
        name: `RenderSetupComp-${i}`,
        setup() {
          return () => null as any;
        },
      });
      const vnode = { type: options, props: {}, children: null };
      const instance = createComponentInstance(vnode, null);
      setupComponent(instance);
    }
  });

  bench('执行 setup 函数 - 带 data 选项 (100次)', () => {
    for (let i = 0; i < 100; i++) {
      const options = defineComponent({
        name: `DataComp-${i}`,
        data() {
          return { items: Array.from({ length: 10 }, (_, j) => ({ id: j, text: `item-${j}` })) };
        },
        setup() {
          return {};
        },
      });
      const vnode = { type: options, props: {}, children: null };
      const instance = createComponentInstance(vnode, null);
      setupComponent(instance);
    }
  });

  // FR-9: component 测试 props 验证和传递性能
  bench('normalizePropsOptions - 对象形式 (1000次)', () => {
    const rawProps = {
      msg: { type: String, required: true },
      count: { type: Number, default: 0 },
      items: { type: Array, default: () => [] },
      visible: { type: Boolean, default: false },
      callback: { type: Function },
    };
    for (let i = 0; i < 1000; i++) {
      normalizePropsOptions(rawProps);
    }
  });

  bench('normalizePropsOptions - 数组形式 (1000次)', () => {
    const rawProps = ['msg', 'count', 'items', 'visible', 'callback'];
    for (let i = 0; i < 1000; i++) {
      normalizePropsOptions(rawProps);
    }
  });

  bench('resolvePropValue - 使用默认值 (1000次)', () => {
    const propOptions = { type: String, default: 'default-value' };
    for (let i = 0; i < 1000; i++) {
      resolvePropValue(propOptions, undefined);
    }
  });

  bench('resolvePropValue - 传入值 (1000次)', () => {
    const propOptions = { type: String, required: true };
    for (let i = 0; i < 1000; i++) {
      resolvePropValue(propOptions, `value-${i}`);
    }
  });

  bench('validateType - 类型验证 (1000次)', () => {
    for (let i = 0; i < 1000; i++) {
      validateType('hello', String);
      validateType(42, Number);
      validateType(true, Boolean);
    }
  });

  // FR-10: component 测试组件销毁性能
  bench('组件销毁 - 调用 unmounted 生命周期 (100次)', () => {
    for (let i = 0; i < 100; i++) {
      const options = defineComponent({
        name: `DestroyComp-${i}`,
        setup() {
          return { count: 0 };
        },
      });
      const vnode = { type: options, props: {}, children: null };
      const instance = createComponentInstance(vnode, null);
      setupComponent(instance);
      callUnmountedHook(instance);
    }
  });

  bench('组件销毁 - 带多个生命周期钩子 (100次)', () => {
    for (let i = 0; i < 100; i++) {
      const options = defineComponent({
        name: `LifecycleComp-${i}`,
        beforeUnmount() {},
        unmounted() {},
        setup() {
          return { count: 0 };
        },
      });
      const vnode = { type: options, props: {}, children: null };
      const instance = createComponentInstance(vnode, null);
      setupComponent(instance);
      callUnmountedHook(instance);
    }
  });

  bench('完整生命周期 - 创建到销毁 (100次)', () => {
    for (let i = 0; i < 100; i++) {
      const options = defineComponent({
        name: `FullLifecycleComp-${i}`,
        props: {
          msg: { type: String, default: 'hello' },
          count: { type: Number, default: 0 },
        },
        data() {
          return { localCount: 0 };
        },
        setup(props) {
          const count = ref(0);
          const doubled = computed(() => count.value * 2);
          return { count, doubled };
        },
      });
      const vnode = {
        type: options,
        props: { msg: 'bench', count: i },
        children: null,
      };
      const instance = createComponentInstance(vnode, null);
      setupComponent(instance);
      callUnmountedHook(instance);
    }
  });
});
