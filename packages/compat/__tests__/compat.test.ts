/**
 * Lyt.js Vue 3 兼容层 — 单元测试
 *
 * 测试覆盖：
 *   - vue3-api: markRaw、watchPostEffect、watchSyncEffect、占位钩子、getCurrentInstance
 *   - compat-mode: useCompatMode、isCompatMode、createCompatVue
 *   - sfc-converter: VueSfcConverter 解析、模板转换、脚本转换、完整转换
 *   - define-component: defineComponent（对象和函数参数）
 *   - built-in-components: 内置组件导出
 */

import { describe, it, expect } from '../../test-utils/src/index'

import {
  markRaw,
  watchPostEffect,
  watchSyncEffect,
  onErrorCaptured,
  onRenderTracked,
  onRenderTriggered,
  onActivated,
  onDeactivated,
  onServerPrefetch,
  getCurrentInstance,
  setCurrentInstance,
  getCurrentScope,
  onScopeDispose,
  ref,
  reactive,
  computed,
  watch,
  watchEffect,
  isRef,
  isReactive,
  readonly,
  shallowRef,
  shallowReactive,
  toRaw,
  isReadonly,
  triggerRef,
  toRef,
  toRefs,
  unref,
  nextTick,
  provide,
  inject,
  onMounted,
  onUpdated,
  onUnmounted,
  onBeforeMount,
  onBeforeUpdate,
  onBeforeUnmount,
  effect,
} from '../src/vue3-api'

import { useCompatMode, isCompatMode, createCompatVue } from '../src/compat-mode'
import { VueSfcConverter, convertVueSfcToLyt } from '../src/sfc-converter'
import { defineComponent } from '../src/define-component'
import {
  KeepAlive,
  Teleport,
  Transition,
  TransitionGroup,
  Suspense,
} from '../src/built-in-components'

// ================================================================
//  vue3-api 响应式 API 兼容性测试
// ================================================================

describe('vue3-api 响应式兼容', () => {
  it('ref 基本功能', () => {
    const count = ref(0)
    expect(isRef(count)).toBe(true)
    expect(count.value).toBe(0)
    count.value = 1
    expect(count.value).toBe(1)
  })

  it('reactive 基本功能', () => {
    const state = reactive({ count: 0, name: 'lyt' })
    expect(isReactive(state)).toBe(true)
    expect(state.count).toBe(0)
    state.count = 1
    expect(state.count).toBe(1)
  })

  it('computed 基本功能', () => {
    const count = ref(1)
    const doubled = computed(() => count.value * 2)
    expect(doubled.value).toBe(2)
    count.value = 5
    expect(doubled.value).toBe(10)
  })

  it('watch 基本功能', async () => {
    const count = ref(0)
    let watched = 0
    watch(count, (val) => { watched = val })
    count.value = 1
    await nextTick()
    expect(watched).toBe(1)
  })

  it('watchEffect 基本功能', async () => {
    const count = ref(0)
    let effectCount = 0
    watchEffect(() => { effectCount = count.value })
    count.value = 5
    await nextTick()
    expect(effectCount).toBe(5)
  })

  it('shallowRef 基本功能', () => {
    const obj = shallowRef({ nested: { count: 0 } })
    expect(isRef(obj)).toBe(true)
    expect(obj.value.nested.count).toBe(0)
  })

  it('shallowReactive 基本功能', () => {
    const state = shallowReactive({ nested: { count: 0 } })
    expect(isReactive(state)).toBe(true)
    expect(state.nested.count).toBe(0)
  })

  it('readonly 防止写入', () => {
    const state = reactive({ count: 0 })
    const ro = readonly(state)
    expect(isReadonly(ro)).toBe(true)
  })

  it('toRaw 获取原始对象', () => {
    const state = reactive({ count: 0 })
    const raw = toRaw(state)
    expect(isReactive(raw)).toBe(false)
    expect(raw.count).toBe(0)
  })

  it('toRef / toRefs', () => {
    const state = reactive({ count: 0, name: 'lyt' })
    const countRef = toRef(state, 'count')
    expect(isRef(countRef)).toBe(true)
    expect(countRef.value).toBe(0)

    const refs = toRefs(state)
    expect(isRef(refs.count)).toBe(true)
    expect(isRef(refs.name)).toBe(true)
  })

  it('unref 解包 ref', () => {
    const count = ref(42)
    expect(unref(count)).toBe(42)
    expect(unref(42)).toBe(42)
  })

  it('triggerRef 手动触发', () => {
    const count = shallowRef(0)
    let watched = -1
    watch(count, (val) => { watched = val })
    count.value = 1
    triggerRef(count)
    // triggerRef 应该触发更新
    expect(count.value).toBe(1)
  })

  it('effect 创建副作用', () => {
    const count = ref(0)
    let effectVal = 0
    const runner = effect(() => { effectVal = count.value })
    expect(effectVal).toBe(0)
    count.value = 10
    expect(effectVal).toBe(10)
    runner.stop()
  })
})

// ================================================================
//  markRaw 测试
// ================================================================

describe('markRaw', () => {
  it('标记对象不进行响应式转换', () => {
    const raw = { count: 0 }
    const marked = markRaw(raw)
    expect(marked).toBe(raw)
    expect((marked as any).__v_skip).toBe(true)
  })
})

// ================================================================
//  watchPostEffect / watchSyncEffect 测试
// ================================================================

describe('watchPostEffect / watchSyncEffect', () => {
  it('watchPostEffect 返回停止函数', () => {
    const stop = watchPostEffect(() => {})
    expect(typeof stop).toBe('function')
    stop()
  })

  it('watchSyncEffect 返回停止函数', () => {
    const stop = watchSyncEffect(() => {})
    expect(typeof stop).toBe('function')
    stop()
  })
})

// ================================================================
//  占位钩子测试
// ================================================================

describe('占位生命周期钩子', () => {
  it('onErrorCaptured 不抛异常', () => {
    onErrorCaptured(() => false)
  })

  it('onRenderTracked 不抛异常', () => {
    onRenderTracked(() => {})
  })

  it('onRenderTriggered 不抛异常', () => {
    onRenderTriggered(() => {})
  })

  it('onActivated 不抛异常', () => {
    onActivated(() => {})
  })

  it('onDeactivated 不抛异常', () => {
    onDeactivated(() => {})
  })

  it('onServerPrefetch 不抛异常', () => {
    onServerPrefetch(async () => {})
  })

  it('onScopeDispose 不抛异常', () => {
    onScopeDispose(() => {})
  })
})

// ================================================================
//  getCurrentInstance / getCurrentScope 测试
// ================================================================

describe('getCurrentInstance / getCurrentScope', () => {
  it('初始时 getCurrentInstance 返回 null', () => {
    expect(getCurrentInstance()).toBe(null)
  })

  it('setCurrentInstance 设置实例', () => {
    const mockInstance = { name: 'TestComponent' }
    setCurrentInstance(mockInstance)
    expect(getCurrentInstance()).toBe(mockInstance)
    // 清理
    setCurrentInstance(null)
  })

  it('getCurrentScope 初始返回 null', () => {
    expect(getCurrentScope()).toBe(null)
  })
})

// ================================================================
//  compat-mode 测试
// ================================================================

describe('compat-mode', () => {
  it('useCompatMode 启用兼容模式', () => {
    useCompatMode(true)
    expect(isCompatMode()).toBe(true)
  })

  it('useCompatMode 禁用兼容模式', () => {
    useCompatMode(false)
    expect(isCompatMode()).toBe(false)
  })

  it('createCompatVue 返回包含 Vue API 的对象', () => {
    const vue = createCompatVue()
    expect(vue.version).toBe('3.x (Compat)')
    expect(typeof vue.ref).toBe('function')
    expect(typeof vue.reactive).toBe('function')
    expect(typeof vue.computed).toBe('function')
    expect(typeof vue.watch).toBe('function')
  })
})

// ================================================================
//  VueSfcConverter 测试
// ================================================================

describe('VueSfcConverter', () => {
  const sampleSfc = `<template>
  <div class="app">
    <span v-for="item in items" :key="item.id">{{ item.name }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<style scoped>
.app { color: red; }
</style>`

  it('解析 Vue SFC - template', () => {
    const converter = new VueSfcConverter(sampleSfc)
    const parsed = converter.parse()
    expect(parsed.template).toContain('div class="app"')
    expect(parsed.template).toContain('v-for')
  })

  it('解析 Vue SFC - script setup', () => {
    const converter = new VueSfcConverter(sampleSfc)
    const parsed = converter.parse()
    expect(parsed.scriptSetup).toContain('ref')
    expect(parsed.scriptSetup).toContain('vue')
  })

  it('解析 Vue SFC - styles', () => {
    const converter = new VueSfcConverter(sampleSfc)
    const parsed = converter.parse()
    expect(parsed.styles.length).toBe(1)
    expect(parsed.styles[0].attrs.scoped).toBe('')
    expect(parsed.styles[0].content).toContain('color: red')
  })

  it('解析普通 script（非 setup）', () => {
    const sfc = `<template><div>test</div></template>
<script>
export default {
  data() { return { count: 0 } }
}
</script>`
    const converter = new VueSfcConverter(sfc)
    const parsed = converter.parse()
    expect(parsed.script).toContain('data')
    expect(parsed.scriptSetup).toBe(null)
  })

  it('转换模板语法 - v-for 变为 v-each', () => {
    const converter = new VueSfcConverter(sampleSfc)
    const converted = converter.convertTemplate(converter.parse().template!)
    expect(converted).toContain('v-each')
    expect(converted).not.toContain('v-for')
  })

  it('转换模板语法 - :key 变为 key', () => {
    const converter = new VueSfcConverter(sampleSfc)
    const converted = converter.convertTemplate(converter.parse().template!)
    expect(converted).toContain('key=')
    expect(converted).not.toContain(':key=')
  })

  it('转换脚本 - from "vue" 变为 from "@lytjs/compat"', () => {
    const converter = new VueSfcConverter(sampleSfc)
    const converted = converter.convertScript(converter.parse().scriptSetup!, true)
    expect(converted).toContain("@lytjs/compat")
    expect(converted).not.toContain("from 'vue'")
  })

  it('完整转换', () => {
    const converter = new VueSfcConverter(sampleSfc)
    const result = converter.convert()
    expect(result).toContain('<template>')
    expect(result).toContain('<script setup>')
    expect(result).toContain('<style scoped>')
    expect(result).toContain('v-each')
    expect(result).toContain('@lytjs/compat')
  })

  it('convertVueSfcToLyt 便捷函数', () => {
    const result = convertVueSfcToLyt(sampleSfc)
    expect(result).toContain('v-each')
    expect(result).toContain('@lytjs/compat')
  })

  it('空内容解析', () => {
    const converter = new VueSfcConverter('')
    const parsed = converter.parse()
    expect(parsed.template).toBe(null)
    expect(parsed.script).toBe(null)
    expect(parsed.scriptSetup).toBe(null)
    expect(parsed.styles.length).toBe(0)
  })
})

// ================================================================
//  defineComponent 测试
// ================================================================

describe('defineComponent', () => {
  it('接受对象参数', () => {
    const comp = defineComponent({
      name: 'TestComp',
      setup() {
        return {}
      },
    })
    expect(comp).toBeTruthy()
  })

  it('接受函数参数（setup 函数）', () => {
    const comp = defineComponent(() => {
      return {}
    })
    expect(comp).toBeTruthy()
  })
})

// ================================================================
//  built-in-components 测试
// ================================================================

describe('built-in-components', () => {
  it('导出 KeepAlive', () => {
    expect(KeepAlive).toBeTruthy()
  })

  it('导出 Teleport', () => {
    expect(Teleport).toBeTruthy()
  })

  it('导出 Transition', () => {
    expect(Transition).toBeTruthy()
  })

  it('导出 TransitionGroup', () => {
    expect(TransitionGroup).toBeTruthy()
  })

  it('导出 Suspense', () => {
    expect(Suspense).toBeTruthy()
  })
})
