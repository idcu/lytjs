/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-console, @typescript-eslint/no-require-imports */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as coreVnode from '../src/index';

describe('@lytjs/core-vnode exports', () => {
  it('should export createApp', () => {
    expect(coreVnode.createApp).toBeDefined();
    expect(typeof coreVnode.createApp).toBe('function');
  });

  it('should export h and createElement (alias)', () => {
    expect(coreVnode.h).toBeDefined();
    expect(typeof coreVnode.h).toBe('function');
    expect(coreVnode.createElement).toBe(coreVnode.h);
  });

  it('should export defineComponent and defineAsyncComponent', () => {
    expect(coreVnode.defineComponent).toBeDefined();
    expect(typeof coreVnode.defineComponent).toBe('function');
    expect(coreVnode.defineAsyncComponent).toBeDefined();
    expect(typeof coreVnode.defineAsyncComponent).toBe('function');
  });

  it('should export nextTick', () => {
    expect(coreVnode.nextTick).toBeDefined();
    expect(typeof coreVnode.nextTick).toBe('function');
  });

  it('should export resolveComponent and resolveDirective', () => {
    expect(coreVnode.resolveComponent).toBeDefined();
    expect(coreVnode.resolveDirective).toBeDefined();
  });

  it('should export withDirectives and withMemo', () => {
    expect(coreVnode.withDirectives).toBeDefined();
    expect(coreVnode.withMemo).toBeDefined();
  });

  it('should export composition API', () => {
    expect(coreVnode.useSlots).toBeDefined();
    expect(coreVnode.useAttrs).toBeDefined();
    expect(coreVnode.useModel).toBeDefined();
  });

  it('should export web component API', () => {
    expect(coreVnode.defineCustomElement).toBeDefined();
    expect(coreVnode.useShadowRoot).toBeDefined();
    expect(coreVnode.useHost).toBeDefined();
    expect(coreVnode.useWebComponentSlots).toBeDefined();
    expect(coreVnode.injectChildStyles).toBeDefined();
  });

  it('should export lifecycle hooks', () => {
    expect(coreVnode.onMounted).toBeDefined();
    expect(coreVnode.onUnmounted).toBeDefined();
    expect(coreVnode.onUpdated).toBeDefined();
    expect(coreVnode.onBeforeMount).toBeDefined();
    expect(coreVnode.onBeforeUnmount).toBeDefined();
    expect(coreVnode.onBeforeUpdate).toBeDefined();
    expect(coreVnode.onErrorCaptured).toBeDefined();
    expect(coreVnode.onRenderTracked).toBeDefined();
    expect(coreVnode.onRenderTriggered).toBeDefined();
  });

  it('should export reactivity API', () => {
    expect(coreVnode.ref).toBeDefined();
    expect(coreVnode.reactive).toBeDefined();
    expect(coreVnode.computed).toBeDefined();
    expect(coreVnode.watch).toBeDefined();
    expect(coreVnode.watchEffect).toBeDefined();
    expect(coreVnode.effect).toBeDefined();
  });

  it('should export VNode API', () => {
    expect(coreVnode.createVNode).toBeDefined();
    expect(coreVnode.Fragment).toBeDefined();
    expect(coreVnode.Text).toBeDefined();
    expect(coreVnode.Comment).toBeDefined();
    expect(coreVnode.cloneVNode).toBeDefined();
    expect(coreVnode.mergeProps).toBeDefined();
  });

  it('should export compile', () => {
    expect(coreVnode.compile).toBeDefined();
    expect(typeof coreVnode.compile).toBe('function');
  });

  it('should NOT export Signal related API', () => {
    expect((coreVnode as any).signal).toBeUndefined();
    expect((coreVnode as any).computedSignal).toBeUndefined();
    expect((coreVnode as any).readonlySignal).toBeUndefined();
    expect((coreVnode as any).set).toBeUndefined();
    expect((coreVnode as any).update).toBeUndefined();
    expect((coreVnode as any).valueOf).toBeUndefined();
    expect((coreVnode as any).signalBatch).toBeUndefined();
    expect((coreVnode as any).signalUntrack).toBeUndefined();
  });
});

describe('createApp', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('should create an app instance', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div') });
    expect(app).toBeDefined();
    expect(app.mount).toBeDefined();
    expect(app.unmount).toBeDefined();
    expect(app.use).toBeDefined();
    expect(app.provide).toBeDefined();
    expect(app.inject).toBeDefined();
    expect(app.component).toBeDefined();
    expect(app.directive).toBeDefined();
    expect(app.mixin).toBeDefined();
    expect(app.config).toBeDefined();
  });

  it('should mount to a container element', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div', null, 'hello') });
    const vm = app.mount(container);
    expect(vm).toBeDefined();
  });

  it('should mount to a string selector', () => {
    const { createApp, h } = coreVnode;
    container.id = 'app';
    const app = createApp({ render: () => h('div', null, 'world') });
    const vm = app.mount('#app');
    expect(vm).toBeDefined();
  });

  it('should unmount from container', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div', null, 'hello') });
    app.mount(container);
    app.unmount();
    // After unmount, app should be marked as unmounted
    expect(() => app.mount(container)).toThrow('unmounted');
  });

  it('should throw when mounting after unmount', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div') });
    app.mount(container);
    app.unmount();
    expect(() => app.mount(container)).toThrow('unmounted');
  });

  it('should throw when mounting twice without unmounting', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div') });
    app.mount(container);
    expect(() => app.mount(container)).toThrow('already mounted');
  });

  it('should throw when mounting to non-existent selector', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div') });
    expect(() => app.mount('#non-existent')).toThrow('cannot find element');
  });

  it('should support plugin via use()', () => {
    const { createApp, h } = coreVnode;
    const installed = vi.fn();
    const plugin = { install: installed };
    const app = createApp({ render: () => h('div') });
    const result = app.use(plugin, 'option1', 'option2');
    expect(installed).toHaveBeenCalledWith(app, 'option1', 'option2');
    expect(result).toBe(app);
  });

  it('should support function plugin via use()', () => {
    const { createApp, h } = coreVnode;
    const fn = vi.fn();
    const app = createApp({ render: () => h('div') });
    app.use(fn);
    expect(fn).toHaveBeenCalledWith(app);
  });

  it('should not install the same plugin twice', () => {
    const { createApp, h } = coreVnode;
    const installed = vi.fn();
    const plugin = { install: installed };
    const app = createApp({ render: () => h('div') });
    app.use(plugin);
    app.use(plugin);
    expect(installed).toHaveBeenCalledTimes(1);
  });

  it('should provide and inject values', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div') });
    app.provide('myKey', 'myValue');
    expect(app.inject('myKey')).toBe('myValue');
  });

  it('should return app from provide()', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div') });
    const result = app.provide('key', 'value');
    expect(result).toBe(app);
  });

  it('should register global component via component()', () => {
    const { createApp, h, defineComponent } = coreVnode;
    const MyComp = defineComponent({ render: () => h('span', null, 'global') });
    const app = createApp({ render: () => h('div') });
    const result = app.component('my-comp', MyComp);
    expect(result).toBe(app);
  });

  it('should register global directive via directive()', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div') });
    const result = app.directive('focus', {
      mounted(el: any) {
        el.focus();
      },
    });
    expect(result).toBe(app);
  });

  it('should register mixin via mixin()', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div') });
    const mixin = { created() {} };
    const result = app.mixin(mixin);
    expect(result).toBe(app);
  });

  it('should return public instance from mount()', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div', null, 'test') });
    const vm = app.mount(container);
    expect(vm).toBeDefined();
  });

  it('should support globalProperties', () => {
    const { createApp, h } = coreVnode;
    const app = createApp({ render: () => h('div') });
    app.config.globalProperties.$global = 'test';
    expect(app.config.globalProperties.$global).toBe('test');
  });
});

describe('h() function', () => {
  it('should create a VNode with tag', () => {
    const { h } = coreVnode;
    const vnode = h('div');
    expect(vnode).toBeDefined();
    expect(vnode.type).toBe('div');
  });

  it('should create a VNode with props', () => {
    const { h } = coreVnode;
    const vnode = h('div', { id: 'test', class: 'active' });
    expect(vnode).toBeDefined();
    expect(vnode.type).toBe('div');
    expect(vnode.props).toBeDefined();
    expect(vnode.props.id).toBe('test');
    expect(vnode.props.class).toBe('active');
  });

  it('should create a VNode with children', () => {
    const { h } = coreVnode;
    const vnode = h('div', null, 'hello');
    expect(vnode).toBeDefined();
    expect(vnode.children).toBe('hello');
  });

  it('should create a VNode with array children', () => {
    const { h } = coreVnode;
    const vnode = h('div', null, [h('span', null, 'a'), h('span', null, 'b')]);
    expect(vnode).toBeDefined();
    expect(Array.isArray(vnode.children)).toBe(true);
    expect(vnode.children.length).toBe(2);
  });
});

describe('nextTick', () => {
  it('should return a promise', () => {
    const { nextTick } = coreVnode;
    const result = nextTick();
    expect(result).toBeInstanceOf(Promise);
  });

  it('should resolve asynchronously', async () => {
    const { nextTick } = coreVnode;
    let called = false;
    await nextTick().then(() => {
      called = true;
    });
    expect(called).toBe(true);
  });
});

describe('defineComponent', () => {
  it('should return a component object', () => {
    const { defineComponent } = coreVnode;
    const comp = defineComponent({
      props: { msg: String },
      render() {
        return null;
      },
    });
    expect(comp).toBeDefined();
  });
});

describe('reactivity API', () => {
  it('ref should work correctly', () => {
    const { ref } = coreVnode;
    const count = ref(0);
    expect(count.value).toBe(0);
    count.value = 5;
    expect(count.value).toBe(5);
  });

  it('reactive should work correctly', () => {
    const { reactive } = coreVnode;
    const state = reactive({ count: 0, name: 'test' });
    expect(state.count).toBe(0);
    expect(state.name).toBe('test');
    state.count = 10;
    expect(state.count).toBe(10);
  });

  it('computed should work correctly', () => {
    const { ref, computed } = coreVnode;
    const count = ref(2);
    const doubled = computed(() => count.value * 2);
    expect(doubled.value).toBe(4);
    count.value = 5;
    expect(doubled.value).toBe(10);
  });

  it('watch should work correctly', async () => {
    const { ref, watch, nextTick } = coreVnode;
    const count = ref(0);
    const callback = vi.fn();
    watch(count, callback);
    count.value = 1;
    await nextTick();
    expect(callback).toHaveBeenCalled();
  });

  it('watchEffect should work correctly', () => {
    const { ref, watchEffect } = coreVnode;
    const count = ref(0);
    const callback = vi.fn();
    watchEffect(() => {
      callback(count.value);
    });
    expect(callback).toHaveBeenCalledWith(0);
  });
});

describe('VNode API', () => {
  it('createVNode should create a vnode', () => {
    const { createVNode } = coreVnode;
    const vnode = createVNode('div', { id: 'test' }, 'content');
    expect(vnode).toBeDefined();
    expect(vnode.type).toBe('div');
  });

  it('Fragment should be defined', () => {
    const { Fragment } = coreVnode;
    expect(Fragment).toBeDefined();
  });

  it('Text should be defined', () => {
    const { Text } = coreVnode;
    expect(Text).toBeDefined();
  });

  it('Comment should be defined', () => {
    const { Comment } = coreVnode;
    expect(Comment).toBeDefined();
  });

  it('cloneVNode should clone a vnode', () => {
    const { h, cloneVNode } = coreVnode;
    const vnode = h('div', { id: 'test' }, 'content');
    const cloned = cloneVNode(vnode);
    expect(cloned).toBeDefined();
    expect(cloned.type).toBe('div');
  });

  it('mergeProps should merge props', () => {
    const { mergeProps } = coreVnode;
    const merged = mergeProps({ id: 'a' }, { class: 'b' });
    expect(merged.id).toBe('a');
    expect(merged.class).toBe('b');
  });
});
