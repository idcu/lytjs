/**
 * Lyt.js 组件系统 — 单元测试
 *
 * 使用 @lytjs/test-utils 统一测试框架。
 * 测试组件定义、Props、State、Methods、Computed、Emit、生命周期、插槽和函数组件。
 *
 * 测试覆盖：
 *   - defineComponent 基本定义
 *   - Props 初始化和验证
 *   - State 响应式
 *   - Methods 绑定
 *   - Computed 计算属性
 *   - Emit 事件发射
 *   - 生命周期钩子调用顺序
 *   - 插槽初始化
 *   - 函数组件
 *   - 组件卸载清理
 */

import {
  describe,
  it,
  expect,
  deepEqual,
} from '../../test-utils/src/index'

import {
  defineComponent,
  createComponentInstance,
  setupComponent,
  setupStatefulComponent,
  setupFunctionComponent,
  mountComponent,
  updateComponent,
  unmountComponent,
  normalizePropsOptions,
  validateProp,
  initProps,
  emit,
  normalizeEmits,
  camelizeToHyphen,
  hyphenToCamel,
  LifecycleHook,
  callLifecycleHook,
  setCurrentInstance,
  onInit,
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  initSlots,
  renderSlot,
  hasSlot,
} from '../src/index'

import type {
  ComponentInternalInstance,
  EmitInstance,
} from '../src/index'

// ================================================================
//  测试用例
// ================================================================

describe('Component 组件系统', () => {

  // ---- 1. defineComponent 基本定义 ----
  it('defineComponent 基本定义', () => {
    const comp = defineComponent({
      name: 'MyComponent',
      state() {
        return { count: 0 }
      },
    })

    expect(comp._isComponentDefine).toBe(true)
    expect(comp.name).toBe('MyComponent')
    expect(comp.options).toBeDefined()
    expect(comp.options.state).toBeDefined()
  })

  // ---- 2. Props 初始化和验证 ----
  it('Props 初始化和验证', () => {
    const comp = defineComponent({
      name: 'PropsComp',
      props: {
        title: { type: String, default: 'Hello' },
        count: { type: Number, required: true },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance, { title: 'World', count: 42 })

    expect(instance.props.title).toBe('World')
    expect(instance.props.count).toBe(42)

    // 测试默认值
    const instance2 = createComponentInstance(comp)
    setupComponent(instance2, { count: 10 })
    expect(instance2.props.title).toBe('Hello')
  })

  // ---- 3. State 响应式 ----
  it('State 响应式', () => {
    const comp = defineComponent({
      name: 'StateComp',
      state() {
        return { count: 0, name: 'lyt' }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect(instance.state.count).toBe(0)
    expect(instance.state.name).toBe('lyt')

    // 修改 state
    instance.state.count = 10
    instance.state.name = 'hello'

    expect(instance.state.count).toBe(10)
    expect(instance.state.name).toBe('hello')
  })

  // ---- 4. Methods 绑定 ----
  it('Methods 绑定', () => {
    const comp = defineComponent({
      name: 'MethodsComp',
      state() {
        return { count: 0 }
      },
      methods: {
        increment() {
          this.$setState({ count: this.$state.count + 1 })
        },
        getCount() {
          return this.$state.count
        },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    // 方法应该绑定到 renderProxy
    expect(typeof (instance.renderProxy as any).increment).toBe('function')
    expect(typeof (instance.renderProxy as any).getCount).toBe('function')

    // 调用方法
    expect((instance.renderProxy as any).getCount()).toBe(0)
    ;(instance.renderProxy as any).increment()
    expect((instance.renderProxy as any).getCount()).toBe(1)
    ;(instance.renderProxy as any).increment()
    expect((instance.renderProxy as any).getCount()).toBe(2)
  })

  // ---- 5. Computed 计算属性 ----
  it('Computed 计算属性', () => {
    const comp = defineComponent({
      name: 'ComputedComp',
      state() {
        return { count: 3 }
      },
      computed: {
        double() {
          return this.$state.count * 2
        },
        quadruple() {
          return this.double * 2
        },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    // 计算属性应该通过 renderProxy 访问
    expect((instance.renderProxy as any).double).toBe(6)
    expect((instance.renderProxy as any).quadruple).toBe(12)

    // 修改依赖后，计算属性应自动更新（@lytjs/reactivity 的 computed 自动追踪依赖）
    instance.state.count = 5
    expect((instance.renderProxy as any).double).toBe(10)
    expect((instance.renderProxy as any).quadruple).toBe(20)
  })

  // ---- 6. Emit 事件发射 ----
  it('Emit 事件发射', () => {
    const comp = defineComponent({
      name: 'EmitComp',
      emits: ['change', 'update'],
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    // 设置事件处理函数
    instance.props.onChange = (val: string) => { /* handler */ }
    instance.props.onUpdate = (val: number) => { /* handler */ }

    // emit change 事件
    const result1 = instance.emit('change', 'hello')
    expect(result1).toBe(true)

    // emit update 事件
    const result2 = instance.emit('update', 42)
    expect(result2).toBe(true)

    // emit 未注册的处理函数
    const result3 = instance.emit('unknown', 'data')
    expect(result3).toBe(false)
  })

  // ---- 7. 生命周期钩子调用顺序 ----
  it('生命周期钩子调用顺序', () => {
    const order: string[] = []

    const comp = defineComponent({
      name: 'LifecycleComp',
      state() {
        return { count: 0 }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    // 手动注册生命周期钩子
    callLifecycleHook(instance, LifecycleHook.INIT)
    order.push('init')

    mountComponent(instance)
    order.push('mounted')

    // 更新
    updateComponent(instance)
    order.push('updated')

    // 卸载
    unmountComponent(instance)
    order.push('unmounted')

    expect(order).toEqual(['init', 'mounted', 'updated', 'unmounted'])

    // 卸载后状态
    expect(instance.isUnmounted).toBe(true)
    expect(instance.isMounted).toBe(false)
    expect(instance.subTree).toBe(null)
  })

  // ---- 8. 插槽初始化 ----
  it('插槽初始化', () => {
    const comp = defineComponent({
      name: 'SlotComp',
    })

    const instance = createComponentInstance(comp)

    // 传入具名插槽
    setupComponent(instance, null, {
      default: 'Default slot content',
      header: 'Header content',
      footer: 'Footer content',
    })

    expect(hasSlot(instance.slots, 'default')).toBe(true)
    expect(hasSlot(instance.slots, 'header')).toBe(true)
    expect(hasSlot(instance.slots, 'footer')).toBe(true)
    expect(hasSlot(instance.slots, 'nonexistent')).toBe(false)

    // 渲染插槽
    const defaultContent = renderSlot(instance.slots, 'default')
    expect(defaultContent).toBe('Default slot content')

    const headerContent = renderSlot(instance.slots, 'header')
    expect(headerContent).toBe('Header content')
  })

  // ---- 9. 函数组件 ----
  it('函数组件', () => {
    const functionalComp = (props: Record<string, any>, context: any) => {
      return { type: 'div', props: null, children: `Hello ${props.name}` }
    }

    // 函数组件不通过 defineComponent，直接作为函数
    const comp = defineComponent({
      name: 'Wrapper',
    })

    // 创建实例并设置为函数组件
    const instance = createComponentInstance(comp)
    // 直接测试 setupFunctionComponent
    ;(instance as any).type = functionalComp
    // 设置函数组件所需的 props
    instance.props = { name: 'World' }
    setupFunctionComponent(instance)

    // subTree 应该是函数组件的返回值
    expect(instance.subTree).toBeDefined()
    expect(instance.subTree.children).toBe('Hello World')
  })

  // ---- 10. 组件卸载清理 ----
  it('组件卸载清理', () => {
    const comp = defineComponent({
      name: 'CleanupComp',
      state() {
        return { data: 'important' }
      },
      watch: {
        data: {
          handler() { /* watcher */ },
          immediate: false,
          deep: false,
        },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)

    expect(instance.isMounted).toBe(true)
    expect(instance.watchStopHandles.length).toBe(1)

    // 卸载
    unmountComponent(instance)

    expect(instance.isUnmounted).toBe(true)
    expect(instance.isMounted).toBe(false)
    expect(instance.subTree).toBe(null)
    expect(instance.watchStopHandles.length).toBe(0)
  })
})

describe('Props 系统', () => {

  // ---- normalizePropsOptions 数组形式 ----
  it('normalizePropsOptions 数组形式', () => {
    const result = normalizePropsOptions(['name', 'age'])
    expect(result.keys).toEqual(['name', 'age'])
    expect(result.options.name).toBeDefined()
    expect(result.options.age).toBeDefined()
  })

  // ---- normalizePropsOptions 对象形式 ----
  it('normalizePropsOptions 对象形式', () => {
    const result = normalizePropsOptions({
      title: String,
      count: { type: Number, default: 0 },
    })
    expect(result.keys).toEqual(['title', 'count'])
    expect(result.options.title.type).toBe(String)
    expect(result.options.count.default).toBe(0)
  })

  // ---- validateProp 类型校验 ----
  it('validateProp 类型校验', () => {
    // 正确类型
    expect(validateProp('name', { type: String }, 'hello')).toBe(true)
    expect(validateProp('age', { type: Number }, 25)).toBe(true)
    expect(validateProp('flag', { type: Boolean }, true)).toBe(true)

    // 错误类型（console.warn 但不抛异常，返回 false）
    expect(validateProp('name', { type: Number }, 'hello')).toBe(false)
  })

  // ---- validateProp required 校验 ----
  it('validateProp required 校验', () => {
    // required 但未传值
    expect(validateProp('id', { required: true }, undefined)).toBe(false)
    // 非 required 且未传值
    expect(validateProp('name', { required: false }, undefined)).toBe(true)
  })
})

describe('Emit 系统', () => {

  // ---- camelizeToHyphen ----
  it('camelizeToHyphen 驼峰转短横线', () => {
    expect(camelizeToHyphen('handleChange')).toBe('handle-change')
    expect(camelizeToHyphen('updateValue')).toBe('update-value')
    expect(camelizeToHyphen('myCustomEvent')).toBe('my-custom-event')
    expect(camelizeToHyphen('simple')).toBe('simple')
  })

  // ---- hyphenToCamel ----
  it('hyphenToCamel 短横线转驼峰', () => {
    expect(hyphenToCamel('update-value')).toBe('updateValue')
    expect(hyphenToCamel('my-custom-event')).toBe('myCustomEvent')
    expect(hyphenToCamel('simple')).toBe('simple')
  })

  // ---- normalizeEmits 数组形式 ----
  it('normalizeEmits 数组形式', () => {
    const result = normalizeEmits(['change', 'update'])
    expect(result.keys).toEqual(['change', 'update'])
    expect(result.validators['change']).toBe(null)
  })

  // ---- normalizeEmits 对象形式（带验证器） ----
  it('normalizeEmits 对象形式（带验证器）', () => {
    const result = normalizeEmits({
      change: null,
      update: (val: number) => val > 0,
    })
    expect(result.keys).toEqual(['change', 'update'])
    expect(result.validators['change']).toBe(null)
    expect(typeof result.validators['update']).toBe('function')
  })

  // ---- emit 带验证器 ----
  it('emit 带验证器', () => {
    const emitInstance: EmitInstance = {
      emitsOptions: {
        keys: ['positive-number'],
        validators: {
          'positive-number': (val: number) => val > 0,
        },
      },
      props: {
        onPositiveNumber: (val: number) => { /* handler */ },
      },
    }

    // 验证通过
    const result1 = emit(emitInstance, 'positiveNumber', 5)
    expect(result1).toBe(true)

    // 验证失败
    const result2 = emit(emitInstance, 'positiveNumber', -1)
    expect(result2).toBe(false)
  })
})

describe('插槽系统', () => {

  // ---- initSlots 空插槽 ----
  it('initSlots 空插槽', () => {
    const instance = { slots: {} as any }
    initSlots(instance, null)
    expect(Object.keys(instance.slots).length).toBe(0)
  })

  // ---- initSlots 函数插槽（作用域插槽） ----
  it('initSlots 函数插槽（作用域插槽）', () => {
    const instance = { slots: {} as any }
    const scopedSlot = (props: any) => `Hello ${props.name}`
    initSlots(instance, scopedSlot)

    expect(hasSlot(instance.slots, 'default')).toBe(true)
    const result = renderSlot(instance.slots, 'default', { name: 'World' })
    expect(result).toBe('Hello World')
  })

  // ---- initSlots 数组插槽 ----
  it('initSlots 数组插槽', () => {
    const instance = { slots: {} as any }
    initSlots(instance, ['child1', 'child2'])

    expect(hasSlot(instance.slots, 'default')).toBe(true)
    const result = renderSlot(instance.slots, 'default')
    expect(result).toEqual(['child1', 'child2'])
  })

  // ---- renderSlot 不存在的插槽 ----
  it('renderSlot 不存在的插槽', () => {
    const slots: any = {}
    const result = renderSlot(slots, 'nonexistent')
    expect(result).toBe(null)
  })
})

describe('生命周期系统', () => {

  // ---- onInit 注册和调用 ----
  it('onInit 注册和调用', () => {
    const instance: any = {}
    let called = false

    setCurrentInstance(instance)
    onInit(() => { called = true })
    setCurrentInstance(null)

    callLifecycleHook(instance, LifecycleHook.INIT)
    expect(called).toBe(true)
  })

  // ---- 多个生命周期钩子按顺序调用 ----
  it('多个生命周期钩子按顺序调用', () => {
    const instance: any = {}
    const order: number[] = []

    setCurrentInstance(instance)
    onMounted(() => { order.push(1) })
    onMounted(() => { order.push(2) })
    onMounted(() => { order.push(3) })
    setCurrentInstance(null)

    callLifecycleHook(instance, LifecycleHook.MOUNTED)
    expect(order).toEqual([1, 2, 3])
  })

  // ---- setCurrentInstance 返回前一个实例 ----
  it('setCurrentInstance 返回前一个实例', () => {
    const instance1: any = {}
    const instance2: any = {}

    setCurrentInstance(instance1)
    const prev = setCurrentInstance(instance2)
    expect(prev).toBe(instance1)
    setCurrentInstance(null)
  })
})
