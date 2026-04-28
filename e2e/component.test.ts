/**
 * E2E 测试: @lytjs/component 组件系统测试
 *
 * 测试核心功能:
 * - defineComponent 基本定义
 * - props 传递
 * - setup 函数
 * - 生命周期钩子
 */

import { test, expect } from '@playwright/test'

// 从 dist 目录动态导入 component 模块
const componentPath = new URL('../packages/component/dist/index.mjs', import.meta.url).href

let component: any

test.beforeAll(async () => {
  component = await import(componentPath)
})

// ======================== defineComponent 测试 ========================

test('defineComponent - 基本定义', () => {
  const MyComponent = component.defineComponent({
    name: 'MyComponent',
  })
  expect(MyComponent).toBeTruthy()
  expect(MyComponent._isComponentDefine).toBe(true)
})

test('defineComponent - 带名称', () => {
  const Comp = component.defineComponent({
    name: 'TestComp',
  })
  expect(Comp.name).toBe('TestComp')
})

test('defineComponent - 带 state', () => {
  const Comp = component.defineComponent({
    name: 'StateComp',
    state() {
      return { count: 0, name: 'lyt' }
    },
  })
  expect(Comp._isComponentDefine).toBe(true)
  expect(Comp.options.state).toBeInstanceOf(Function)
  const initialState = Comp.options.state()
  expect(initialState.count).toBe(0)
  expect(initialState.name).toBe('lyt')
})

test('defineComponent - 带 computed', () => {
  const Comp = component.defineComponent({
    name: 'ComputedComp',
    state() {
      return { a: 1, b: 2 }
    },
    computed: {
      sum() {
        return (this as any).a + (this as any).b
      },
    },
  })
  expect(Comp.options.computed).toBeTruthy()
  expect(typeof Comp.options.computed.sum).toBe('function')
})

test('defineComponent - 带 methods', () => {
  const Comp = component.defineComponent({
    name: 'MethodsComp',
    state() {
      return { count: 0 }
    },
    methods: {
      increment() {
        (this as any).count++
      },
    },
  })
  expect(Comp.options.methods).toBeTruthy()
  expect(typeof Comp.options.methods.increment).toBe('function')
})

test('defineComponent - 带 render 函数', () => {
  const Comp = component.defineComponent({
    name: 'RenderComp',
    render(h: any) {
      return h('div', null, ['Hello'])
    },
  })
  expect(typeof Comp.options.render).toBe('function')
})

test('defineComponent - 带 setup 函数', () => {
  const Comp = component.defineComponent({
    name: 'SetupComp',
    setup(props: any, ctx: any) {
      return {
        message: 'hello',
      }
    },
  })
  expect(typeof Comp.options.setup).toBe('function')
})

test('defineComponent - 带 emits 声明', () => {
  const Comp = component.defineComponent({
    name: 'EmitComp',
    emits: ['change', 'update'],
  })
  expect(Comp.options.emits).toBeTruthy()
})

// ======================== createComponentInstance 测试 ========================

test('createComponentInstance - 创建内部实例', () => {
  const Comp = component.defineComponent({
    name: 'TestComp',
    props: {
      title: String,
      count: Number,
    },
  })
  const instance = component.createComponentInstance(Comp)
  expect(instance).toBeTruthy()
  expect(instance._isComponent).toBe(true)
  expect(instance.isMounted).toBe(false)
  expect(instance.isUnmounted).toBe(false)
  expect(instance.props).toBeTruthy()
  expect(instance.state).toBeTruthy()
  expect(instance.slots).toBeTruthy()
  expect(instance.renderProxy).toBeTruthy()
})

// ======================== setupComponent 测试 ========================

test('setupComponent - 带初始化', () => {
  const Comp = component.defineComponent({
    name: 'InitComp',
    props: {
      title: { type: String, default: 'Hello' },
    },
    state() {
      return { inner: 42 }
    },
  })
  const instance = component.createComponentInstance(Comp)
  expect(() => component.setupComponent(instance, { title: 'World' })).not.toThrow()
  expect(instance.props.title).toBe('World')
})

test('setupComponent - 带 setup 函数', () => {
  const Comp = component.defineComponent({
    name: 'SetupComp',
    setup(props: any) {
      return {
        computedMsg: 'from setup: ' + (props.title || 'default'),
      }
    },
  })
  const instance = component.createComponentInstance(Comp)
  component.setupComponent(instance, { title: 'Test' })
  expect(instance.setupState.computedMsg).toBe('from setup: Test')
})

test('setupComponent - setup 返回 render 函数', () => {
  let renderCalled = false
  const Comp = component.defineComponent({
    name: 'RenderSetupComp',
    setup() {
      return function render(h: any) {
        renderCalled = true
        return h('div', null, ['rendered'])
      }
    },
  })
  const instance = component.createComponentInstance(Comp)
  component.setupComponent(instance)
  expect(typeof Comp.options.render).toBe('function')
})

// ======================== 生命周期钩子测试 ========================

test('lifecycle - LifecycleHook 枚举值', () => {
  expect(component.LifecycleHook.INIT).toBe('init')
  expect(component.LifecycleHook.MOUNTED).toBe('mounted')
  expect(component.LifecycleHook.BEFORE_UPDATE).toBe('beforeUpdate')
  expect(component.LifecycleHook.UPDATED).toBe('updated')
  expect(component.LifecycleHook.BEFORE_UNMOUNT).toBe('beforeUnmount')
  expect(component.LifecycleHook.UNMOUNTED).toBe('unmounted')
})

test('lifecycle - onMounted 注册钩子', () => {
  const Comp = component.defineComponent({
    name: 'LifecycleComp',
    setup() {
      component.onMounted(() => {
        // 钩子注册
      })
      return {}
    },
  })
  expect(typeof Comp).toBe('object')
})

test('lifecycle - setCurrentInstance / currentInstance', () => {
  const prev = component.currentInstance
  const mockInstance = { init: [], mounted: [] } as any
  component.setCurrentInstance(mockInstance)
  expect(component.currentInstance).toBe(mockInstance)
  component.setCurrentInstance(prev)
})

test('lifecycle - createLifecycleHook', () => {
  const hook = component.createLifecycleHook(component.LifecycleHook.MOUNTED)
  expect(typeof hook).toBe('function')
})

test('lifecycle - callLifecycleHook', () => {
  const instance: any = { mounted: [] }
  const calls: string[] = []
  component.callLifecycleHook(instance, component.LifecycleHook.MOUNTED)
  // 没有注册钩子时不应报错
  expect(calls.length).toBe(0)

  instance.mounted.push(() => calls.push('hook1'))
  instance.mounted.push(() => calls.push('hook2'))
  component.callLifecycleHook(instance, component.LifecycleHook.MOUNTED)
  expect(calls).toEqual(['hook1', 'hook2'])
})

// ======================== mountComponent / unmountComponent 测试 ========================

test('mountComponent - 挂载组件', () => {
  const Comp = component.defineComponent({
    name: 'MountComp',
    state() {
      return { count: 0 }
    },
    render(h: any) {
      return h('div', null, ['mounted'])
    },
  })
  const instance = component.createComponentInstance(Comp)
  component.setupComponent(instance)
  const mockH = (tag: string, props: any, children: any) => ({ tag, props, children })
  component.mountComponent(instance, mockH)
  expect(instance.isMounted).toBe(true)
  expect(instance.subTree).toBeTruthy()
})

test('unmountComponent - 卸载组件', () => {
  const Comp = component.defineComponent({
    name: 'UnmountComp',
    state() {
      return { count: 0 }
    },
  })
  const instance = component.createComponentInstance(Comp)
  component.setupComponent(instance)
  const mockH = (tag: string, props: any, children: any) => ({ tag, props, children })
  component.mountComponent(instance, mockH)
  expect(instance.isMounted).toBe(true)

  component.unmountComponent(instance)
  expect(instance.isUnmounted).toBe(true)
  expect(instance.isMounted).toBe(false)
})

test('updateComponent - 更新组件', () => {
  const Comp = component.defineComponent({
    name: 'UpdateComp',
    state() {
      return { count: 0 }
    },
    render(h: any) {
      return h('div', null, ['update'])
    },
  })
  const instance = component.createComponentInstance(Comp)
  component.setupComponent(instance)
  const mockH = (tag: string, props: any, children: any) => ({ tag, props, children })
  component.mountComponent(instance, mockH)
  expect(() => component.updateComponent(instance, mockH)).not.toThrow()
})

// ======================== defineFunctionalComponent 测试 ========================

test('defineFunctionalComponent - 函数组件定义', () => {
  const FnComp = component.defineFunctionalComponent((props: any, ctx: any) => {
    return { tag: 'div', props: null, children: [props.msg] }
  })
  expect(FnComp._isComponentDefine).toBe(true)
})

// ======================== Props 系统测试 ========================

test('normalizePropsOptions - 标准化 props', () => {
  const result = component.normalizePropsOptions({
    title: { type: String, default: 'Hello' },
    count: { type: Number, required: true },
  })
  expect(result).toBeTruthy()
})

// ======================== Emit 系统测试 ========================

test('emit - normalizeEmits', () => {
  const result = component.normalizeEmits(['change', 'update'])
  expect(result).toBeTruthy()
})

// ======================== Slots 系统测试 ========================

test('initSlots - 初始化插槽', () => {
  const instance: any = {
    slots: {},
  }
  expect(() => component.initSlots(instance, null)).not.toThrow()
  expect(() => component.initSlots(instance, { default: () => 'slot content' })).not.toThrow()
})

// ======================== Composition API 测试 ========================

test('composition API - provide/inject 导出', () => {
  expect(typeof component.provide).toBe('function')
  expect(typeof component.inject).toBe('function')
})

test('composition API - getCurrentInstance 导出', () => {
  expect(typeof component.getCurrentInstance).toBe('function')
})

test('composition API - runSetup 导出', () => {
  expect(typeof component.runSetup).toBe('function')
})
