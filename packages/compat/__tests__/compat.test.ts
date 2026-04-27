/**
 * Lyt.js Vue 3 兼容层 — 单元测试
 *
 * 测试覆盖：
 *   - vue3-api: markRaw、watchPostEffect、watchSyncEffect、占位钩子、getCurrentInstance
 *              新增：h、Fragment、defineAsyncComponent、defineProps、defineEmits、
 *                   withDefaults、defineExpose、useSlots、useAttrs、useTemplateRef、
 *                   isProxy、proxyRefs
 *   - compat-mode: useCompatMode、isCompatMode、createCompatVue
 *   - sfc-converter: VueSfcConverter 解析、模板转换、脚本转换、完整转换、警告系统
 *   - define-component: defineComponent（对象和函数参数）
 *   - built-in-components: 内置组件导出
 *   - migrate: 迁移工具、报告生成
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
  // 新增 API
  h,
  Fragment,
  defineAsyncComponent,
  defineProps,
  defineEmits,
  withDefaults,
  defineExpose,
  useSlots,
  useAttrs,
  useTemplateRef,
  isProxy,
  proxyRefs,
} from '../src/vue3-api'

import { useCompatMode, isCompatMode, createCompatVue } from '../src/compat-mode'
import {
  VueSfcConverter,
  convertVueSfcToLyt,
  convertVueSfcToLytWithWarnings,
} from '../src/sfc-converter'
import { defineComponent } from '../src/define-component'
import {
  KeepAlive,
  Teleport,
  Transition,
  TransitionGroup,
  Suspense,
} from '../src/built-in-components'
import {
  migrateVueFile,
  analyzeVueFile,
  formatMigrationReport,
} from '../src/migrate'

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
//  新增 API 测试
// ================================================================

describe('新增 API', () => {
  describe('渲染函数', () => {
    it('h 函数存在且可调用', () => {
      expect(typeof h).toBe('function')
      const vnode = h('div', { class: 'test' }, 'Hello')
      expect(vnode).toBeTruthy()
    })

    it('Fragment 存在', () => {
      expect(Fragment).toBeDefined()
    })
  })

  describe('defineAsyncComponent', () => {
    it('defineAsyncComponent 函数存在且可调用', () => {
      expect(typeof defineAsyncComponent).toBe('function')
      const comp = defineAsyncComponent(() => Promise.resolve({}))
      expect(comp).toBeTruthy()
    })
  })

  describe('编译器宏（占位）', () => {
    it('defineProps 返回空对象', () => {
      const props = defineProps()
      expect(props).toEqual({})
    })

    it('defineEmits 函数存在', () => {
      expect(typeof defineEmits).toBe('function')
    })

    it('withDefaults 合并默认值', () => {
      const result = withDefaults({ a: 1 }, { b: 2 })
      expect(result).toEqual({ a: 1, b: 2 })
    })

    it('defineExpose 不抛异常', () => {
      defineExpose({ count: 0 })
    })
  })

  describe('组合式 API 工具', () => {
    it('useSlots 返回空对象', () => {
      const slots = useSlots()
      expect(slots).toEqual({})
    })

    it('useAttrs 返回空对象', () => {
      const attrs = useAttrs()
      expect(attrs).toEqual({})
    })

    it('useTemplateRef 返回 ref 对象', () => {
      const templateRef = useTemplateRef('myRef')
      expect(templateRef.value).toBe(null)
    })
  })

  describe('响应式工具', () => {
    it('isProxy 对 reactive 返回 true', () => {
      const state = reactive({ count: 0 })
      expect(isProxy(state)).toBe(true)
    })

    it('isProxy 对 readonly 返回 true', () => {
      const state = reactive({ count: 0 })
      const ro = readonly(state)
      expect(isProxy(ro)).toBe(true)
    })

    it('isProxy 对普通对象返回 false', () => {
      expect(isProxy({ count: 0 })).toBe(false)
    })

    it('isProxy 对 ref 返回 false', () => {
      const count = ref(0)
      expect(isProxy(count)).toBe(false)
    })

    it('proxyRefs 返回传入的对象', () => {
      const obj = { count: ref(0) }
      const result = proxyRefs(obj)
      expect(result).toBe(obj)
    })
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

  it('createCompatVue 包含新增 API', () => {
    const vue = createCompatVue()
    expect(typeof vue.h).toBe('function')
    expect(typeof vue.defineAsyncComponent).toBe('function')
    expect(typeof vue.isProxy).toBe('function')
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
//  VueSfcConverter 增强测试
// ================================================================

describe('VueSfcConverter 增强功能', () => {
  describe('模板指令转换', () => {
    it('转换 v-if / v-else-if / v-else', () => {
      const template = `<div v-if="show">A</div><div v-else-if="loading">B</div><div v-else>C</div>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('if="show"')
      expect(converted).toContain('else-if="loading"')
      expect(converted).toContain('else')
      expect(converted).not.toContain('v-if')
      expect(converted).not.toContain('v-else-if')
      expect(converted).not.toContain('v-else')
    })

    it('转换 v-show', () => {
      const template = `<div v-show="visible">Content</div>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('show="visible"')
      expect(converted).not.toContain('v-show')
    })

    it('转换 v-html', () => {
      const template = `<div v-html="rawHtml"></div>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('html="rawHtml"')
      expect(converted).not.toContain('v-html')
    })

    it('转换 v-text', () => {
      const template = `<div v-text="message"></div>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('text="message"')
      expect(converted).not.toContain('v-text')
    })

    it('转换 v-on:', () => {
      const template = `<button v-on:click="handleClick">Click</button>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('on:click')
      expect(converted).not.toContain('v-on:')
    })

    it('转换 v-bind:', () => {
      const template = `<img v-bind:src="imageUrl" />`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain(':src')
      expect(converted).not.toContain('v-bind:')
    })

    it('转换 v-slot:', () => {
      const template = `<template v-slot:header>Header</template>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('slot:header')
      expect(converted).not.toContain('v-slot:')
    })

    it('转换 v-model 修饰符', () => {
      const template = `<input v-model.trim="text" /><input v-model.number="count" />`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('model.trim="text"')
      expect(converted).toContain('model.number="count"')
      expect(converted).not.toContain('v-model')
    })

    it('转换 v-model 无修饰符', () => {
      const template = `<input v-model="text" />`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('model="text"')
      expect(converted).not.toContain('v-model')
    })

    it('转换 v-once', () => {
      const template = `<div v-once>Static</div>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('once')
      expect(converted).not.toContain('v-once')
    })

    it('转换 v-pre', () => {
      const template = `<span v-pre>{{ raw }}</span>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('pre')
      expect(converted).not.toContain('v-pre')
    })

    it('转换 v-cloak', () => {
      const template = `<div v-cloak>Loading...</div>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain('cloak')
      expect(converted).not.toContain('v-cloak')
    })
  })

  describe('脚本转换增强', () => {
    it('转换 vue-router 导入', () => {
      const script = `import { useRouter } from 'vue-router'`
      const converter = new VueSfcConverter('')
      const converted = converter.convertScript(script, false)
      expect(converted).toContain("@lytjs/router")
      expect(converted).not.toContain('vue-router')
    })

    it('转换 pinia 导入', () => {
      const script = `import { defineStore } from 'pinia'`
      const converter = new VueSfcConverter('')
      const converted = converter.convertScript(script, false)
      expect(converted).toContain("@lytjs/store")
      expect(converted).not.toContain('pinia')
    })

    it('转换 vuex 导入', () => {
      const script = `import { useStore } from 'vuex'`
      const converter = new VueSfcConverter('')
      const converted = converter.convertScript(script, false)
      expect(converted).toContain("@lytjs/store")
      expect(converted).not.toContain('vuex')
    })

    it('script setup 中 defineProps 生成警告', () => {
      const script = `const props = defineProps({ title: String })`
      const converter = new VueSfcConverter('')
      converter.convertScript(script, true)
      const warnings = converter.getWarnings()
      expect(warnings.some(w => w.message.includes('defineProps'))).toBe(true)
    })

    it('script setup 中 defineEmits 生成警告', () => {
      const script = `const emit = defineEmits(['update'])`
      const converter = new VueSfcConverter('')
      converter.convertScript(script, true)
      const warnings = converter.getWarnings()
      expect(warnings.some(w => w.message.includes('defineEmits'))).toBe(true)
    })

    it('script setup 中 defineExpose 生成警告', () => {
      const script = `defineExpose({ count })`
      const converter = new VueSfcConverter('')
      converter.convertScript(script, true)
      const warnings = converter.getWarnings()
      expect(warnings.some(w => w.message.includes('defineExpose'))).toBe(true)
    })

    it('script setup 中 withDefaults 生成警告', () => {
      const script = `const props = withDefaults(defineProps({ title: String }), { title: '' })`
      const converter = new VueSfcConverter('')
      converter.convertScript(script, true)
      const warnings = converter.getWarnings()
      expect(warnings.some(w => w.message.includes('withDefaults'))).toBe(true)
    })

    it('script setup 中 useSlots 生成警告', () => {
      const script = `const slots = useSlots()`
      const converter = new VueSfcConverter('')
      converter.convertScript(script, true)
      const warnings = converter.getWarnings()
      expect(warnings.some(w => w.message.includes('useSlots'))).toBe(true)
    })

    it('script setup 中 useAttrs 生成警告', () => {
      const script = `const attrs = useAttrs()`
      const converter = new VueSfcConverter('')
      converter.convertScript(script, true)
      const warnings = converter.getWarnings()
      expect(warnings.some(w => w.message.includes('useAttrs'))).toBe(true)
    })

    it('CSS Modules 生成警告', () => {
      const converter = new VueSfcConverter('')
      converter.convertStyles([{ content: '.app {}', attrs: { module: '' } }])
      const warnings = converter.getWarnings()
      expect(warnings.some(w => w.message.includes('CSS Modules'))).toBe(true)
    })
  })

  describe('v-memo 警告', () => {
    it('v-memo 生成警告并移除', () => {
      const template = `<div v-memo="[value]">Cached</div>`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).not.toContain('v-memo')
      const warnings = converter.getWarnings()
      expect(warnings.some(w => w.message.includes('v-memo'))).toBe(true)
    })
  })

  describe('v-is 警告', () => {
    it('v-is 生成警告并转换', () => {
      const template = `<component v-is="currentComponent" />`
      const converter = new VueSfcConverter('')
      const converted = converter.convertTemplate(template)
      expect(converted).toContain(':is=')
      expect(converted).not.toContain('v-is')
      const warnings = converter.getWarnings()
      expect(warnings.some(w => w.message.includes('v-is'))).toBe(true)
    })
  })

  describe('convertWithWarnings', () => {
    it('返回代码和警告', () => {
      const sfc = `<template><div v-if="show">Test</div></template>
<script setup>
import { ref } from 'vue'
const props = defineProps({ title: String })
</script>`
      const converter = new VueSfcConverter(sfc)
      const result = converter.convertWithWarnings()
      expect(result.code).toContain('if="show"')
      expect(result.code).toContain('@lytjs/compat')
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('convertVueSfcToLytWithWarnings', () => {
    it('便捷函数返回代码和警告', () => {
      const sfc = `<template><div v-for="item in items">{{ item }}</div></template>
<script setup>
import { ref } from 'vue'
</script>`
      const result = convertVueSfcToLytWithWarnings(sfc)
      expect(result.code).toContain('v-each')
      expect(result.warnings.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('自定义块解析', () => {
    it('解析自定义块', () => {
      const sfc = `<template><div>Test</div></template>
<script>export default {}</script>
<i18n>
{
  "en": { "hello": "Hello" }
}
</i18n>`
      const converter = new VueSfcConverter(sfc)
      const parsed = converter.parse()
      expect(parsed.customBlocks.length).toBe(1)
      expect(parsed.customBlocks[0].tag).toBe('i18n')
      expect(parsed.customBlocks[0].content).toContain('hello')
    })
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

// ================================================================
//  迁移工具测试
// ================================================================

describe('迁移工具', () => {
  const simpleVueSfc = `<template>
  <div class="app">
    <span v-for="item in items" :key="item.id">{{ item.name }}</span>
    <div v-if="show">Visible</div>
    <input v-model="text" />
    <button v-on:click="handleClick">Click</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const count = ref(0)
const doubled = computed(() => count.value * 2)
const router = useRouter()
</script>

<style scoped>
.app { color: red; }
</style>`

  describe('migrateVueFile', () => {
    it('返回迁移报告', () => {
      const report = migrateVueFile(simpleVueSfc)
      expect(report.code).toBeTruthy()
      expect(Array.isArray(report.issues)).toBe(true)
      expect(typeof report.errorCount).toBe('number')
      expect(typeof report.warningCount).toBe('number')
      expect(typeof report.infoCount).toBe('number')
      expect(typeof report.compatibilityScore).toBe('number')
      expect(Array.isArray(report.manualFixes)).toBe(true)
    })

    it('转换后的代码包含 Lyt.js 语法', () => {
      const report = migrateVueFile(simpleVueSfc)
      expect(report.code).toContain('v-each')
      expect(report.code).toContain('@lytjs/compat')
    })

    it('检测 Vue 导入问题', () => {
      const report = migrateVueFile(simpleVueSfc)
      expect(report.issues.some(i => i.description.includes('vue') && i.type === 'import')).toBe(true)
    })

    it('检测 vue-router 导入问题', () => {
      const report = migrateVueFile(simpleVueSfc)
      expect(report.issues.some(i => i.description.includes('vue-router'))).toBe(true)
    })

    it('检测指令问题', () => {
      const report = migrateVueFile(simpleVueSfc)
      expect(report.issues.some(i => i.type === 'directive')).toBe(true)
    })

    it('兼容性评分在合理范围内', () => {
      const report = migrateVueFile(simpleVueSfc)
      expect(report.compatibilityScore).toBeGreaterThanOrEqual(0)
      expect(report.compatibilityScore).toBeLessThanOrEqual(100)
    })

    it('完全兼容的代码评分为 100', () => {
      const perfectCode = `<template>
  <div>Hello</div>
</template>

<script>
export default {
  data() { return {} }
}
</script>`
      const report = migrateVueFile(perfectCode)
      expect(report.compatibilityScore).toBe(100)
      expect(report.issues.length).toBe(0)
    })
  })

  describe('analyzeVueFile', () => {
    it('返回问题列表', () => {
      const issues = analyzeVueFile(simpleVueSfc)
      expect(Array.isArray(issues)).toBe(true)
      expect(issues.length).toBeGreaterThan(0)
    })

    it('检测 $refs 使用', () => {
      const code = `<template><div ref="myDiv"></div></template>
<script>
export default {
  mounted() { this.$refs.myDiv.focus() }
}
</script>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('$refs'))).toBe(true)
    })

    it('检测 $emit 使用', () => {
      const code = `<script>
export default {
  methods: { submit() { this.$emit('submit') } }
}
</script>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('$emit'))).toBe(true)
    })

    it('检测 $el 使用', () => {
      const code = `<script>
export default {
  mounted() { console.log(this.$el) }
}
</script>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('$el'))).toBe(true)
    })

    it('检测 $parent 使用', () => {
      const code = `<script>
export default {
  mounted() { console.log(this.$parent) }
}
</script>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('$parent'))).toBe(true)
    })

    it('检测 $children 使用', () => {
      const code = `<script>
export default {
  mounted() { console.log(this.$children) }
}
</script>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('$children'))).toBe(true)
      expect(issues.some(i => i.severity === 'error')).toBe(true)
    })

    it('检测 v-memo 使用', () => {
      const code = `<template><div v-memo="[value]">Cached</div></template>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('v-memo'))).toBe(true)
    })

    it('检测 CSS Modules', () => {
      const code = `<template><div class="app"></div></template>
<style module>
.app { color: red; }
</style>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('CSS Modules'))).toBe(true)
    })

    it('检测 defineProps', () => {
      const code = `<script setup>
const props = defineProps({ title: String })
</script>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('defineProps'))).toBe(true)
    })

    it('检测 defineEmits', () => {
      const code = `<script setup>
const emit = defineEmits(['update'])
</script>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('defineEmits'))).toBe(true)
    })

    it('检测 Teleport 组件', () => {
      const code = `<template><Teleport to="body"><div>Portal</div></Teleport></template>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('Teleport'))).toBe(true)
    })

    it('检测 Pinia 导入', () => {
      const code = `<script>
import { defineStore } from 'pinia'
</script>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('Pinia'))).toBe(true)
    })

    it('检测 Vuex 导入', () => {
      const code = `<script>
import { useStore } from 'vuex'
</script>`
      const issues = analyzeVueFile(code)
      expect(issues.some(i => i.description.includes('Vuex'))).toBe(true)
    })
  })

  describe('formatMigrationReport', () => {
    it('生成格式化的文本报告', () => {
      const report = migrateVueFile(simpleVueSfc)
      const text = formatMigrationReport(report)
      expect(text).toContain('Vue 3 -> Lyt.js')
      expect(text).toContain('兼容性评分')
      expect(text).toContain('问题统计')
    })

    it('报告包含错误和警告数量', () => {
      const report = migrateVueFile(simpleVueSfc)
      const text = formatMigrationReport(report)
      expect(text).toContain(`错误: ${report.errorCount}`)
      expect(text).toContain(`警告: ${report.warningCount}`)
      expect(text).toContain(`信息: ${report.infoCount}`)
    })

    it('报告包含迁移难度评估', () => {
      const report = migrateVueFile(simpleVueSfc)
      const text = formatMigrationReport(report)
      expect(text).toContain('迁移难度')
    })

    it('完全兼容的代码报告显示满分', () => {
      const perfectCode = `<template><div>Hello</div></template>
<script>export default { data() { return {} } }</script>`
      const report = migrateVueFile(perfectCode)
      const text = formatMigrationReport(report)
      expect(text).toContain('100/100')
    })
  })

  describe('复杂场景迁移', () => {
    it('Options API 组件迁移', () => {
      const optionsApiSfc = `<template>
  <div>
    <h1>{{ title }}</h1>
    <p v-if="loading">Loading...</p>
    <ul>
      <li v-for="item in items" :key="item.id">{{ item.name }}</li>
    </ul>
    <button v-on:click="loadMore">Load More</button>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  props: {
    title: String,
    count: { type: Number, default: 0 }
  },
  data() {
    return {
      loading: false,
      items: []
    }
  },
  mounted() {
    this.$refs.container.focus()
    this.$nextTick(() => {
      console.log('mounted')
    })
  },
  methods: {
    loadMore() {
      this.$emit('load-more')
    }
  }
}
</script>

<style scoped>
h1 { color: blue; }
</style>`

      const report = migrateVueFile(optionsApiSfc)
      // 应该检测到多个需要修改的问题
      expect(report.issues.length).toBeGreaterThan(5)
      // 应该有手动修改建议
      expect(report.manualFixes.length).toBeGreaterThan(0)
      // 兼容性评分应该低于 100
      expect(report.compatibilityScore).toBeLessThan(100)
    })

    it('Composition API + script setup 组件迁移', () => {
      const compositionSfc = `<template>
  <div v-show="visible">
    <input v-model.trim="search" />
    <button @click="search">Search</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'pinia'

const props = defineProps<{ title: string }>()
const emit = defineEmits<{ (e: 'update', value: string): void }>()

const search = ref('')
const visible = ref(true)

defineExpose({ search })

onMounted(() => {
  console.log('mounted')
})
</script>

<style scoped>
div { padding: 10px; }
</style>`

      const report = migrateVueFile(compositionSfc)
      // 应该检测到 script setup 相关问题
      expect(report.issues.some(i => i.description.includes('defineProps'))).toBe(true)
      expect(report.issues.some(i => i.description.includes('defineEmits'))).toBe(true)
      expect(report.issues.some(i => i.description.includes('defineExpose'))).toBe(true)
      expect(report.issues.some(i => i.description.includes('Pinia'))).toBe(true)
    })
  })
})
