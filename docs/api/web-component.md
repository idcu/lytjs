# Web Component API

Lyt.js v3.1.0 提供了 Web Component 适配器，可以将 Lyt.js 组件注册为标准 Web Components（Custom Elements），实现跨框架复用。

## defineCustomElement()

将 Lyt.js 组件转换为 Custom Element 构造函数。

```ts
import { defineCustomElement } from 'lyt/web-component'

function defineCustomElement(
  component: ComponentOptions,
  options?: CustomElementOptions
): CustomElementConstructor
```

| 参数 | 类型 | 说明 |
|------|------|------|
| component | `ComponentOptions` | Lyt.js 组件定义 |
| options.shadowRoot | `boolean` | 是否使用 Shadow DOM，默认 `true` |
| options.shadowRootMode | `'open' \| 'closed'` | Shadow DOM 模式，默认 `'open'` |
| options.delegatesFocus | `boolean` | 是否委托焦点，默认 `false` |

**返回值：** `CustomElementConstructor` — 标准 Custom Element 构造函数

```ts
import { defineCustomElement } from 'lyt/web-component'

const MyButton = defineCustomElement({
  props: {
    label: { type: String, default: 'Click me' },
    variant: { type: String, default: 'primary' }
  },

  setup(props) {
    const count = ref(0)

    function onClick() {
      count.value++
    }

    return { props, count, onClick }
  },

  template: `
    <button class="btn btn-{{ props.variant }}" @click="onClick">
      {{ props.label }} ({{ count }})
    </button>
  `
})

// 注册到浏览器
customElements.define('my-button', MyButton)
```

在 HTML 中使用：

```html
<my-button label="提交" variant="success"></my-button>
```

---

## CustomElementOptions

```ts
interface CustomElementOptions {
  /** 是否使用 Shadow DOM */
  shadowRoot?: boolean
  /** Shadow DOM 模式 */
  shadowRootMode?: 'open' | 'closed'
  /** 是否委托焦点到内部第一个可聚焦元素 */
  delegatesFocus?: boolean
}
```

---

## registerComponents()

批量注册多个组件为 Custom Elements。

```ts
import { registerComponents } from 'lyt/web-component'

function registerComponents(
  components: Record<string, ComponentOptions>,
  options?: RegisterOptions
): void
```

| 参数 | 类型 | 说明 |
|------|------|------|
| components | `Record<string, ComponentOptions>` | 组件名称到组件定义的映射 |
| options.prefix | `string` | 标签名前缀，默认 `''` |
| options.kebabCase | `boolean` | 是否自动转换为 kebab-case，默认 `true` |

```ts
import { registerComponents } from 'lyt/web-component'

registerComponents({
  'my-counter': CounterComponent,
  'my-card': CardComponent,
  'my-modal': ModalComponent
}, {
  prefix: 'app'
})
// 注册为 app-my-counter、app-my-card、app-my-modal
```

---

## Props 映射

Web Component 的属性（attributes）会自动映射为 Lyt.js 组件的 props。

### 类型推断

| HTML Attribute 类型 | 对应 Prop 类型 |
|---------------------|---------------|
| 无值属性（`disabled`） | `Boolean` |
| 数字（`count="42"`） | `Number` |
| JSON 字符串（`data='{"a":1}'`） | `Object` |
| 其他字符串 | `String` |

### 反射（Reflection）

组件内部 props 变化会自动同步回 HTML attributes：

```html
<my-counter count="0"></my-counter>
<script>
  const el = document.querySelector('my-counter')
  el.count = 5  // 组件内部更新
  // HTML 变为 <my-counter count="5"></my-counter>
</script>
```

---

## 事件系统

Lyt.js 组件的事件通过 Custom Events 向外派发。

### emitToHost()

```ts
import { emitToHost } from 'lyt/web-component'

function emitToHost(
  el: HTMLElement,
  eventName: string,
  detail?: any,
  options?: CustomEventInit
): void
```

```ts
// 组件内部
emitToHost(hostElement, 'change', { value: newValue })
```

```html
<!-- 外部监听 -->
<my-counter @change="handleChange"></my-counter>
```

### 监听 Custom Events

```js
document.querySelector('my-counter').addEventListener('change', (e) => {
  console.log(e.detail)  // { value: newValue }
})
```

---

## Slots 支持

Web Component 适配器支持原生 `<slot>` 插槽。

```ts
const MyCard = defineCustomElement({
  template: `
    <div class="card">
      <header><slot name="header">默认标题</slot></header>
      <main><slot>默认内容</slot></main>
      <footer><slot name="footer"></slot></footer>
    </div>
  `
})
```

```html
<my-card>
  <span slot="header">自定义标题</span>
  <p>自定义内容</p>
  <span slot="footer">页脚信息</span>
</my-card>
```

---

## 生命周期钩子

Web Component 适配器在 Custom Element 生命周期中触发 Lyt.js 组件钩子：

| Custom Element 生命周期 | Lyt.js 钩子 |
|------------------------|-------------|
| `connectedCallback` | `onMounted` |
| `disconnectedCallback` | `onUnmounted` |
| `attributeChangedCallback` | `watch` props |
| `adoptedCallback` | `onActivated` |

---

## 与框架无关使用

注册后的 Custom Element 可以在任何框架中使用：

```jsx
// React
function App() {
  return <my-counter count={0} onChange={(e) => console.log(e.detail)} />
}
```

```html
<!-- Angular -->
<my-counter [count]="count" (change)="handleChange($event)"></my-counter>
```

```html
<!-- Svelte -->
<my-counter count={count} on:change={handleChange} />
```

::: tip 提示
Web Component 适配器是零依赖的，打包后不会增加额外的运行时体积。
:::
