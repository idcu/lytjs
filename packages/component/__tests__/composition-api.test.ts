/**
 * Lyt.js Composition API — 单元测试
 *
 * 测试 Composition API 的所有功能：
 * - 生命周期钩子（onMounted / onUnmounted / onUpdated / onBeforeMount / onBeforeUnmount）
 * - provide / inject 依赖注入
 * - setup 返回对象合并到 ctx
 * - setup 返回函数作为 render
 * - setup 中使用 reactive / ref / computed / watch
 * - getCurrentInstance
 * - 多个生命周期钩子按顺序执行
 * - 与 Options API 兼容性
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
  mountComponent,
  updateComponent,
  unmountComponent,
} from '../src/index'

import {
  onMounted,
  onUnmounted,
  onUpdated,
  onBeforeMount,
  onBeforeUnmount,
  provide,
  inject,
  getCurrentInstance,
  runSetup,
} from '../src/composition-api'

import {
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  isRef,
  toRaw,
} from '../../reactivity/src/index'

// ================================================================
//  测试用例
// ================================================================

describe('Composition API — onMounted', () => {

  // ---- 1. onMounted 注册和执行 ----
  it('onMounted 注册和执行', () => {
    let called = false
    const comp = defineComponent({
      name: 'MountedComp',
      setup(props: any, ctx: any) {
        onMounted(() => { called = true })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    expect(called).toBe(false)

    mountComponent(instance)
    expect(called).toBe(true)
  })

  // ---- 2. onMounted 在 setup 外调用不注册 ----
  it('onMounted 在 setup 外调用不注册', () => {
    let called = false
    onMounted(() => { called = true })

    const comp = defineComponent({
      name: 'NoSetupComp',
    })
    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)

    expect(called).toBe(false)
  })
})

describe('Composition API — onUnmounted', () => {

  // ---- 3. onUnmounted 注册和执行 ----
  it('onUnmounted 注册和执行', () => {
    let called = false
    const comp = defineComponent({
      name: 'UnmountedComp',
      setup(props: any, ctx: any) {
        onUnmounted(() => { called = true })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)
    expect(called).toBe(false)

    unmountComponent(instance)
    expect(called).toBe(true)
  })
})

describe('Composition API — onUpdated', () => {

  // ---- 4. onUpdated 注册和执行 ----
  it('onUpdated 注册和执行', () => {
    let called = false
    const comp = defineComponent({
      name: 'UpdatedComp',
      setup(props: any, ctx: any) {
        onUpdated(() => { called = true })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)
    expect(called).toBe(false)

    updateComponent(instance)
    expect(called).toBe(true)
  })
})

describe('Composition API — onBeforeMount', () => {

  // ---- 5. onBeforeMount 注册和执行 ----
  it('onBeforeMount 注册和执行', () => {
    const order: string[] = []
    const comp = defineComponent({
      name: 'BeforeMountComp',
      setup(props: any, ctx: any) {
        onBeforeMount(() => { order.push('beforeMount') })
        onMounted(() => { order.push('mounted') })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)

    expect(order).toEqual(['beforeMount', 'mounted'])
  })
})

describe('Composition API — onBeforeUnmount', () => {

  // ---- 6. onBeforeUnmount 注册和执行 ----
  it('onBeforeUnmount 注册和执行', () => {
    const order: string[] = []
    const comp = defineComponent({
      name: 'BeforeUnmountComp',
      setup(props: any, ctx: any) {
        onBeforeUnmount(() => { order.push('beforeUnmount') })
        onUnmounted(() => { order.push('unmounted') })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)
    unmountComponent(instance)

    expect(order).toEqual(['beforeUnmount', 'unmounted'])
  })
})

describe('Composition API — 多个生命周期钩子按顺序执行', () => {

  // ---- 7. 多个 onMounted 按注册顺序执行 ----
  it('多个 onMounted 按注册顺序执行', () => {
    const order: number[] = []
    const comp = defineComponent({
      name: 'MultiMountedComp',
      setup(props: any, ctx: any) {
        onMounted(() => { order.push(1) })
        onMounted(() => { order.push(2) })
        onMounted(() => { order.push(3) })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)

    expect(order).toEqual([1, 2, 3])
  })

  // ---- 8. 多个 onUnmounted 按注册顺序执行 ----
  it('多个 onUnmounted 按注册顺序执行', () => {
    const order: number[] = []
    const comp = defineComponent({
      name: 'MultiUnmountedComp',
      setup(props: any, ctx: any) {
        onUnmounted(() => { order.push(1) })
        onUnmounted(() => { order.push(2) })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)
    unmountComponent(instance)

    expect(order).toEqual([1, 2])
  })

  // ---- 9. 多个 onUpdated 按注册顺序执行 ----
  it('多个 onUpdated 按注册顺序执行', () => {
    const order: number[] = []
    const comp = defineComponent({
      name: 'MultiUpdatedComp',
      setup(props: any, ctx: any) {
        onUpdated(() => { order.push(1) })
        onUpdated(() => { order.push(2) })
        onUpdated(() => { order.push(3) })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)
    updateComponent(instance)

    expect(order).toEqual([1, 2, 3])
  })

  // ---- 10. 完整生命周期执行顺序 ----
  it('完整生命周期执行顺序', () => {
    const order: string[] = []
    const comp = defineComponent({
      name: 'FullLifecycleComp',
      setup(props: any, ctx: any) {
        onBeforeMount(() => { order.push('setup:beforeMount') })
        onMounted(() => { order.push('setup:mounted') })
        onUpdated(() => { order.push('setup:updated') })
        onBeforeUnmount(() => { order.push('setup:beforeUnmount') })
        onUnmounted(() => { order.push('setup:unmounted') })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)
    updateComponent(instance)
    unmountComponent(instance)

    expect(order).toEqual([
      'setup:beforeMount',
      'setup:mounted',
      'setup:updated',
      'setup:beforeUnmount',
      'setup:unmounted',
    ])
  })
})

describe('Composition API — provide / inject', () => {

  // ---- 11. provide/inject 基本功能 ----
  it('provide/inject 基本功能', () => {
    let injected: any = undefined
    const parentComp = defineComponent({
      name: 'ParentComp',
      setup(props: any, ctx: any) {
        provide('message', 'hello from parent')
        return {}
      },
    })

    const childComp = defineComponent({
      name: 'ChildComp',
      setup(props: any, ctx: any) {
        injected = inject('message')
        return {}
      },
    })

    const parentInstance = createComponentInstance(parentComp)
    setupComponent(parentInstance)

    const childInstance = createComponentInstance(childComp)
    // 手动设置 _parent 链
    ;(childInstance as any)._parent = parentInstance
    setupComponent(childInstance)

    expect(injected).toBe('hello from parent')
  })

  // ---- 12. provide/inject 跨层级 ----
  it('provide/inject 跨层级', () => {
    let injected: any = undefined
    const grandparentComp = defineComponent({
      name: 'GrandparentComp',
      setup(props: any, ctx: any) {
        provide('theme', 'dark')
        return {}
      },
    })

    const parentComp = defineComponent({
      name: 'MiddleComp',
      setup(props: any, ctx: any) {
        return {}
      },
    })

    const childComp = defineComponent({
      name: 'GrandchildComp',
      setup(props: any, ctx: any) {
        injected = inject('theme')
        return {}
      },
    })

    const gpInstance = createComponentInstance(grandparentComp)
    setupComponent(gpInstance)

    const pInstance = createComponentInstance(parentComp)
    ;(pInstance as any)._parent = gpInstance
    setupComponent(pInstance)

    const cInstance = createComponentInstance(childComp)
    ;(cInstance as any)._parent = pInstance
    setupComponent(cInstance)

    expect(injected).toBe('dark')
  })

  // ---- 13. inject 默认值 ----
  it('inject 默认值', () => {
    let injected: any = undefined
    const comp = defineComponent({
      name: 'DefaultInjectComp',
      setup(props: any, ctx: any) {
        injected = inject('nonexistent', 'default value')
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect(injected).toBe('default value')
  })

  // ---- 14. inject 未找到且无默认值返回 undefined ----
  it('inject 未找到且无默认值返回 undefined', () => {
    let injected: any = 'should-be-undefined'
    const comp = defineComponent({
      name: 'NoDefaultInjectComp',
      setup(props: any, ctx: any) {
        injected = inject('nonexistent')
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect(injected).toBe(undefined)
  })

  // ---- 15. provide 覆盖（就近原则） ----
  it('provide 覆盖（就近原则）', () => {
    let injected: any = undefined
    const grandparentComp = defineComponent({
      name: 'GPComp',
      setup(props: any, ctx: any) {
        provide('key', 'grandparent')
        return {}
      },
    })

    const parentComp = defineComponent({
      name: 'PComp',
      setup(props: any, ctx: any) {
        provide('key', 'parent')
        return {}
      },
    })

    const childComp = defineComponent({
      name: 'CComp',
      setup(props: any, ctx: any) {
        injected = inject('key')
        return {}
      },
    })

    const gpInstance = createComponentInstance(grandparentComp)
    setupComponent(gpInstance)

    const pInstance = createComponentInstance(parentComp)
    ;(pInstance as any)._parent = gpInstance
    setupComponent(pInstance)

    const cInstance = createComponentInstance(childComp)
    ;(cInstance as any)._parent = pInstance
    setupComponent(cInstance)

    expect(injected).toBe('parent')
  })

  // ---- 16. provide/inject 使用 symbol 作为 key ----
  it('provide/inject 使用 symbol 作为 key', () => {
    const symKey = Symbol('my-key')
    let injected: any = undefined
    const parentComp = defineComponent({
      name: 'SymParentComp',
      setup(props: any, ctx: any) {
        provide(symKey, { value: 42 })
        return {}
      },
    })

    const childComp = defineComponent({
      name: 'SymChildComp',
      setup(props: any, ctx: any) {
        injected = inject(symKey)
        return {}
      },
    })

    const parentInstance = createComponentInstance(parentComp)
    setupComponent(parentInstance)

    const childInstance = createComponentInstance(childComp)
    ;(childInstance as any)._parent = parentInstance
    setupComponent(childInstance)

    expect(injected).toBeDefined()
    expect(injected.value).toBe(42)
  })
})

describe('Composition API — setup 返回对象合并到 ctx', () => {

  // ---- 17. setup 返回对象合并到 renderProxy ----
  it('setup 返回对象合并到 renderProxy', () => {
    const comp = defineComponent({
      name: 'SetupReturnObjComp',
      setup(props: any, ctx: any) {
        return {
          count: 0,
          message: 'hello',
          increment() { return 'incremented' },
        }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect((instance.renderProxy as any).count).toBe(0)
    expect((instance.renderProxy as any).message).toBe('hello')
    expect(typeof (instance.renderProxy as any).increment).toBe('function')
    expect((instance.renderProxy as any).increment()).toBe('incremented')
  })

  // ---- 18. setup 返回对象与 state 共存 ----
  it('setup 返回对象与 state 共存', () => {
    const comp = defineComponent({
      name: 'SetupAndStateComp',
      state() {
        return { localCount: 10 }
      },
      setup(props: any, ctx: any) {
        return { setupCount: 20 }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect((instance.renderProxy as any).setupCount).toBe(20)
    expect((instance.renderProxy as any).localCount).toBe(10)
  })
})

describe('Composition API — setup 返回函数作为 render', () => {

  // ---- 19. setup 返回函数作为 render ----
  it('setup 返回函数作为 render', () => {
    const comp = defineComponent({
      name: 'SetupReturnFnComp',
      setup(props: any, ctx: any) {
        return (h: any, instance: any) => {
          return { type: 'div', props: null, children: 'rendered by setup' }
        }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance, (() => {}) as any)

    expect(instance.subTree).toBeDefined()
    expect(instance.subTree.children).toBe('rendered by setup')
  })
})

describe('Composition API — setup 中使用 reactive/ref', () => {

  // ---- 20. setup 中使用 ref ----
  it('setup 中使用 ref', () => {
    const comp = defineComponent({
      name: 'SetupRefComp',
      setup(props: any, ctx: any) {
        const count = ref(0)
        return { count }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    const countRef = (instance.renderProxy as any).count
    expect(isRef(countRef)).toBe(true)
    expect(countRef.value).toBe(0)

    countRef.value = 5
    expect(countRef.value).toBe(5)
  })

  // ---- 21. setup 中使用 reactive ----
  it('setup 中使用 reactive', () => {
    const comp = defineComponent({
      name: 'SetupReactiveComp',
      setup(props: any, ctx: any) {
        const state = reactive({ name: 'lyt', count: 0 })
        return { state }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    const state = (instance.renderProxy as any).state
    expect(state.name).toBe('lyt')
    expect(state.count).toBe(0)

    state.count = 10
    expect(state.count).toBe(10)
  })
})

describe('Composition API — setup 中使用 computed', () => {

  // ---- 22. setup 中使用 computed ----
  it('setup 中使用 computed', () => {
    const comp = defineComponent({
      name: 'SetupComputedComp',
      setup(props: any, ctx: any) {
        const count = ref(3)
        const double = computed(() => count.value * 2)
        return { count, double }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    const double = (instance.renderProxy as any).double
    expect(double.value).toBe(6)

    ;(instance.renderProxy as any).count.value = 5
    expect(double.value).toBe(10)
  })
})

describe('Composition API — setup 中使用 watch', () => {

  // ---- 23. setup 中使用 watch ----
  it('setup 中使用 watch', () => {
    const changes: number[] = []
    const comp = defineComponent({
      name: 'SetupWatchComp',
      setup(props: any, ctx: any) {
        const count = ref(0)
        watch(
          () => count.value,
          (newVal: number, oldVal: number) => {
            changes.push(newVal)
          },
          { flush: 'sync' }
        )
        return { count }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    const countRef = (instance.renderProxy as any).count
    countRef.value = 1
    countRef.value = 2
    countRef.value = 3

    expect(changes.length).toBe(3)
    expect(changes).toEqual([1, 2, 3])
  })
})

describe('Composition API — getCurrentInstance', () => {

  // ---- 24. getCurrentInstance 在 setup 中返回当前实例 ----
  it('getCurrentInstance 在 setup 中返回当前实例', () => {
    let capturedInstance: any = null
    const comp = defineComponent({
      name: 'GetInstanceComp',
      setup(props: any, ctx: any) {
        capturedInstance = getCurrentInstance()
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect(capturedInstance).toBe(instance)
  })

  // ---- 25. getCurrentInstance 在 setup 外返回 null ----
  it('getCurrentInstance 在 setup 外返回 null', () => {
    expect(getCurrentInstance()).toBe(null)
  })
})

describe('Composition API — runSetup', () => {

  // ---- 26. runSetup 正确设置和恢复实例上下文 ----
  it('runSetup 正确设置和恢复实例上下文', () => {
    let instanceDuringSetup: any = null
    const comp = defineComponent({
      name: 'RunSetupComp',
    })

    const instance = createComponentInstance(comp)
    const mockInstance = { _parent: null }

    runSetup(
      () => {
        instanceDuringSetup = getCurrentInstance()
        return { result: 'ok' }
      },
      mockInstance,
      {},
      {}
    )

    expect(instanceDuringSetup).toBe(mockInstance)
    // runSetup 执行后，currentSetupInstance 应恢复为 null
    expect(getCurrentInstance()).toBe(null)
  })

  // ---- 27. runSetup 返回函数 ----
  it('runSetup 返回函数', () => {
    const renderFn = () => 'render result'
    const comp = defineComponent({
      name: 'RunSetupFnComp',
    })

    const instance = createComponentInstance(comp)

    const result = runSetup(
      () => renderFn,
      instance,
      {},
      {}
    )

    expect(typeof result).toBe('function')
    expect(result).toBe(renderFn)
  })

  // ---- 28. runSetup 返回对象 ----
  it('runSetup 返回对象', () => {
    const comp = defineComponent({
      name: 'RunSetupObjComp',
    })

    const instance = createComponentInstance(comp)

    const result = runSetup(
      () => ({ foo: 'bar', num: 42 }),
      instance,
      {},
      {}
    )

    expect(result).toBeDefined()
    expect(result.foo).toBe('bar')
    expect(result.num).toBe(42)
  })
})

describe('Composition API — 与 Options API 兼容性', () => {

  // ---- 29. setup 与 Options API 共存 ----
  it('setup 与 Options API 共存', () => {
    let setupCalled = false
    let initCalled = false

    const comp = defineComponent({
      name: 'MixedComp',
      state() {
        return { optionState: 'from-options' }
      },
      init() {
        initCalled = true
        return { initResult: 'from-init' }
      },
      setup(props: any, ctx: any) {
        setupCalled = true
        return { setupResult: 'from-setup' }
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect(setupCalled).toBe(true)
    expect(initCalled).toBe(true)

    // setup 返回值和 init 返回值都应可访问
    expect((instance.renderProxy as any).setupResult).toBe('from-setup')
    expect((instance.renderProxy as any).initResult).toBe('from-init')
    expect((instance.renderProxy as any).optionState).toBe('from-options')
  })

  // ---- 30. 无 setup 时组件正常工作 ----
  it('无 setup 时组件正常工作', () => {
    const comp = defineComponent({
      name: 'NoSetupComp',
      state() {
        return { count: 0 }
      },
      methods: {
        increment() {
          this.$setState({ count: this.$state.count + 1 })
        },
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect((instance.renderProxy as any).count).toBe(0)
    ;(instance.renderProxy as any).increment()
    expect((instance.renderProxy as any).count).toBe(1)
  })

  // ---- 31. setup 返回 undefined 时不影响组件 ----
  it('setup 返回 undefined 时不影响组件', () => {
    const comp = defineComponent({
      name: 'UndefinedSetupComp',
      state() {
        return { count: 99 }
      },
      setup(props: any, ctx: any) {
        // 不返回任何值（undefined）
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)

    expect((instance.renderProxy as any).count).toBe(99)
  })
})

describe('Composition API — setup 接收 props 和 ctx', () => {

  // ---- 32. setup 接收正确的 props ----
  it('setup 接收正确的 props', () => {
    let receivedProps: any = null
    const comp = defineComponent({
      name: 'SetupPropsComp',
      props: {
        title: { type: String, default: 'default-title' },
        count: { type: Number, required: true },
      },
      setup(props: any, ctx: any) {
        receivedProps = props
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance, { title: 'hello', count: 42 })

    expect(receivedProps).toBeDefined()
    expect(receivedProps.title).toBe('hello')
    expect(receivedProps.count).toBe(42)
  })

  // ---- 33. setup 接收正确的 ctx ----
  it('setup 接收正确的 ctx', () => {
    let receivedCtx: any = null
    const comp = defineComponent({
      name: 'SetupCtxComp',
      setup(props: any, ctx: any) {
        receivedCtx = ctx
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance, null, { default: 'slot-content' })

    expect(receivedCtx).toBeDefined()
    expect(receivedCtx.attrs).toBeDefined()
    expect(receivedCtx.slots).toBeDefined()
    expect(receivedCtx.emit).toBeDefined()
  })
})

describe('Composition API — 卸载时清理', () => {

  // ---- 34. 卸载后生命周期钩子被清理 ----
  it('卸载后生命周期钩子被清理', () => {
    let callCount = 0
    const comp = defineComponent({
      name: 'CleanupComp',
      setup(props: any, ctx: any) {
        onUnmounted(() => { callCount++ })
        return {}
      },
    })

    const instance = createComponentInstance(comp)
    setupComponent(instance)
    mountComponent(instance)
    unmountComponent(instance)

    expect(callCount).toBe(1)

    // 再次卸载不应触发钩子
    ;(instance as any).isUnmounted = false
    // _lifecycleHooks 已被清理
    expect((instance as any)._lifecycleHooks).toBe(undefined)
  })
})
