# 组件系统

Lyt.js 提供完整的组件系统，支持选项式 API 和组合式 API。

## defineComponent()

使用 `defineComponent` 定义组件：

```ts
import { defineComponent, ref, computed } from 'lyt'

const Counter = defineComponent({
  name: 'Counter',

  // Props 声明
  props: {
    initialCount: { type: Number, default: 0 },
    step: { type: Number, default: 1 }
  },

  // 内部状态
  state() {
    return {
      count: ref(0)
    }
  },

  // 初始化
  init() {
    this.count.value = this.$props.initialCount
  },

  // 计算属性
  computed: {
    doubleCount: {
      get() { return this.count.value * 2 },
      set(val) { this.count.value = val / 2 }
    }
  },

  // 方法
  methods: {
    increment() {
      this.count.value += this.$props.step
    },
    decrement() {
      this.count.value -= this.$props.step
    }
  },

  // 模板
  template: `
    <div>
      <p>计数: {{ count }} (双倍: {{ doubleCount }})</p>
      <button @click="decrement">-</button>
      <button @click="increment">+</button>
    </div>
  `
})
```

## Props

Props 是组件的输入，由父组件传递：

```ts
const UserCard = defineComponent({
  props: {
    name: String,
    age: Number,
    address: {
      type: String,
      default: '未知'
    }
  },

  template: `
    <div>
      <h3>{{ name }}</h3>
      <p>年龄: {{ age }}</p>
      <p>地址: {{ address }}</p>
    </div>
  `
})

// 使用
// <UserCard name="张三" :age="25" />
```

## Emits

声明组件可以触发的事件：

```ts
const SearchInput = defineComponent({
  props: {
    modelValue: String
  },

  emits: ['update:modelValue', 'search'],

  methods: {
    onInput(e) {
      this.$emit('update:modelValue', e.target.value)
    },
    onSearch() {
      this.$emit('search', this.$props.modelValue)
    }
  },

  template: `
    <div>
      <input v-bind:model="modelValue" @input="onInput" />
      <button @click="onSearch">搜索</button>
    </div>
  `
})
```

## 插槽

### 默认插槽

```ts
const Card = defineComponent({
  template: `
    <div class="card">
      <div class="card-body">
        <slot></slot>
      </div>
    </div>
  `
})

// 使用
// <Card>这是卡片内容</Card>
```

### 具名插槽

```ts
const Layout = defineComponent({
  template: `
    <div>
      <header><slot name="header"></slot></header>
      <main><slot></slot></main>
      <footer><slot name="footer"></slot></footer>
    </div>
  `
})

// 使用
// <Layout>
//   <template #header>页头</template>
//   <template #default>主要内容</template>
//   <template #footer>页脚</template>
// </Layout>
```

### 作用域插槽

```ts
const List = defineComponent({
  props: {
    items: Array
  },
  template: `
    <ul>
      <li v-each="item in items">
        <slot name="item" :item="item" :index="$index"></slot>
      </li>
    </ul>
  `
})
```

## 生命周期钩子

组件提供完整的生命周期钩子：

```ts
import { defineComponent, onMounted, onUnmounted, onUpdated } from 'lyt'

const MyComponent = defineComponent({
  setup() {
    onMounted(() => {
      console.log('组件已挂载到 DOM')
    })

    onUpdated(() => {
      console.log('组件数据更新，DOM 已重新渲染')
    })

    onUnmounted(() => {
      console.log('组件已从 DOM 卸载')
    })

    return {}
  }
})
```

| 钩子 | 说明 |
|------|------|
| `onInit` | 组件初始化 |
| `onBeforeMount` | 挂载前 |
| `onMounted` | 挂载完成 |
| `onBeforeUpdate` | 更新前 |
| `onUpdated` | 更新完成 |
| `onBeforeUnmount` | 卸载前 |
| `onUnmounted` | 卸载完成 |

## Composition API

使用 `setup()` 函数编写组件逻辑：

```ts
import { defineComponent, ref, computed, provide, inject } from 'lyt'

const Child = defineComponent({
  setup() {
    const theme = inject('theme')
    return { theme }
  },
  template: `<div :class="theme">子组件</div>`
})

const Parent = defineComponent({
  setup() {
    const theme = ref('dark')

    provide('theme', theme)

    function toggleTheme() {
      theme.value = theme.value === 'dark' ? 'light' : 'dark'
    }

    return { theme, toggleTheme }
  },

  template: `
    <div>
      <button @click="toggleTheme">切换主题</button>
      <Child />
    </div>
  `
})
```

## 内置组件

Lyt.js 提供以下内置组件：

- **`Transition`** - 过渡动画
- **`TransitionGroup`** - 列表过渡动画
- **`KeepAlive`** - 组件缓存
- **`Suspense`** - 异步组件等待
- **`defineAsyncComponent`** - 异步组件定义
