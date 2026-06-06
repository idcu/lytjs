# LytJS 快速参考指南

> 专为 AI 助手和开发者优化的快速参考文档
> 版本: 6.9.6

## 📋 目录
- [项目概览](#项目概览)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [包结构说明](#包结构说明)
- [API 速查](#api-速查)
- [常见示例](#常见示例)
- [最佳实践](#最佳实践)

---

## 项目概览

### LytJS 是什么？
LytJS 是一个现代化的前端框架，具有以下特性：
- ⚡ **双渲染模式** - Vapor (Signal 驱动) + VDOM 模式
- 📦 **零外部依赖** - 运行时无第三方依赖
- 🎯 **TypeScript 优先** - 完整类型支持
- 🏗️ **8层架构** - 模块化设计，按需引入
- 🎨 **官方 UI 库** - 60+ 组件，支持双模式

### 核心架构
```
L7: 工程化工具层 (CLI, DevTools, Test Utils)
L6: 生态系统层 (UI, Router, Store, SSR)
L5: 组件基础层
L4: 插件与适配层
L3: 核心运行时层 (core, core-signal, core-vnode)
L2: 渲染引擎层 (renderer, component)
L1: 核心原语层 (reactivity, vdom, compiler)
L0: 基础工具层 (common-*, shared-types)
```

---

## 快速开始

### 1. 安装
```bash
# 使用 pnpm (推荐)
pnpm add @lytjs/core

# 或使用 npm
npm install @lytjs/core

# 安装常用扩展
pnpm add @lytjs/ui @lytjs/store @lytjs/router
```

### 2. 最简单的应用
```typescript
import { createApp, ref } from '@lytjs/core';

const App = {
  setup() {
    const count = ref(0);
    return { count };
  },
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <button @click="count++">+1</button>
    </div>
  `,
};

createApp(App).mount('#app');
```

---

## 核心概念

### 响应式系统

#### Signal (推荐)
```typescript
import { signal, computed, effect } from '@lytjs/reactivity';

// 创建信号
const count = signal(0);

// 计算属性
const double = computed(() => count.value * 2);

// 副作用
effect(() => {
  console.log('Count changed:', count.value);
});

// 更新值
count.value++;
```

#### Ref & Reactive
```typescript
import { ref, reactive, computed } from '@lytjs/reactivity';

const count = ref(0);
const state = reactive({ name: 'LytJS' });

const double = computed(() => count.value * 2);
```

### 组件定义

#### 选项式 API
```typescript
import { defineComponent } from '@lytjs/core';

const MyComponent = defineComponent({
  name: 'MyComponent',
  props: {
    title: String,
  },
  setup(props) {
    const count = ref(0);
    return { count };
  },
  template: `
    <div>
      <h1>{{ title }}</h1>
      <p>{{ count }}</p>
    </div>
  `,
});
```

#### 渲染函数
```typescript
import { h, ref } from '@lytjs/core';

function MyComponent() {
  const count = ref(0);
  
  return () => 
    h('div', [
      h('p', `Count: ${count.value}`),
      h('button', { onClick: () => count.value++ }, '+1'),
    ]);
}
```

---

## 包结构说明

### 核心包
| 包名 | 说明 | 使用场景 |
|------|------|----------|
| `@lytjs/core` | 完整核心包（推荐） | 新项目，支持双模式 |
| `@lytjs/core-signal` | 仅 Vapor 模式 | 追求极致性能 |
| `@lytjs/core-vnode` | 仅 VDOM 模式 | 兼容性优先 |
| `@lytjs/reactivity` | 响应式系统 | 只需要响应式能力 |
| `@lytjs/vdom` | 虚拟 DOM | 只需要 VDOM 能力 |
| `@lytjs/renderer` | 渲染引擎 | 自定义渲染 |
| `@lytjs/component` | 组件系统 | 组件开发 |

### 生态包
| 包名 | 说明 |
|------|------|
| `@lytjs/ui` | 官方 UI 组件库 (60+ 组件) |
| `@lytjs/store` | 状态管理 (Pinia 风格) |
| `@lytjs/router` | 路由系统 |
| `@lytjs/ssr` | 服务端渲染 |
| `@lytjs/plugin-*` | 各种官方插件 |

### 工具包 (common-*)
| 包名 | 说明 |
|------|------|
| `@lytjs/common-is` | 类型判断工具 |
| `@lytjs/common-object` | 对象操作 |
| `@lytjs/common-dom` | DOM 操作 |
| `@lytjs/common-events` | 事件处理 |
| `@lytjs/common-cache` | 缓存工具 |
| `@lytjs/common-http` | HTTP 请求 |
| ... | 更多 30+ 工具包 |

---

## API 速查

### createApp
```typescript
import { createApp } from '@lytjs/core';

const app = createApp(App);

// 注册插件
app.use(plugin);

// 注册组件
app.component('MyComponent', MyComponent);

// 挂载
app.mount('#app');
```

### 响应式 API
```typescript
// 基础
signal(value)          // 创建信号
ref(value)             // 创建 ref
reactive(object)       // 创建响应式对象
computed(fn)           // 计算属性
effect(fn)             // 副作用

// 监听
watch(source, callback)
watchEffect(fn)

// 工具
toRef(obj, key)
toRefs(obj)
isRef(value)
isReactive(value)
isSignal(value)
```

### UI 组件快速参考
```typescript
import { Button, Input, Table, Modal } from '@lytjs/ui';
import '@lytjs/ui/index.css'; // 引入样式

// 使用组件
<Button type="primary">提交</Button>
<Input v-model="text" placeholder="请输入" />
```

### Store 使用
```typescript
import { defineStore, createPinia } from '@lytjs/store';

// 定义 Store
const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  getters: {
    double: (state) => state.count * 2,
  },
  actions: {
    increment() {
      this.count++;
    },
  },
});

// 使用
const pinia = createPinia();
const store = useCounterStore(pinia);
store.increment();
```

---

## 常见示例

### 1. Counter 计数器
```typescript
import { createApp, ref, computed } from '@lytjs/core';

const App = {
  setup() {
    const count = ref(0);
    const double = computed(() => count.value * 2);
    
    const increment = () => count.value++;
    const decrement = () => count.value--;
    
    return { count, double, increment, decrement };
  },
  template: `
    <div>
      <p>Count: {{ count }}</p>
      <p>Double: {{ double }}</p>
      <button @click="increment">+</button>
      <button @click="decrement">-</button>
    </div>
  `,
};

createApp(App).mount('#app');
```

### 2. Todo 列表
```typescript
import { createApp, ref, computed } from '@lytjs/core';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const App = {
  setup() {
    const input = ref('');
    const todos = ref<Todo[]>([]);
    
    const addTodo = () => {
      if (input.value.trim()) {
        todos.value.push({
          id: Date.now(),
          text: input.value,
          completed: false,
        });
        input.value = '';
      }
    };
    
    const toggleTodo = (id: number) => {
      const todo = todos.value.find(t => t.id === id);
      if (todo) todo.completed = !todo.completed;
    };
    
    const remaining = computed(() => 
      todos.value.filter(t => !t.completed).length
    );
    
    return { input, todos, addTodo, toggleTodo, remaining };
  },
  template: `
    <div>
      <input v-model="input" @keyup.enter="addTodo" />
      <button @click="addTodo">Add</button>
      <ul>
        <li v-for="todo in todos" :key="todo.id"
            :style="{ textDecoration: todo.completed ? 'line-through' : 'none' }"
            @click="toggleTodo(todo.id)">
          {{ todo.text }}
        </li>
      </ul>
      <p>{{ remaining }} remaining</p>
    </div>
  `,
};

createApp(App).mount('#app');
```

### 3. 使用 UI 组件
```typescript
import { createApp } from '@lytjs/core';
import { Button, Input, Table, Modal } from '@lytjs/ui';
import '@lytjs/ui/index.css';

const App = {
  components: { Button, Input, Table, Modal },
  setup() {
    const visible = ref(false);
    const data = ref([
      { id: 1, name: '张三', age: 25 },
      { id: 2, name: '李四', age: 30 },
    ]);
    
    return { visible, data };
  },
  template: `
    <div>
      <Button type="primary" @click="visible = true">打开弹窗</Button>
      <Modal v-model="visible" title="用户列表">
        <Table :data="data" :columns="[{prop:'name',label:'姓名'},{prop:'age',label:'年龄'}]" />
      </Modal>
    </div>
  `,
};

createApp(App).mount('#app');
```

### 4. 使用 Router
```typescript
import { createApp } from '@lytjs/core';
import { createRouter, RouterLink, RouterView } from '@lytjs/router';

const Home = { template: '<h1>Home</h1>' };
const About = { template: '<h1>About</h1>' };

const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About },
  ],
});

const App = {
  components: { RouterLink, RouterView },
  template: `
    <div>
      <RouterLink to="/">Home</RouterLink> |
      <RouterLink to="/about">About</RouterLink>
      <RouterView />
    </div>
  `,
};

const app = createApp(App);
app.use(router);
app.mount('#app');
```

---

## 最佳实践

### 1. 项目结构
```
src/
├── components/       # 组件
├── stores/          # 状态管理
├── views/           # 页面
├── utils/           # 工具函数
├── App.ts           # 根组件
└── main.ts          # 入口文件
```

### 2. 渲染模式选择
- **Vapor 模式** (`@lytjs/core-signal`): 
  - 性能更优
  - 适合高频更新场景
  - 细粒度响应式
  
- **VDOM 模式** (`@lytjs/core-vnode`):
  - 更好的兼容性
  - 适合复杂组件
  - 传统模板体验

### 3. 性能优化
- 优先使用 Signal 而非 Ref
- 使用 `computed` 缓存计算结果
- 合理使用 `effect` 和 `watch`
- 组件按需引入

### 4. TypeScript 支持
```typescript
// 推荐类型标注
interface User {
  id: number;
  name: string;
}

const user = signal<User | null>(null);
```

---

## 快速命令参考

```bash
# 安装依赖
pnpm install

# 类型检查
pnpm type-check

# 运行测试
pnpm test

# 代码检查
pnpm lint:check

# 自动修复
pnpm lint

# 构建
pnpm build

# 基准测试
pnpm bench
```

---

## 常见问题

### Q: Vapor 模式和 VDOM 模式有什么区别？
A: Vapor 模式基于 Signal 进行细粒度更新，性能更好；VDOM 模式使用虚拟 DOM diff，兼容性更好。

### Q: 如何选择要安装的包？
A: 新手推荐直接使用 `@lytjs/core`，体验完整功能；需要极致性能用 `@lytjs/core-signal`；需要兼容性用 `@lytjs/core-vnode`。

### Q: UI 组件支持 Vapor 模式吗？
A: 是的！所有 `@lytjs/ui` 组件都同时支持两种渲染模式。

### Q: 如何获得帮助？
- 查看完整文档: `docs/` 目录
- 查看示例: `examples/` 目录
- 提交 Issue: Gitee 仓库

---

## 相关资源

- [主 README](../README.md) - 项目总览
- [开发指南](../guide/) - 详细文档
- [API 文档](../api/) - API 参考
- [示例项目](../examples/) - 更多示例
- [架构文档](../contribute/architecture/) - 架构说明
