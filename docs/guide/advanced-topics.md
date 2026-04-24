# 高级主题

本章节介绍 Lyt.js 的高级特性和最佳实践，帮助你构建高性能、可维护的应用。

## 性能优化

### 1. 组件优化

#### 使用 `v-memo` 缓存组件

`v-memo` 指令可以缓存组件的渲染结果，当依赖项未变化时跳过渲染。

```ts
import { defineComponent, ref } from '@lytjs/core'

const ExpensiveComponent = defineComponent({
  props: { item: Object },
  template: `
    <div v-memo="[item.id]">
      <!-- 复杂的渲染逻辑 -->
      {{ heavyComputation(item) }}
    </div>
  `,
  methods: {
    heavyComputation(item) {
      // 耗时计算
      let result = 0
      for (let i = 0; i < 1000000; i++) {
        result += i
      }
      return result
    }
  }
})
```

#### 合理使用 `v-if` 和 `v-show`

- **v-if**：适合条件不频繁变化的场景，会销毁/重建组件
- **v-show**：适合条件频繁变化的场景，只切换 display 属性

```ts
// 不频繁变化的条件
<div v-if="user.isAdmin">管理面板</div>

// 频繁变化的条件
<div v-show="isVisible">弹窗</div>
```

#### 使用 `key` 优化列表渲染

在 `v-for` 中使用唯一的 `key` 可以帮助 Lyt.js 更高效地更新 DOM。

```ts
// 推荐
<ul>
  <li v-for="item in items" :key="item.id">
    {{ item.name }}
  </li>
</ul>

// 不推荐
<ul>
  <li v-for="(item, index) in items" :key="index">
    {{ item.name }}
  </li>
</ul>
```

### 2. 响应式优化

#### 避免不必要的响应式

对于不需要响应式的数据，使用 `shallowRef` 或 `markRaw` 可以提高性能。

```ts
import { shallowRef, markRaw } from '@lytjs/reactivity'

// 浅响应式（仅顶层属性响应式）
const shallowData = shallowRef({ deep: { nested: 'data' } })

// 非响应式
const rawData = markRaw({ complex: 'object' })
```

#### 使用 `computed` 缓存计算结果

```ts
import { computed } from '@lytjs/core'

const expensiveValue = computed(() => {
  // 复杂计算，会自动缓存
  return heavyComputation()
})
```

#### 合理使用 `watch`

- 使用 `immediate: false` 避免初始执行
- 使用 `deep: false` 避免深层监听
- 使用 `flush: 'post'` 避免多次触发

```ts
watch(
  () => state.user,
  (newUser) => {
    // 处理用户变化
  },
  { deep: false, flush: 'post' }
)
```

### 3. 渲染优化

#### 虚拟滚动

对于长列表，使用虚拟滚动可以显著提高性能。

```ts
import { defineComponent, ref, computed } from '@lytjs/core'

const VirtualList = defineComponent({
  props: { items: Array, itemHeight: Number },
  setup(props) {
    const containerRef = ref(null)
    const visibleCount = ref(20)
    const scrollTop = ref(0)
    
    const visibleItems = computed(() => {
      const start = Math.floor(scrollTop.value / props.itemHeight)
      const end = start + visibleCount.value
      return props.items.slice(start, end)
    })
    
    const offsetY = computed(() => {
      const start = Math.floor(scrollTop.value / props.itemHeight)
      return start * props.itemHeight
    })
    
    return { containerRef, scrollTop, visibleItems, offsetY }
  },
  template: `
    <div 
      ref="containerRef"
      style="height: 400px; overflow-y: auto"
      @scroll="scrollTop = $event.target.scrollTop"
    >
      <div :style="{ height: items.length * itemHeight + 'px', position: 'relative' }">
        <div :style="{ transform: 'translateY(' + offsetY + 'px)', position: 'absolute', width: '100%' }">
          <div 
            v-for="item in visibleItems" 
            :key="item.id"
            :style="{ height: itemHeight + 'px' }"
          >
            {{ item.name }}
          </div>
        </div>
      </div>
    </div>
  `
})
```

#### 批量更新

使用 `nextTick` 或 `$patch` 进行批量更新。

```ts
import { nextTick } from '@lytjs/core'

async function updateData() {
  // 多个状态更新
  state.loading = true
  state.count = 0
  state.items = []
  
  // 等待 DOM 更新完成
  await nextTick()
  
  // 继续处理
  state.loading = false
}
```

### 4. 资源优化

#### 代码分割

使用动态导入实现代码分割。

```ts
// 路由懒加载
const About = () => import('./views/About.vue')

// 组件懒加载
const HeavyComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'))
```

#### 图片优化

- 使用适当的图片格式（WebP、AVIF）
- 实现图片懒加载
- 响应式图片

```ts
const LazyImage = defineComponent({
  props: { src: String, alt: String },
  setup(props) {
    const isLoaded = ref(false)
    
    const handleLoad = () => {
      isLoaded.value = true
    }
    
    return { isLoaded, handleLoad }
  },
  template: `
    <div class="lazy-image-container">
      <img 
        v-if="isLoaded" 
        :src="src" 
        :alt="alt"
        @load="handleLoad"
      />
      <div v-else class="placeholder"></div>
    </div>
  `
})
```

## 自定义渲染器

### 1. 创建自定义渲染器

Lyt.js 支持创建自定义渲染器，用于不同的平台。

```ts
import { createRenderer } from '@lytjs/renderer'

const customRenderer = createRenderer({
  // 创建元素
  createElement(tag) {
    console.log('创建元素:', tag)
    return { tag }
  },
  
  // 插入元素
  insert(el, parent, anchor) {
    console.log('插入元素:', el.tag, '到', parent.tag)
  },
  
  // 删除元素
  remove(el) {
    console.log('删除元素:', el.tag)
  },
  
  // 设置元素属性
  setElementProp(el, key, value) {
    console.log('设置属性:', key, '=', value)
  },
  
  // 监听事件
  addEventListener(el, event, handler) {
    console.log('添加事件监听:', event)
  }
})

// 使用自定义渲染器
const app = customRenderer.createApp({
  template: '<div @click="onClick">Hello</div>',
  methods: {
    onClick() {
      console.log('点击了')
    }
  }
})

// 挂载到自定义容器
app.mount({ tag: 'root' })
```

### 2. 平台特定渲染器

Lyt.js 内置了多种平台的渲染器：

#### DOM 渲染器

```ts
import { createApp } from '@lytjs/core'

const app = createApp({
  template: '<div>Hello DOM</div>'
})

app.mount('#app')
```

#### 服务器端渲染 (SSR)

```ts
import { renderToString } from '@lytjs/renderer/ssr'

const app = createApp({
  template: '<div>Hello SSR</div>'
})

const html = await renderToString(app)
console.log(html) // <div>Hello SSR</div>
```

#### 小程序渲染器

```ts
import { createApp } from '@lytjs/renderer/miniapp'

const app = createApp({
  template: '<view>Hello Miniapp</view>'
})

app.mount()
```

#### 原生渲染器

```ts
import { createApp } from '@lytjs/renderer/native'

const app = createApp({
  template: '<View>Hello Native</View>'
})

app.mount()
```

### 3. 自定义渲染器最佳实践

- **平台适配**：根据目标平台的特性调整渲染逻辑
- **性能优化**：针对特定平台进行性能优化
- **功能扩展**：添加平台特定的功能
- **错误处理**：处理平台特定的错误

## 编译优化

### 1. 模板编译

Lyt.js 编译器会对模板进行优化：

- **静态分析**：识别静态内容并优化
- **树摇**：移除未使用的代码
- **内联**：内联简单的计算
- **缓存**：缓存编译结果

### 2. Vapor 模式

Vapor 模式是一种更高效的渲染模式，适用于简单组件。

```ts
import { defineComponent } from '@lytjs/core'

const VaporComponent = defineComponent({
  // 启用 Vapor 模式
  vapor: true,
  
  props: { message: String },
  
  template: `
    <div class="container">
      <h1>{{ message }}</h1>
      <p>Welcome to Lyt.js</p>
    </div>
  `
})
```

### 3. WebAssembly 编译

Lyt.js 支持将模板编译为 WebAssembly，提高渲染性能。

```ts
// 编译配置
const compilerOptions = {
  target: 'wasm',
  optimize: true
}

// 编译模板
const wasmCode = compileTemplate('<div>{{ message }}</div>', compilerOptions)
```

## 内存管理

### 1. 避免内存泄漏

- **清理定时器**：在组件卸载时清理定时器
- **移除事件监听器**：在组件卸载时移除事件监听器
- **取消订阅**：在组件卸载时取消状态订阅
- **清理引用**：避免循环引用

```ts
import { defineComponent, onMounted, onUnmounted } from '@lytjs/core'

const TimerComponent = defineComponent({
  setup() {
    let timer = null
    
    onMounted(() => {
      timer = setInterval(() => {
        console.log('Tick')
      }, 1000)
    })
    
    onUnmounted(() => {
      if (timer) {
        clearInterval(timer)
      }
    })
    
    return {}
  },
  template: '<div>Timer Component</div>'
})
```

### 2. 内存监控

使用 Lyt.js DevTools 进行内存监控：

- **组件内存使用**：查看各组件的内存占用
- **内存泄漏检测**：检测潜在的内存泄漏
- **性能分析**：分析渲染性能

### 3. 垃圾回收

- **减少对象创建**：避免在渲染函数中创建新对象
- **使用对象池**：复用对象减少 GC 压力
- **及时释放**：不再使用的对象及时设置为 null

```ts
// 避免在渲染中创建新对象
// 不好的做法
const BadComponent = defineComponent({
  template: `
    <div :style="{ color: 'red', fontSize: '16px' }"></div>
  `
})

// 好的做法
const GoodComponent = defineComponent({
  setup() {
    const styles = { color: 'red', fontSize: '16px' }
    return { styles }
  },
  template: `
    <div :style="styles"></div>
  `
})
```

## 服务端渲染 (SSR)

### 1. 基本用法

```ts
import { createApp } from '@lytjs/core'
import { renderToString } from '@lytjs/renderer/ssr'

const app = createApp({
  template: '<div>Hello SSR</div>'
})

// 渲染为字符串
const html = await renderToString(app)
console.log(html) // <div>Hello SSR</div>
```

### 2. 数据预取

```ts
import { defineComponent, ref, onServerPrefetch } from '@lytjs/core'

const DataComponent = defineComponent({
  setup() {
    const data = ref(null)
    
    // 服务端预取数据
    onServerPrefetch(async () => {
      const response = await fetch('https://api.example.com/data')
      data.value = await response.json()
    })
    
    return { data }
  },
  template: `
    <div>
      <div v-if="data">
        {{ data.message }}
      </div>
      <div v-else>Loading...</div>
    </div>
  `
})
```

### 3. 客户端水合 (Hydration)

```ts
// 服务端
const html = await renderToString(app)

// 客户端
import { createApp } from '@lytjs/core'

const app = createApp({
  template: '<div>Hello SSR</div>'
})

// 水合到已渲染的 DOM
app.mount('#app', true) // 第二个参数为 true 表示水合
```

## 高级组件模式

### 1. 高阶组件 (HOC)

```ts
function withErrorBoundary(Component) {
  return defineComponent({
    setup(props, { slots }) {
      return () => {
        try {
          return h(Component, props, slots)
        } catch (error) {
          return h('div', { class: 'error' }, 'An error occurred')
        }
      }
    }
  })
}

// 使用
const SafeComponent = withErrorBoundary(MyComponent)
```

### 2. 渲染属性 (Render Props)

```ts
const List = defineComponent({
  props: { items: Array, renderItem: Function },
  template: `
    <ul>
      <li v-for="item in items" :key="item.id">
        {{ renderItem(item) }}
      </li>
    </ul>
  `
})

// 使用
<List 
  :items="todos"
  :renderItem="(item) => h('div', [
    h('input', { type: 'checkbox', checked: item.done }),
    h('span', item.text)
  ])"
/>
```

### 3. 函数式组件

```ts
const FunctionalComponent = defineComponent({
  functional: true,
  props: { message: String },
  render(h, { props }) {
    return h('div', props.message)
  }
})
```

### 4. 异步组件

```ts
import { defineAsyncComponent } from '@lytjs/core'

const AsyncComponent = defineAsyncComponent({
  loader: () => import('./HeavyComponent.vue'),
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 3000
})
```

## 国际化 (i18n)

### 1. 基本实现

```ts
import { createApp, ref, computed } from '@lytjs/core'

const messages = {
  en: {
    hello: 'Hello',
    welcome: 'Welcome to Lyt.js'
  },
  zh: {
    hello: '你好',
    welcome: '欢迎使用 Lyt.js'
  }
}

const i18n = {
  locale: ref('en'),
  t(key) {
    return messages[this.locale.value][key]
  }
}

const app = createApp({
  setup() {
    const changeLocale = () => {
      i18n.locale.value = i18n.locale.value === 'en' ? 'zh' : 'en'
    }
    
    return { i18n, changeLocale }
  },
  template: `
    <div>
      <h1>{{ i18n.t('hello') }}</h1>
      <p>{{ i18n.t('welcome') }}</p>
      <button @click="changeLocale">切换语言</button>
    </div>
  `
})

app.mount('#app')
```

### 2. 插件集成

```ts
// i18n 插件
const i18nPlugin = {
  install(app, options) {
    const i18n = {
      locale: ref(options.defaultLocale || 'en'),
      messages: options.messages || {},
      t(key) {
        return this.messages[this.locale.value][key] || key
      }
    }
    
    app.provide('i18n', i18n)
    app.config.globalProperties.$i18n = i18n
  }
}

// 使用插件
app.use(i18nPlugin, {
  defaultLocale: 'en',
  messages: {
    en: { hello: 'Hello' },
    zh: { hello: '你好' }
  }
})
```

## 测试策略

### 1. 单元测试

```ts
import { mount } from '@lytjs/test-utils'
import Counter from './Counter.vue'

describe('Counter', () => {
  test('renders initial count', () => {
    const wrapper = mount(Counter)
    expect(wrapper.text()).toContain('Count: 0')
  })
  
  test('increments count when button is clicked', async () => {
    const wrapper = mount(Counter)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Count: 1')
  })
})
```

### 2. 端到端测试

```ts
import { test, expect } from '@playwright/test'

test('counter increments', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.click('button')
  await expect(page.locator('div')).toContainText('Count: 1')
})
```

### 3. 性能测试

```ts
import { performance } from 'perf_hooks'

function measureRender() {
  const start = performance.now()
  // 渲染组件
  const end = performance.now()
  console.log(`Render time: ${end - start}ms`)
}
```

## 部署优化

### 1. 构建优化

```bash
# 生产构建
npm run build

# 分析构建结果
npm run build -- --analyze
```

### 2. 静态资源优化

- **压缩**：压缩 CSS、JavaScript、HTML
- **缓存**：合理设置缓存策略
- **CDN**：使用 CDN 加速静态资源
- **Gzip/Brotli**：启用压缩

### 3. 服务器配置

- **HTTP/2**：启用 HTTP/2
- **HTTPS**：使用 HTTPS
- **Caching**：设置适当的缓存头
- **Compression**：启用服务器端压缩

## 总结

Lyt.js 提供了丰富的高级特性和优化策略，帮助你构建高性能、可维护的应用：

- **性能优化**：组件优化、响应式优化、渲染优化、资源优化
- **自定义渲染器**：支持多平台渲染
- **编译优化**：模板编译、Vapor 模式、WebAssembly 编译
- **内存管理**：避免内存泄漏、内存监控、垃圾回收
- **服务端渲染**：SSR、数据预取、客户端水合
- **高级组件模式**：HOC、Render Props、函数式组件、异步组件
- **国际化**：多语言支持
- **测试策略**：单元测试、端到端测试、性能测试
- **部署优化**：构建优化、静态资源优化、服务器配置

通过掌握这些高级主题，你可以充分发挥 Lyt.js 的潜力，构建出更加专业、高效的前端应用。