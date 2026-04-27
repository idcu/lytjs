# @lytjs/core

Lyt.js 核心入口 - 整合响应式、编译器、虚拟 DOM、渲染器和组件系统，提供完整的应用开发能力。

## 安装

```bash
npm install @lytjs/core

# 或使用 pnpm
pnpm add @lytjs/core
```

## 特性

- 🚀 零运行时依赖，极致轻量
- 🎨 所见即代码，无 `v-` 前缀的模板语法
- 🔄 完整的 Composition API
- 📦 内置组件系统、插槽、KeepAlive、Suspense
- 🌐 Web Component 支持
- 🔌 插件系统

## 快速开始

### 创建应用

```javascript
import { createApp, defineComponent, h } from '@lytjs/core';

const App = defineComponent({
  setup() {
    return { count: 0 };
  },
  render() {
    return h('div', [
      h('h1', `Count: ${this.count}`),
      h('button', {
        onClick: () => this.count++
      }, 'Increment')
    ]);
  }
});

const app = createApp(App);
app.mount('#app');
```

### 使用模板

```javascript
import { createApp, defineComponent } from '@lytjs/core';

const App = defineComponent({
  setup() {
    return { count: 0 };
  },
  template: `
    <div>
      <h1>Count: {{ count }}</h1>
      <button @click="count++">Increment</button>
    </div>
  `
});

const app = createApp(App);
app.mount('#app');
```

### 使用插件

```javascript
import { createApp, defineComponent } from '@lytjs/core';

const myPlugin = {
  install(app, options) {
    app.config.globalProperties.$hello = 'Hello from plugin!';
  }
};

const app = createApp(App);
app.use(myPlugin, { someOption: true });
app.mount('#app');
```

### Web Component

```javascript
import { defineCustomElement, defineComponent } from '@lytjs/core';

const MyComponent = defineComponent({
  props: ['name'],
  template: `<div>Hello, {{ name }}!</div>`
});

customElements.define('my-component', defineCustomElement(MyComponent));
```

## API 参考

### 应用 API

| API | 说明 |
|------|------|
| `createApp(rootComponent, rootProps)` | 创建应用实例 |
| `createSSRApp(rootComponent, rootProps)` | 创建 SSR 应用实例 |

### 应用实例

| API | 说明 |
|------|------|
| `app.mount(container)` | 挂载应用到 DOM 容器 |
| `app.unmount()` | 卸载应用 |
| `app.use(plugin, options)` | 安装插件 |
| `app.component(name, component)` | 注册全局组件 |
| `app.directive(name, directive)` | 注册全局指令 |
| `app.provide(key, value)` | 全局提供值 |
| `app.config` | 应用配置对象 |

### 组件定义

| API | 说明 |
|------|------|
| `defineComponent(options)` | 定义组件 |
| `defineAsyncComponent(loader)` | 定义异步组件 |
| `resolveComponent(name)` | 解析组件 |

### 渲染 API

| API | 说明 |
|------|------|
| `h(type, props, children)` | 创建虚拟节点 |
| `render(vnode, container)` | 渲染虚拟节点 |

### 依赖注入

| API | 说明 |
|------|------|
| `provide(key, value)` | 提供值给后代组件 |
| `inject(key, defaultValue)` | 注入祖先组件提供的值 |

### 内置组件

| 组件 | 说明 |
|------|------|
| `KeepAlive` | 缓存失活组件实例 |
| `Teleport` | 将内容渲染到指定 DOM 位置 |
| `Transition` | 单个元素/组件的过渡动画 |
| `TransitionGroup` | 列表的过渡动画 |
| `Suspense` | 等待异步依赖 |

## 模板语法

Lyt.js 的模板语法与原生 HTML 更接近，去掉了 `v-` 前缀：

### 插值

```html
<span>Text: {{ message }}</span>
```

### 指令

```html
<!-- 条件渲染 -->
<div if="visible">显示</div>
<div else-if="pending">加载中...</div>
<div else>隐藏</div>

<!-- 列表渲染 -->
<ul>
  <li each="(item, index) in items" :key="item.id">
    {{ index }}: {{ item.text }}
  </li>
</ul>

<!-- 事件绑定 -->
<button @click="handleClick">点击</button>
<input @input="handleInput" />

<!-- 属性绑定 -->
<img :src="imageUrl" :alt="altText" />
<div :class="{ active: isActive }"></div>
```

## 组件生命周期

```javascript
import { defineComponent, onMounted, onUpdated, onUnmounted } from '@lytjs/core';

const MyComponent = defineComponent({
  setup() {
    onMounted(() => {
      console.log('组件已挂载');
    });

    onUpdated(() => {
      console.log('组件已更新');
    });

    onUnmounted(() => {
      console.log('组件已卸载');
    });

    return {};
  }
});
```

| 生命周期 | 说明 |
|----------|------|
| `onBeforeMount` | 组件挂载前 |
| `onMounted` | 组件挂载后 |
| `onBeforeUpdate` | 组件更新前 |
| `onUpdated` | 组件更新后 |
| `onBeforeUnmount` | 组件卸载前 |
| `onUnmounted` | 组件卸载后 |

## 示例

### Todo List

```javascript
import { createApp, defineComponent, ref } from '@lytjs/core';

const App = defineComponent({
  setup() {
    const todos = ref([{ id: 1, text: 'Learn Lyt.js', done: false }]);
    const newTodo = ref('');

    function addTodo() {
      if (newTodo.value.trim()) {
        todos.value.push({
          id: Date.now(),
          text: newTodo.value,
          done: false
        });
        newTodo.value = '';
      }
    }

    function toggleTodo(todo) {
      todo.done = !todo.done;
    }

    return { todos, newTodo, addTodo, toggleTodo };
  },
  template: `
    <div>
      <h1>Todo List</h1>
      <div>
        <input v-model="newTodo" @keyup.enter="addTodo" />
        <button @click="addTodo">Add</button>
      </div>
      <ul>
        <li 
          each="todo in todos" 
          :key="todo.id"
          :class="{ done: todo.done }"
          @click="toggleTodo(todo)"
        >
          {{ todo.text }}
        </li>
      </ul>
    </div>
  `
});

createApp(App).mount('#app');
```

## 性能

- 核心体积：2.13 KB (ESM gzip)
- 零运行时依赖
- Block Tree 虚拟 DOM 优化
- Patch Flag 差异化更新

## 兼容性

- Node.js >= 18.0.0
- Chrome 64+
- Firefox 63+
- Safari 12+
- Edge 79+

## License

MIT
